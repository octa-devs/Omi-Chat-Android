-- Migration: Support Voice Messages ('audio' kind) and Message Reactions
-- Run this in your Supabase SQL editor.

-- 1. Update messages check constraint to allow 'audio' kind
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check
  check (kind in ('text', 'image', 'file', 'system', 'call', 'audio'));

-- 2. Add reactions JSONB column to messages if not present
alter table public.messages add column if not exists reactions jsonb default '{}'::jsonb;

-- 3. Atomic toggle_message_reaction function with SECURITY DEFINER
-- Allows any member of the chat to add/remove their reaction without violating RLS.
create or replace function public.toggle_message_reaction(
  p_message_id uuid,
  p_emoji text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_chat_id text;
  v_reactions jsonb;
  v_current_arr jsonb;
  v_new_arr jsonb;
  v_updated_reactions jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Verify message and membership
  select chat_id, coalesce(reactions, '{}'::jsonb)
    into v_chat_id, v_reactions
    from public.messages
    where id = p_message_id;

  if v_chat_id is null then
    raise exception 'Message not found';
  end if;

  if not public.is_chat_member(v_chat_id) then
    raise exception 'Not a member of this chat';
  end if;

  v_current_arr := coalesce(v_reactions -> p_emoji, '[]'::jsonb);

  -- Check if user already reacted
  if v_current_arr ? v_user_id::text then
    -- Remove user ID from array
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
      into v_new_arr
      from jsonb_array_elements_text(v_current_arr) elem
      where elem <> v_user_id::text;
  else
    -- Append user ID to array
    v_new_arr := v_current_arr || to_jsonb(v_user_id::text);
  end if;

  if jsonb_array_length(v_new_arr) = 0 then
    v_updated_reactions := v_reactions - p_emoji;
  else
    v_updated_reactions := jsonb_set(v_reactions, array[p_emoji], v_new_arr, true);
  end if;

  update public.messages
    set reactions = v_updated_reactions
    where id = p_message_id;

  return v_updated_reactions;
end;
$$;

grant execute on function public.toggle_message_reaction(uuid, text) to authenticated;

-- 4. Allow chat members to update messages (for direct client reaction updates fallback)
drop policy if exists "members update message reactions" on public.messages;
create policy "members update message reactions"
  on public.messages for update to authenticated
  using (public.is_chat_member(chat_id))
  with check (public.is_chat_member(chat_id));
