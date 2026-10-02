-- ═══════════════════════════════════════════════════════════════════════════
--  OMI CHAT — initial schema
--  Run this once in:  supabase.com/dashboard → your project → SQL Editor → New
--
--  Replaces the Firebase Realtime Database tree. The main structural win is
--  that the three client-written fan-out mirrors (userChats, userCalls,
--  callLogs) are gone — they existed only because RTDB has no joins.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ===========================================================================
--  reset
--
--  Drops anything a previous attempt left behind, then rebuilds from scratch.
--
--  `create table if not exists` skips a table that already exists EVEN IF ITS
--  SHAPE IS WRONG. A half-applied run therefore leaves a stale table behind,
--  the next run silently skips it, and the failure surfaces somewhere
--  unrelated - most confusingly as a foreign key type mismatch, because the
--  stale id column has a different type than the columns being built around
--  it. That is exactly how the first run of this file failed.
--
--  Safe to run repeatedly, and safe to run right now: nothing below can hold
--  user data, because the app cannot write a single row until this migration
--  has completed successfully at least once.
-- ===========================================================================

-- Storage policies first. They call public.is_chat_member(), and dropping that
-- function while a policy still depends on it would fail.
drop policy if exists "attachments are readable by chat members" on storage.objects;
drop policy if exists "attachments upload to own folder"        on storage.objects;
drop policy if exists "attachments owner may modify"            on storage.objects;
drop policy if exists "attachments owner may delete"             on storage.objects;

-- Functions next, while the tables are still around, so their drop is not
-- what has to cascade. The trigger on auth.users goes with handle_new_user.
drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user()        cascade;
drop function if exists public.touch_chat()             cascade;
drop function if exists public.is_chat_member(text)     cascade;
drop function if exists public.is_call_member(text)     cascade;
drop function if exists public.search_messages(text, int) cascade;
drop function if exists public.get_profiles(uuid[])    cascade;
drop function if exists public.get_inbox()              cascade;
drop function if exists public.get_chat(text)           cascade;

-- Children before parents. cascade clears the policies, indexes and triggers
-- that depend on each table, so the RLS section below rebuilds them all.
drop table if exists public.messages     cascade;
drop table if exists public.chat_members cascade;
drop table if exists public.calls        cascade;
drop table if exists public.call_members cascade;
drop table if exists public.call_ring    cascade;
drop table if exists public.call_logs    cascade;
drop table if exists public.chats        cascade;
drop table if exists public.blocked      cascade;
drop table if exists public.profiles     cascade;


-- ───────────────────────────────────────────────────────────────────────────
--  profiles
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text        not null unique
                 check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text        not null default '',
  avatar_url   text,
  bio          text        not null default '',
  status_text  text        not null default '',
  presence     text        not null default 'offline'
                 check (presence in ('online', 'away', 'busy', 'offline')),
  last_seen    timestamptz not null default now(),
  settings     jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile per user. Readable by any signed-in user so search works.';

-- Username lookups are hot (every @handle render, every search).
create index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));
create index if not exists profiles_display_name_idx
  on public.profiles (lower(display_name));

-- ───────────────────────────────────────────────────────────────────────────
--  blocked  (was the users/{uid}/blocked map)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.blocked (
  user_id    uuid references public.profiles (id) on delete cascade,
  blocked_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);

-- ───────────────────────────────────────────────────────────────────────────
--  chats + chat_members
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.chats (
  id            text primary key,
  kind          text        not null default 'direct'
                  check (kind in ('direct', 'group')),
  title         text        not null default '',
  avatar_url    text,
  created_by    uuid        references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  last_activity timestamptz not null default now(),
  -- Denormalised preview. Kept fresh by the touch_chat() trigger so the inbox
  -- is a single indexed read instead of a per-chat subquery.
  last_message  jsonb
);

create table if not exists public.chat_members (
  chat_id      text        references public.chats (id) on delete cascade,
  user_id      uuid        references public.profiles (id) on delete cascade,
  is_admin     boolean     not null default false,
  pinned       boolean     not null default false,
  muted        boolean     not null default false,
  last_read_at timestamptz not null default '1970-01-01 00:00:00+00'::timestamptz,
  joined_at    timestamptz not null default now(),
  primary key (chat_id, user_id)
);

-- The inbox query: my chats, newest activity first.
create index if not exists chat_members_user_idx
  on public.chat_members (user_id);

