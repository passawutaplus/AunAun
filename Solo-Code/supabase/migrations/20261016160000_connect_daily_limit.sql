-- Spam guard for "just connect" chats: cap how many NEW connect conversations a user can open per 24h.
-- New accounts (< 7 days) get a tighter cap. Replies inside existing chats are not limited.
create or replace function shared.enforce_connect_daily_limit()
returns trigger
language plpgsql
security definer
set search_path = shared, public, auth
as $$
declare
  v_sender uuid := new.client_id;
  v_account_age interval;
  v_cap int;
  v_count int;
begin
  if new.kind is distinct from 'connect' or v_sender is null then
    return new;
  end if;

  select now() - u.created_at into v_account_age from auth.users u where u.id = v_sender;
  v_cap := case when v_account_age is null or v_account_age < interval '7 days' then 5 else 20 end;

  select count(*) into v_count
  from shared.conversations c
  where c.kind = 'connect'
    and c.client_id = v_sender
    and c.created_at > now() - interval '24 hours';

  if v_count >= v_cap then
    raise exception 'CONNECT_DAILY_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_connect_daily_limit on shared.conversations;
create trigger trg_connect_daily_limit
  before insert on shared.conversations
  for each row execute function shared.enforce_connect_daily_limit();

-- Block enforcement: a blocked user cannot open a connect chat with, or send messages to, the person who blocked them.
-- (Client checks isBlockedFromOpportunity, but existing 1:1 chats stayed writable.)
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
    if new.kind = 'connect' and new.client_id is not null and new.freelancer_id is not null
       and anthem.is_blocked_from_opportunity(new.client_id, new.freelancer_id) then
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
  if v_other is not null and anthem.is_blocked_from_opportunity(new.sender_id, v_other) then
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
