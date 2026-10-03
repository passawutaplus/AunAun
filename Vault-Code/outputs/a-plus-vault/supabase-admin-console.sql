-- A+ Vault admin console: audit log, plans/limits, user flags, feedback status, report + share moderation RPCs.
-- Apply after supabase-feedback-admin.sql and supabase-discover-reports.sql. Idempotent. Not applied automatically.
-- Every RPC is gated by is_vault_super_admin() and writes to vault_admin_log when it changes data.

-- ---------------------------------------------------------------- audit log
create table if not exists public.vault_admin_log (
  id bigint generated always as identity primary key,
  admin_email text not null,
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists vault_admin_log_created_idx on public.vault_admin_log (created_at desc);
alter table public.vault_admin_log enable row level security; -- no policies: reachable only through the RPCs below

create or replace function public.vault_admin_log_write(p_action text, p_target_type text, p_target_id text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.vault_admin_log (admin_email, action, target_type, target_id, detail)
  values (lower(coalesce(auth.jwt() ->> 'email', '')), p_action, coalesce(p_target_type, ''), coalesce(p_target_id, ''), coalesce(p_detail, '{}'::jsonb));
$$;
revoke all on function public.vault_admin_log_write(text, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- plans + per-user flags
create table if not exists public.vault_plans (
  id text primary key,
  name text not null,
  max_items integer not null default 500 check (max_items >= 0),
  max_storage_mb integer not null default 500 check (max_storage_mb >= 0),
  max_boards integer not null default 20 check (max_boards >= 0),
  max_shares integer not null default 5 check (max_shares >= 0),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.vault_plans enable row level security;

insert into public.vault_plans (id, name, max_items, max_storage_mb, max_boards, max_shares, sort_order) values
  ('free', 'Free', 500, 500, 20, 5, 0),
  ('pro', 'Pro', 10000, 10000, 500, 200, 1),
  ('staff', 'Staff / comp', 100000, 100000, 5000, 5000, 2)
on conflict (id) do nothing;

create table if not exists public.vault_user_admin (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null default 'free' references public.vault_plans(id),
  suspended boolean not null default false,
  note text not null default '' check (char_length(note) <= 2000),
  updated_at timestamptz not null default now()
);
alter table public.vault_user_admin enable row level security;

alter table public.vault_feedback add column if not exists status text not null default 'new';
alter table public.vault_feedback add column if not exists admin_note text not null default '';
do $$ begin
  alter table public.vault_feedback add constraint vault_feedback_status_check check (status in ('new', 'handled', 'archived'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- reads
create or replace function public.vault_admin_attention()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  return jsonb_build_object(
    'open_reports', (select count(*)::int from public.discover_reports where status = 'open'),
    'new_feedback', (select count(*)::int from public.vault_feedback where status = 'new'),
    'active_shares', (select count(*)::int from public.vault_boards where share_enabled),
    'suspended_users', (select count(*)::int from public.vault_user_admin where suspended),
    'users_total', (select count(*)::int from auth.users),
    'users_7d', (select count(*)::int from auth.users where created_at > now() - interval '7 days')
  );
end $$;
revoke all on function public.vault_admin_attention() from public;
grant execute on function public.vault_admin_attention() to authenticated;

-- Signups / captures / new items per day for the overview charts.
create or replace function public.vault_admin_activity(p_days int default 14)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d int := greatest(1, least(coalesce(p_days, 14), 90));
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'day', g.day::date,
      'signups', (select count(*)::int from auth.users u where u.created_at::date = g.day::date),
      'items', (select count(*)::int from public.vault_items i where i.created_at::date = g.day::date),
      'captures', (select count(*)::int from public.vault_extension_captures c where c.created_at::date = g.day::date)
    ) order by g.day)
    from generate_series(current_date - (d - 1), current_date, interval '1 day') as g(day)
  ), '[]'::jsonb);
end $$;
revoke all on function public.vault_admin_activity(int) from public;
grant execute on function public.vault_admin_activity(int) to authenticated;

create or replace function public.vault_admin_list_users(p_search text default '', p_limit int default 25, p_offset int default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 25), 100));
  off int := greatest(0, coalesce(p_offset, 0));
  q text := '%' || lower(trim(coalesce(p_search, ''))) || '%';
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  return jsonb_build_object(
    'total', (select count(*)::int from auth.users u where lower(coalesce(u.email, '')) like q),
    'rows', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
      from (
        select
          u.id, u.email,
          coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '') as name,
          u.created_at, u.last_sign_in_at,
          coalesce(a.plan_id, 'free') as plan_id,
          coalesce(a.suspended, false) as suspended,
          coalesce(a.note, '') as note,
          (select count(*)::int from public.vault_items i where i.user_id = u.id) as items,
          (select count(*)::int from public.vault_boards b where b.user_id = u.id) as boards,
          (select count(*)::int from public.vault_boards b where b.user_id = u.id and b.share_enabled) as shares,
          (select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint from storage.objects o where o.bucket_id = 'vault-assets' and o.owner = u.id) as storage_bytes
        from auth.users u
        left join public.vault_user_admin a on a.user_id = u.id
        where lower(coalesce(u.email, '')) like q
        order by u.created_at desc
        limit lim offset off
      ) t
    ), '[]'::jsonb)
  );