-- ───────────────────────────────────────────────────────────────────────────
--  messages
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  chat_id         text        not null references public.chats (id) on delete cascade,
  sender_id       uuid        not null references public.profiles (id) on delete cascade,
  text            text        not null default '',
  kind            text        not null default 'text'
                    check (kind in ('text', 'image', 'file', 'system', 'call')),
  attachment_url  text,
  attachment_name text,
  attachment_size bigint,
  -- Snapshot of the replied-to message, so the preview survives deletion.
  reply_to        jsonb,
  edited_at       timestamptz,
  deleted         boolean     not null default false,
  created_at      timestamptz not null default now()
);

-- Replaces the RTDB orderByChild('createdAt') index.
create index if not exists messages_chat_created_idx
  on public.messages (chat_id, created_at desc);

-- Full-text search over message bodies.
--
-- to_tsvector(regconfig, text) is IMMUTABLE, which is the only reason this is
-- indexable at all - the one-argument to_tsvector(text) is only STABLE and
-- cannot appear in an index expression.
--
-- search_messages() must query with this exact expression or Postgres will
-- ignore the index and fall back to a sequential scan.
create index if not exists messages_body_fts_idx
  on public.messages
  using gin (to_tsvector('simple', text));

-- ───────────────────────────────────────────────────────────────────────────
--  calls / call_ring / call_logs
--
--  SDP offers and ICE candidates are NOT stored. They ride on Supabase
--  Realtime Broadcast channels, which is a direct pub/sub hop instead of a
--  database round trip per candidate.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.calls (
  id           text primary key,
  chat_id      text        references public.chats (id) on delete set null,
  kind         text        not null default 'audio' check (kind in ('audio', 'video')),
  state        text        not null default 'ringing'
                 check (state in ('ringing', 'active', 'ended')),
  initiated_by uuid        not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  answered_at  timestamptz,
  ended_at     timestamptz,
  end_reason   text
);

create table if not exists public.call_members (
  call_id  text references public.calls (id) on delete cascade,
  user_id  uuid references public.profiles (id) on delete cascade,
  peer_id  uuid references public.profiles (id) on delete set null,
  peer_name text        not null default '',
  direction text        not null check (direction in ('incoming', 'outgoing')),
  status   text        not null default 'ringing'
             check (status in ('ringing', 'active')),
  answered_at timestamptz,
  primary key (call_id, user_id)
);

-- Ringing calls only. Rows are deleted the moment a call is answered or ends.
create table if not exists public.call_ring (
  call_id  text not null references public.calls (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  primary key (call_id, user_id)
);

create index if not exists call_ring_user_idx on public.call_ring (user_id);

create table if not exists public.call_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  call_id      text        not null,
  peer_id      uuid,
  peer_name    text        not null default '',
  kind         text        not null default 'audio' check (kind in ('audio', 'video')),
  direction    text        not null check (direction in ('incoming', 'outgoing')),
  status       text        not null,
  started_at   timestamptz not null default now(),
  duration_sec integer     not null default 0
);

create index if not exists call_logs_user_started_idx
  on public.call_logs (user_id, started_at desc);


-- ═══════════════════════════════════════════════════════════════════════════
--  triggers
-- ═══════════════════════════════════════════════════════════════════════════

-- ── seed a profile the moment a user is created ─────────────────────────────
-- Runs for email/password AND Google signups, so no client path can end up
-- authenticated without a profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted text;
  taken  text;
begin
  wanted := lower(
    coalesce(
      new.raw_user_meta_data ->> 'username',
      split_part(coalesce(new.email, 'user'), '@', 1),
      'user'
    )
  );

  -- Strip anything the CHECK constraint would reject, then clamp to 20 chars.
  wanted := regexp_replace(wanted, '[^a-z0-9_]', '', 'g');
  if length(wanted) < 3 then
    wanted := 'user';
  end if;
  wanted := left(wanted, 20);

  -- Never hard-fail signup on a collision: fall back to a unique handle and
  -- let the client notice the substitution and tell the user.
  if exists (select 1 from public.profiles where username = wanted) then
    taken := left(wanted, 12) || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  else
    taken := wanted;
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    taken,
    coalesce(new.raw_user_meta_data ->> 'display_name', taken),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── keep the inbox preview fresh ────────────────────────────────────────────
