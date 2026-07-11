-- A+ Vault feedback + super-admin RPCs (email-gated)

create table if not exists public.vault_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  user_name text,
  feature text not null default 'vault',
  message text not null default '',
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists vault_feedback_created_at_idx
  on public.vault_feedback (created_at desc);

create index if not exists vault_feedback_user_id_idx
  on public.vault_feedback (user_id, created_at desc);

alter table public.vault_feedback enable row level security;

drop policy if exists "Users insert own vault feedback" on public.vault_feedback;
create policy "Users insert own vault feedback"
  on public.vault_feedback for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users view own vault feedback" on public.vault_feedback;
create policy "Users view own vault feedback"
  on public.vault_feedback for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users delete own vault feedback" on public.vault_feedback;
create policy "Users delete own vault feedback"
  on public.vault_feedback for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.is_vault_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'passawut.a.plus@gmail.com';
$$;

revoke all on function public.is_vault_super_admin() from public;
grant execute on function public.is_vault_super_admin() to authenticated;

create or replace function public.vault_admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_vault_super_admin() then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'items', (select count(*)::int from public.vault_items),
    'collections', (select count(*)::int from public.vault_collections),
    'projects', (select count(*)::int from public.vault_projects),
    'boards', (select count(*)::int from public.vault_boards),
    'captures_total', (select count(*)::int from public.vault_extension_captures),
    'captures_24h', (select count(*)::int from public.vault_extension_captures where created_at > now() - interval '24 hours'),
    'captures_7d', (select count(*)::int from public.vault_extension_captures where created_at > now() - interval '7 days'),
    'capture_scopes', (select count(distinct bearer_hash)::int from public.vault_extension_captures where bearer_hash is not null),
    'captures_with_user', (select count(*)::int from public.vault_extension_captures where user_id is not null),
    'feedback_total', (select count(*)::int from public.vault_feedback),
    'feedback_avg', (select round(avg(rating)::numeric, 2) from public.vault_feedback),
    'storage_objects', (select count(*)::int from storage.objects where bucket_id = 'vault-assets'),
    'storage_bytes', (select coalesce(sum((metadata->>'size')::bigint), 0)::bigint from storage.objects where bucket_id = 'vault-assets'),
    'generated_at', now()
  ) into result;

  return result;
end;
$$;

revoke all on function public.vault_admin_overview() from public;
grant execute on function public.vault_admin_overview() to authenticated;

create or replace function public.vault_admin_list_feedback(p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 50), 200));
begin
  if not public.is_vault_super_admin() then
    raise exception 'not authorized';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (
      select id, user_id, user_email, user_name, feature, message, rating, created_at
      from public.vault_feedback
      order by created_at desc
      limit lim
    ) t
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.vault_admin_list_feedback(int) from public;
grant execute on function public.vault_admin_list_feedback(int) to authenticated;

create or replace function public.vault_admin_list_captures(p_limit int default 40)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 40), 200));
begin
  if not public.is_vault_super_admin() then
    raise exception 'not authorized';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (
      select
        id,
        object_id,
        user_id,
        left(coalesce(bearer_hash, ''), 12) as bearer_prefix,
        coalesce(item->>'type', 'unknown') as item_type,
        coalesce(item->>'title', '') as title,
        created_at
      from public.vault_extension_captures
      order by created_at desc
      limit lim
    ) t
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.vault_admin_list_captures(int) from public;
grant execute on function public.vault_admin_list_captures(int) to authenticated;

create or replace function public.vault_admin_purge_captures(p_older_than_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  days int := greatest(1, least(coalesce(p_older_than_days, 30), 3650));
  deleted_count int;
begin
  if not public.is_vault_super_admin() then
    raise exception 'not authorized';
  end if;

  with gone as (
    delete from public.vault_extension_captures
    where created_at < now() - make_interval(days => days)
    returning 1
  )
  select count(*)::int into deleted_count from gone;

  return jsonb_build_object('deleted', deleted_count, 'older_than_days', days);
end;
$$;

revoke all on function public.vault_admin_purge_captures(int) from public;
grant execute on function public.vault_admin_purge_captures(int) to authenticated;
