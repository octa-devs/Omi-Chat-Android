-- Migration: Comprehensive Call RLS and Atomic Call Creation Function
-- Run this in your Supabase SQL editor to allow seamless calling between users.

-- 1. calls table: allow initiator to select and update the call they created
drop policy if exists "participants read call" on public.calls;
create policy "participants read call"
  on public.calls for select to authenticated
  using (initiated_by = auth.uid() or public.is_call_member(id));

drop policy if exists "participants update call" on public.calls;
create policy "participants update call"
  on public.calls for update to authenticated
  using (initiated_by = auth.uid() or public.is_call_member(id));

drop policy if exists "caller creates call" on public.calls;
create policy "caller creates call"
  on public.calls for insert to authenticated
  with check (initiated_by = auth.uid());

-- 2. call_members table: allow caller to add peer's membership
drop policy if exists "participants add membership" on public.call_members;
create policy "participants add membership"
  on public.call_members for insert to authenticated
  with check (
    user_id = auth.uid() or exists (
      select 1 from public.calls c
      where c.id = call_id and c.initiated_by = auth.uid()
    )
  );

drop policy if exists "participants read membership" on public.call_members;
create policy "participants read membership"
  on public.call_members for select to authenticated
  using (
    user_id = auth.uid() or exists (
      select 1 from public.calls c
      where c.id = call_id and (c.initiated_by = auth.uid() or public.is_call_member(c.id))
    )
  );

-- 3. call_ring table: allow participants to insert and delete ring rows
drop policy if exists "own ring" on public.call_ring;
drop policy if exists "call ring participants" on public.call_ring;
create policy "call ring participants"
  on public.call_ring for all to authenticated
  using (
    user_id = auth.uid() or exists (
      select 1 from public.calls c
      where c.id = call_id and (c.initiated_by = auth.uid() or public.is_call_member(c.id))
    )
  )
  with check (
    user_id = auth.uid() or exists (
      select 1 from public.calls c
      where c.id = call_id and (c.initiated_by = auth.uid() or public.is_call_member(c.id))
    )
  );

-- 4. Atomic create_call function with security definer (bypasses RLS constraints safely)
create or replace function public.create_call(
  p_call_id text,
  p_kind text,
  p_chat_id text,
  p_peer_id uuid,
  p_peer_name text,
  p_caller_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.calls (id, kind, chat_id, state, initiated_by)
  values (p_call_id, p_kind, p_chat_id, 'ringing', v_caller_id)
  on conflict (id) do nothing;

  insert into public.call_members (call_id, user_id, peer_id, peer_name, direction, status)
  values
    (p_call_id, v_caller_id, p_peer_id, p_peer_name, 'outgoing', 'ringing'),
    (p_call_id, p_peer_id, v_caller_id, p_caller_name, 'incoming', 'ringing')
  on conflict (call_id, user_id) do nothing;

  insert into public.call_ring (call_id, user_id)
  values
    (p_call_id, v_caller_id),
    (p_call_id, p_peer_id)
  on conflict (call_id, user_id) do nothing;
end;
$$;

grant execute on function public.create_call(text, text, text, uuid, text, text) to authenticated;
