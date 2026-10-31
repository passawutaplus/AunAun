-- Collab tasks: post a reminder in the chat 1 day before the due date (and on the day if the
-- date was set too late for that). Runs hourly 08:00–20:00 Bangkok via pg_cron.

alter table shared.collab_tasks
  add column if not exists due_reminded_at timestamptz;

-- Moving the due date re-arms the reminder.
create or replace function shared.collab_tasks_reset_due_reminder()
returns trigger
language plpgsql
as $$
begin
  if new.due_date is distinct from old.due_date then
    new.due_reminded_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_collab_tasks_reset_due_reminder on shared.collab_tasks;
create trigger trg_collab_tasks_reset_due_reminder
  before update on shared.collab_tasks
  for each row execute function shared.collab_tasks_reset_due_reminder();

create or replace function shared.collab_task_due_reminders()
returns integer
language plpgsql
security definer
set search_path = shared, public
as $$
declare
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
  v_count integer := 0;
  r record;
  v_sender uuid;
  v_who text;
begin
  for r in
    select t.id, t.conversation_id, t.title, t.created_by, t.assignee_id, t.due_date,
           p.username, p.display_name
    from shared.collab_tasks t
    left join public.profiles_public p on p.user_id = t.assignee_id
    where t.status <> 'done'
      and t.due_reminded_at is null
      and t.due_date between v_today and v_today + 1
    for update of t skip locked
  loop
    -- Post as someone other than the assignee so the assignee gets the chat notification.
    v_sender := r.created_by;
    if r.assignee_id is not null and r.created_by = r.assignee_id then
      select coalesce(nullif(c.client_id, r.assignee_id), nullif(c.freelancer_id, r.assignee_id), r.created_by)
        into v_sender
        from shared.conversations c
        where c.id = r.conversation_id;
    end if;

    v_who := coalesce(nullif(r.username, ''), nullif(r.display_name, ''));
    insert into shared.messages (conversation_id, sender_id, content, message_type)
    values (
      r.conversation_id,
      coalesce(v_sender, r.created_by),
      '⏰ ' || case when r.due_date = v_today then 'วันนี้' else 'พรุ่งนี้' end
        || 'ครบกำหนดส่ง: “' || r.title || '”'
        || coalesce(' — ' || v_who, ''),
      'system'
    );

    update shared.collab_tasks set due_reminded_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function shared.collab_task_due_reminders() from public, anon, authenticated;

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'collab-task-due-reminders') then
    perform cron.unschedule('collab-task-due-reminders');
  end if;
  perform cron.schedule('collab-task-due-reminders', '0 1-13 * * *', 'select shared.collab_task_due_reminders()');
end;
$$;
