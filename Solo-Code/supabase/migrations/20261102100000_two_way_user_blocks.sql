-- UX-01: blocking hides both people from each other and stops contact in both directions.
-- RLS on anthem.user_blocks only shows rows the viewer created, so the viewer cannot see who blocked them.
-- These SECURITY DEFINER helpers return user ids / booleans only, never who blocked whom.

-- Internal: true when either user has blocked the other. Not callable by clients (would let anyone probe pairs).
create or replace function anthem.is_blocked_between(_a uuid, _b uuid)
returns boolean
language sql
stable
security definer
set search_path = anthem, public
as $$
  select exists (
    select 1 from anthem.user_blocks b
    where (b.blocker_id = _a and b.blocked_id = _b)
       or (b.blocker_id = _b and b.blocked_id = _a)
  );
$$;

revoke all on function anthem.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- Client: every user id the caller has blocked or been blocked by.
create or replace function public.get_blocked_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = anthem, public
as $$
  select b.blocked_id from anthem.user_blocks b where b.blocker_id = auth.uid()
  union
  select b.blocker_id from anthem.user_blocks b where b.blocked_id = auth.uid();
$$;

revoke all on function public.get_blocked_user_ids() from public, anon;
grant execute on function public.get_blocked_user_ids() to authenticated;

-- Client: is there a block in either direction between the caller and _other?
create or replace function public.is_blocked_with(_other uuid)
returns boolean
language sql
stable
security definer
set search_path = anthem, public
as $$
  select auth.uid() is not null and anthem.is_blocked_between(auth.uid(), _other);
$$;

revoke all on function public.is_blocked_with(uuid) from public, anon;
grant execute on function public.is_blocked_with(uuid) to authenticated;

-- Chat: no new 1:1 conversation and no new 1:1 message while either side blocks the other.
-- (20261016160000 defined a one-way version of this trigger; it is not live, so this replaces it.)
create or replace function shared.enforce_chat_block()
returns trigger
language plpgsql
security definer
set search_path = shared, anthem, public
as $$
declare
  v_conv record;
  v_other uuid;
begin
  if tg_table_name = 'conversations' then
    if coalesce(new.conversation_type, '') <> 'group' and coalesce(new.kind, '') not in ('group', 'studio')
       and new.client_id is not null and new.freelancer_id is not null
       and anthem.is_blocked_between(new.client_id, new.freelancer_id) then
      raise exception 'CHAT_BLOCKED' using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- messages: only 1:1 chats; system messages always pass
  if new.message_type = 'system' or new.sender_id is null then
    return new;
  end if;
  select client_id, freelancer_id, conversation_type, kind into v_conv
  from shared.conversations where id = new.conversation_id;
  if not found or v_conv.conversation_type = 'group' or v_conv.kind in ('group', 'studio') then
    return new;
  end if;
  v_other := case when new.sender_id = v_conv.client_id then v_conv.freelancer_id else v_conv.client_id end;
  if v_other is not null and anthem.is_blocked_between(new.sender_id, v_other) then
    raise exception 'CHAT_BLOCKED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_conversations_chat_block on shared.conversations;
create trigger trg_conversations_chat_block
  before insert on shared.conversations
  for each row execute function shared.enforce_chat_block();

drop trigger if exists trg_messages_chat_block on shared.messages;
create trigger trg_messages_chat_block
  before insert on shared.messages
  for each row execute function shared.enforce_chat_block();
