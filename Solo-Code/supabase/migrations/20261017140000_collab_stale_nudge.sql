-- Collab chats: one nudge after 7 quiet days while tasks are still open
-- ("ไม่ได้คุยกัน 7 วัน — ยังทำต่อไหม?"). Daily 10:00 Bangkok via pg_cron.

create table if not exists shared.collab_nudges (
  conversation_id uuid primary key references shared.conversations(id) on delete cascade,
  nudged_at timestamptz not null default now()
);
alter table shared.collab_nudges enable row level security;
-- No policies: only the security-definer job below touches it.

create or replace function shared.collab_stale_nudges()
returns integer
language plpgsql
security definer
set search_path = shared, public, anthem
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select c.id, coalesce(c.client_id, c.created_by) as sender
    from shared.conversations c
    left join anthem.collab_requests cr on cr.id = c.request_id
    left join shared.collab_nudges n on n.conversation_id = c.id
    where (c.kind = 'collab' or c.group_tag = 'collab')
      and c.last_message_at < now() - interval '7 days'
      and (n.nudged_at is null or n.nudged_at < c.last_message_at)
      and (cr.id is null or cr.status = 'accepted')
      and exists (
        select 1 from shared.collab_tasks t
        where t.conversation_id = c.id and t.status <> 'done'
      )
  loop
    insert into shared.messages (conversation_id, sender_id, content, message_type)
    values (r.id, r.sender, 'ไม่ได้คุยกัน 7 วันแล้ว — ยังทำต่อไหม? ดูงานที่ค้างใน Tasks', 'system');
    insert into shared.collab_nudges (conversation_id, nudged_at)
    values (r.id, now())
    on conflict (conversation_id) do update set nudged_at = excluded.nudged_at;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function shared.collab_stale_nudges() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'collab-stale-nudges') then
    perform cron.unschedule('collab-stale-nudges');
  end if;
  perform cron.schedule('collab-stale-nudges', '0 3 * * *', 'select shared.collab_stale_nudges()');
end;
$$;