end $$;
revoke all on function public.vault_admin_list_users(text, int, int) from public;
grant execute on function public.vault_admin_list_users(text, int, int) to authenticated;

create or replace function public.vault_admin_list_plans()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.sort_order)
    from (
      select p.id, p.name, p.max_items, p.max_storage_mb, p.max_boards, p.max_shares, p.sort_order,
        (select count(*)::int from public.vault_user_admin a where a.plan_id = p.id)
          + case when p.id = 'free' then (select count(*)::int from auth.users u where not exists (select 1 from public.vault_user_admin a where a.user_id = u.id)) else 0 end as users
      from public.vault_plans p
    ) t
  ), '[]'::jsonb);
end $$;
revoke all on function public.vault_admin_list_plans() from public;
grant execute on function public.vault_admin_list_plans() to authenticated;

create or replace function public.vault_admin_list_reports(p_status text default 'open', p_limit int default 50)
returns jsonb language plpgsql security definer set search_path = public as $$
declare lim int := greatest(1, least(coalesce(p_limit, 50), 200));
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (
      select r.id, r.item_id, r.reason, r.details, r.email, r.status, r.created_at,
        d.title as item_title, d.status as item_status, d.source, d.source_url, d.image_sm_path
      from public.discover_reports r
      join public.discover_items d on d.id = r.item_id
      where p_status = 'all' or r.status = p_status
      order by r.created_at desc
      limit lim
    ) t
  ), '[]'::jsonb);
end $$;
revoke all on function public.vault_admin_list_reports(text, int) from public;
grant execute on function public.vault_admin_list_reports(text, int) to authenticated;

create or replace function public.vault_admin_list_shares(p_limit int default 100)
returns jsonb language plpgsql security definer set search_path = public as $$
declare lim int := greatest(1, least(coalesce(p_limit, 100), 300));
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.updated_at desc)
    from (
      select b.id, b.name, b.share_token, b.updated_at, u.email as owner_email
      from public.vault_boards b
      left join auth.users u on u.id = b.user_id
      where b.share_enabled
      order by b.updated_at desc
      limit lim
    ) t
  ), '[]'::jsonb);
end $$;
revoke all on function public.vault_admin_list_shares(int) from public;
grant execute on function public.vault_admin_list_shares(int) to authenticated;

create or replace function public.vault_admin_list_audit(p_limit int default 100)
returns jsonb language plpgsql security definer set search_path = public as $$
declare lim int := greatest(1, least(coalesce(p_limit, 100), 500));
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (select id, admin_email, action, target_type, target_id, detail, created_at from public.vault_admin_log order by created_at desc limit lim) t
  ), '[]'::jsonb);
end $$;
revoke all on function public.vault_admin_list_audit(int) from public;
grant execute on function public.vault_admin_list_audit(int) to authenticated;

-- Feedback list with status (replaces the older list for the console; the old RPC keeps working).
create or replace function public.vault_admin_list_feedback_v2(p_status text default 'all', p_limit int default 100)
returns jsonb language plpgsql security definer set search_path = public as $$
declare lim int := greatest(1, least(coalesce(p_limit, 100), 300));
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (
      select id, user_id, user_email, user_name, feature, message, rating, status, admin_note, created_at
      from public.vault_feedback
      where p_status = 'all' or status = p_status
      order by created_at desc
      limit lim
    ) t
  ), '[]'::jsonb);