-- This is the fan-out that Firebase could not do server-side. One trigger
-- replaces the three coordinated client writes per message.
create or replace function public.touch_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender text;
begin
  select coalesce(display_name, username) into sender
  from public.profiles where id = new.sender_id;

  update public.chats
     set last_activity = new.created_at,
         last_message = jsonb_build_object(
           'id',         new.id,
           'text',       case when new.deleted then '' else new.text end,
           'senderId',   new.sender_id,
           'senderName', coalesce(sender, 'Unknown'),
           'kind',       new.kind,
           -- Epoch milliseconds, not a timestamptz. jsonb would otherwise
           -- serialise this as an ISO string, and OmiChat.lastMessage.createdAt
           -- is typed as a number, so every inbox timestamp would render as
           -- NaN.
           'createdAt',  extract(epoch from new.created_at) * 1000
         )
   where id = new.chat_id;

  -- The sender has by definition read their own message.
  update public.chat_members
     set last_read_at = greatest(last_read_at, new.created_at)
   where chat_id = new.chat_id and user_id = new.sender_id;

  return new;
end;
$$;

drop trigger if exists on_message_touch_chat on public.messages;
create trigger on_message_touch_chat
  after insert on public.messages
  for each row execute function public.touch_chat();

-- ── reopen the preview when a message is edited or deleted ─────────────────
-- Same function as above: NEW.created_at is still the original timestamp on an
-- UPDATE, so rebuilding the preview from NEW is correct.
drop trigger if exists on_message_retouch_chat on public.messages;
create trigger on_message_retouch_chat
  after update of text, deleted, attachment_url, attachment_name, kind
  on public.messages
  for each row execute function public.touch_chat();

-- ═══════════════════════════════════════════════════════════════════════════
--  row level security
--
--  auth.uid() is the ONLY source of identity. A signed-in user can read
--  profiles (search needs it) but touch only their own.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles     enable row level security;
alter table public.blocked      enable row level security;
alter table public.chats        enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages     enable row level security;
alter table public.calls        enable row level security;
alter table public.call_members enable row level security;
alter table public.call_ring    enable row level security;
alter table public.call_logs    enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
drop policy if exists "profiles are public to signed-in users" on public.profiles;
create policy "profiles are public to signed-in users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ── blocked ────────────────────────────────────────────────────────────────
drop policy if exists "own blocklist" on public.blocked;
create policy "own blocklist"
  on public.blocked for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── chats ──────────────────────────────────────────────────────────────────
-- Shared helper: is the signed-in user a member of this chat?
create or replace function public.is_chat_member(target_chat text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_members
    where chat_id = target_chat and user_id = auth.uid()
  );
$$;

drop policy if exists "members read chat" on public.chats;
create policy "members read chat"
  on public.chats for select to authenticated
  using (public.is_chat_member(id));

drop policy if exists "members update chat" on public.chats;
create policy "members update chat"
  on public.chats for update to authenticated
  using (public.is_chat_member(id));

drop policy if exists "users create chat" on public.chats;
create policy "users create chat"
  on public.chats for insert to authenticated
  with check (created_by = auth.uid());

-- ── chat_members ────────────────────────────────────────────────────────────
-- Visible to anyone in the chat, because the members list is needed to render
-- group chats and the inbox.
drop policy if exists "members read membership" on public.chat_members;
create policy "members read membership"
  on public.chat_members for select to authenticated
  using (public.is_chat_member(chat_id));

drop policy if exists "members self-join on create" on public.chat_members;
create policy "members self-join on create"
  on public.chat_members for insert to authenticated
  with check (user_id = auth.uid() or public.is_chat_member(chat_id));

-- Only your own row holds your read cursor / pin / mute.
drop policy if exists "members update own row" on public.chat_members;
create policy "members update own row"
  on public.chat_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "members leave" on public.chat_members;
create policy "members leave"
  on public.chat_members for delete to authenticated
  using (user_id = auth.uid() or public.is_chat_member(chat_id));

-- ── messages ───────────────────────────────────────────────────────────────
drop policy if exists "members read messages" on public.messages;
create policy "members read messages"
  on public.messages for select to authenticated
  using (public.is_chat_member(chat_id));

-- The only write the sender may perform is claiming their own sender_id.
drop policy if exists "send own message" on public.messages;
create policy "send own message"
  on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_chat_member(chat_id));

drop policy if exists "author edits or deletes own message" on public.messages;
create policy "author edits or deletes own message"
  on public.messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

-- ── calls ──────────────────────────────────────────────────────────────────
create or replace function public.is_call_member(target_call text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.call_members
    where call_id = target_call and user_id = auth.uid()
  );
$$;

drop policy if exists "participants read call" on public.calls;
create policy "participants read call"
  on public.calls for select to authenticated
  using (public.is_call_member(id));