end $$;
revoke all on function public.vault_admin_list_feedback_v2(text, int) from public;
grant execute on function public.vault_admin_list_feedback_v2(text, int) to authenticated;

-- ---------------------------------------------------------------- writes (all audited)
create or replace function public.vault_admin_set_user(p_user uuid, p_plan text, p_suspended boolean, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  if not exists (select 1 from public.vault_plans where id = p_plan) then raise exception 'unknown plan'; end if;
  insert into public.vault_user_admin (user_id, plan_id, suspended, note, updated_at)
  values (p_user, p_plan, coalesce(p_suspended, false), left(coalesce(p_note, ''), 2000), now())
  on conflict (user_id) do update
    set plan_id = excluded.plan_id, suspended = excluded.suspended, note = excluded.note, updated_at = now();
  perform public.vault_admin_log_write('user.update', 'user', p_user::text,
    jsonb_build_object('plan', p_plan, 'suspended', coalesce(p_suspended, false), 'note', left(coalesce(p_note, ''), 200)));
end $$;
revoke all on function public.vault_admin_set_user(uuid, text, boolean, text) from public;
grant execute on function public.vault_admin_set_user(uuid, text, boolean, text) to authenticated;

create or replace function public.vault_admin_update_plan(p_id text, p_items int, p_storage_mb int, p_boards int, p_shares int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  update public.vault_plans
    set max_items = greatest(0, p_items), max_storage_mb = greatest(0, p_storage_mb),
        max_boards = greatest(0, p_boards), max_shares = greatest(0, p_shares), updated_at = now()
    where id = p_id;
  perform public.vault_admin_log_write('plan.update', 'plan', p_id,
    jsonb_build_object('items', p_items, 'storage_mb', p_storage_mb, 'boards', p_boards, 'shares', p_shares));
end $$;
revoke all on function public.vault_admin_update_plan(text, int, int, int, int) from public;
grant execute on function public.vault_admin_update_plan(text, int, int, int, int) to authenticated;

create or replace function public.vault_admin_resolve_report(p_id uuid, p_status text, p_hide_item boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_item uuid;
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  if p_status not in ('open', 'resolved', 'dismissed') then raise exception 'bad status'; end if;
  update public.discover_reports set status = p_status where id = p_id returning item_id into v_item;
  if v_item is null then raise exception 'report not found'; end if;
  if coalesce(p_hide_item, false) then
    update public.discover_items set status = 'hidden', updated_at = now() where id = v_item;
  end if;
  perform public.vault_admin_log_write('report.' || p_status, 'report', p_id::text,
    jsonb_build_object('item_id', v_item, 'hid_item', coalesce(p_hide_item, false)));
end $$;
revoke all on function public.vault_admin_resolve_report(uuid, text, boolean) from public;
grant execute on function public.vault_admin_resolve_report(uuid, text, boolean) to authenticated;

create or replace function public.vault_admin_revoke_share(p_board uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  update public.vault_boards set share_enabled = false, visibility = 'private' where id = p_board;
  update public.vault_board_shares set enabled = false where board_id = p_board;
  perform public.vault_admin_log_write('share.revoke', 'board', p_board::text, '{}'::jsonb);
end $$;
revoke all on function public.vault_admin_revoke_share(uuid) from public;
grant execute on function public.vault_admin_revoke_share(uuid) to authenticated;

create or replace function public.vault_admin_set_feedback(p_id uuid, p_status text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  if p_status not in ('new', 'handled', 'archived') then raise exception 'bad status'; end if;
  update public.vault_feedback set status = p_status, admin_note = left(coalesce(p_note, ''), 2000) where id = p_id;
  perform public.vault_admin_log_write('feedback.' || p_status, 'feedback', p_id::text, '{}'::jsonb);
end $$;
revoke all on function public.vault_admin_set_feedback(uuid, text, text) from public;
grant execute on function public.vault_admin_set_feedback(uuid, text, text) to authenticated;

-- Audit the existing purge too: call this after vault_admin_purge_captures from the console.
create or replace function public.vault_admin_log_event(p_action text, p_target_type text, p_target_id text, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  perform public.vault_admin_log_write(p_action, p_target_type, p_target_id, p_detail);
end $$;
revoke all on function public.vault_admin_log_event(text, text, text, jsonb) from public;
grant execute on function public.vault_admin_log_event(text, text, text, jsonb) to authenticated;