drop policy if exists "participants update call" on public.calls;
create policy "participants update call"
  on public.calls for update to authenticated
  using (public.is_call_member(id));

drop policy if exists "caller creates call" on public.calls;
create policy "caller creates call"
  on public.calls for insert to authenticated
  with check (initiated_by = auth.uid());

drop policy if exists "participants read membership" on public.call_members;
create policy "participants read membership"
  on public.call_members for select to authenticated
  using (public.is_call_member(call_id));

drop policy if exists "participants add membership" on public.call_members;
create policy "participants add membership"
  on public.call_members for insert to authenticated
  with check (user_id = auth.uid() or exists (
    select 1 from public.calls c
    where c.id = call_id and c.initiated_by = auth.uid()
  ));

-- ── call_ring ──────────────────────────────────────────────────────────────
-- Your own ring rows only. Nobody else can ring you.
drop policy if exists "own ring" on public.call_ring;
create policy "own ring"
  on public.call_ring for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── call_logs ──────────────────────────────────────────────────────────────
drop policy if exists "own call log" on public.call_logs;
create policy "own call log"
  on public.call_logs for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "write own call log" on public.call_logs;
create policy "write own call log"
  on public.call_logs for insert to authenticated
  with check (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
--  realtime
--
--  The client subscribes to these tables for live chat, presence and ringing.
--  SDP/ICE does NOT go through here — it uses Broadcast channels.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table
      public.messages,
      public.chats,
      public.chat_members,
      public.profiles,
      public.calls,
      public.call_ring,
      public.call_logs;
  end if;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  message search  (a genuine free-tier win: impossible in RTDB)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.search_messages(search_term text, result_limit int default 50)
returns table (
  id          uuid,
  chat_id     text,
  sender_id   uuid,
  text        text,
  kind        text,
  created_at  timestamptz
)
language sql
stable
set search_path = public
as $$
  select m.id, m.chat_id, m.sender_id, m.text, m.kind, m.created_at
  from public.messages m
  where m.deleted = false
    and public.is_chat_member(m.chat_id)
    -- Left side matches messages_body_fts_idx exactly, so the GIN index is used.
    -- A bare ilike would be simpler but would silently ignore it and scan
    -- every message in the database.
    --
    -- The ':*' suffix makes it a prefix search, so typing "dep" finds
    -- "departed" the way a chat search box is expected to behave. It goes on
    -- the end of the whole sanitised term, so "hello dep" still parses as
    -- AND and only the final word is treated as a prefix.
    --
    -- to_tsquery() rather than websearch_to_tsquery() because the input is
    -- fully controlled at this point: reduced to letters, digits and single
    -- spaces, it can only ever be valid tsquery syntax. Anything still gets
    -- through is a NUMBER token, which to_tsquery handles.
    --
    -- btrim() catches the case where the term was entirely punctuation;
    -- nullif() then turns that into NULL, and `tsvector @@ NULL` is NULL,
    -- meaning no rows, rather than raising an error on a bad query.
    and to_tsvector('simple', m.text)
        @@ to_tsquery(
             'simple',
             nullif(
               btrim(regexp_replace(coalesce(search_term, ''), '[^[:alnum:]]+', ' ', 'g')),
               ''
             ) || ':*'
           )
  order by m.created_at desc
  limit greatest(1, least(result_limit, 200));
$$;

grant execute on function public.search_messages(text, int) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
--  view functions
--
--  PostgREST cannot express the lateral aggregates these need, and doing three
--  round trips per profile load is worse. All of them are SECURITY INVOKER, so
--  the policies above still filter every row they return.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── profiles, with blocklist and pin/mute maps ──────────────────────────────
create or replace function public.get_profiles(ids uuid[])
returns table (
  id           uuid,
  username     text,
  display_name text,
  avatar_url   text,
  bio          text,
  status_text  text,
  presence     text,
  last_seen    timestamptz,
  settings     jsonb,
  created_at   timestamptz,
  blocked      jsonb,
  pinned_chats jsonb,
  muted_chats  jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id, p.username, p.display_name, p.avatar_url, p.bio,
    p.status_text, p.presence, p.last_seen, p.settings, p.created_at,
    coalesce(
      (select jsonb_object_agg(b.blocked_id::text, true)
       from public.blocked b where b.user_id = p.id), '{}'::jsonb),
    coalesce(
      (select jsonb_object_agg(cm.chat_id, true) filter (where cm.pinned)
       from public.chat_members cm where cm.user_id = p.id), '{}'::jsonb),
    coalesce(
      (select jsonb_object_agg(cm.chat_id, true) filter (where cm.muted)
       from public.chat_members cm where cm.user_id = p.id), '{}'::jsonb)
  from public.profiles p
  where p.id = any (ids);
$$;

-- ── the signed-in user's inbox, newest activity first ───────────────────────
create or replace function public.get_inbox()
returns table (
  id            text,
  kind          text,
  title         text,
  avatar_url    text,
  created_by    uuid,
  created_at    timestamptz,
  last_activity timestamptz,
  last_message  jsonb,
  members       jsonb,
  unread        bigint,
  pinned        boolean,
  muted         boolean,
  last_read_at  timestamptz,
  read_cursors  jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id, c.kind, c.title, c.avatar_url, c.created_by, c.created_at,
    c.last_activity, c.last_message,
    coalesce(
      (select jsonb_object_agg(cm2.user_id::text, true)
       from public.chat_members cm2 where cm2.chat_id = c.id), '{}'::jsonb),
    (select count(*)
     from public.messages m
     where m.chat_id = c.id
       and m.deleted = false
       and m.sender_id <> auth.uid()
       and m.created_at > mine.last_read_at),
    mine.pinned, mine.muted, mine.last_read_at,
    -- Every member's read cursor. Replaces the per-message readBy map: a
    -- message counts as read when a peer's cursor is at or past its timestamp.
    coalesce(
      (select jsonb_object_agg(cm3.user_id::text, extract(epoch from cm3.last_read_at) * 1000)
       from public.chat_members cm3 where cm3.chat_id = c.id), '{}'::jsonb)
  from public.chats c
  join public.chat_members mine
    on mine.chat_id = c.id and mine.user_id = auth.uid()
  order by c.last_activity desc;
$$;

-- ── a single chat, same shape as an inbox row ──────────────────────────────
create or replace function public.get_chat(target_chat text)
returns table (
  id            text,
  kind          text,
  title         text,
  avatar_url    text,
  created_by    uuid,
  created_at    timestamptz,
  last_activity timestamptz,
  last_message  jsonb,
  members       jsonb,
  unread        bigint,
  pinned        boolean,
  muted         boolean,
  last_read_at  timestamptz,
  read_cursors  jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.get_inbox() where id = target_chat;
$$;

grant execute on function public.get_profiles(uuid[]) to authenticated;
grant execute on function public.get_inbox() to authenticated;
grant execute on function public.get_chat(text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
--  storage: the attachments bucket
--
--  Private, not public. uploadAttachment() in src/lib/supabase/chats.ts hands
--  out signed read URLs instead of storing a bare path.
--
--  Object keys are {uploaderUid}/{chatId}/{timestamp}_{filename}, which is what
--  makes these policies expressible in two comparisons.
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 52428800, null)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Read your own uploads, or anything in a chat you belong to (so a peer's image
-- is visible in the conversation you share with them).
drop policy if exists "attachments are readable by chat members" on storage.objects;
create policy "attachments are readable by chat members"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_chat_member((storage.foldername(name))[2])
    )
  );

-- Upload only into your own folder, and only into a chat you are in. Without
-- the second check you could write into a stranger's chat folder and they would
-- be able to read it back.
drop policy if exists "attachments upload to own folder" on storage.objects;
create policy "attachments upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_chat_member((storage.foldername(name))[2])
  );

-- Only the person who uploaded a file may replace or delete it.
drop policy if exists "attachments owner may modify" on storage.objects;
create policy "attachments owner may modify"
  on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments owner may delete" on storage.objects;
create policy "attachments owner may delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────────────────────────────────────────────────────────────────────
--  housekeeping: the free tier pauses after 7 idle days
--
--  "Idle" is measured from real traffic to the project — Postgres queries,
--  Realtime connections, Auth calls, Storage calls. A pg_cron job does NOT
--  reset the clock, because cron runs inside the database rather than through
--  the API, so a scheduled `select 1` will not keep the project alive.
--
--  Two things that do work:
--    1. A real deployment that receives traffic (Vercel cron hitting a route
--       that calls a Postgres RPC, or any genuine user activity).
--    2. GitHub Actions, cron-job.org, or any external scheduler firing a
--       cheap authenticated request at a public endpoint on your app that
--       touches the database.
--
--  Do NOT enable the Management API "pause" endpoint as a keepalive. It does
--  the opposite of what you want.
-- ───────────────────────────────────────────────────────────────────────────

commit;
