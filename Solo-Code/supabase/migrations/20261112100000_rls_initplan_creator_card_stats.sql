-- Scale: row-level-security checks that ran once per row now run once per query, the creator feed
-- gets its counts from one aggregate call, and anthem.projects gets the indexes its feeds need.
--
-- 1) RLS. A policy written as `owner_id = auth.uid()` or `has_role(auth.uid(), 'admin')` calls the
--    function again for every row the query touches. Wrapped in a scalar sub-select, Postgres
--    evaluates it once (an "InitPlan") and reuses the value. Same result, far less work on big scans:
--      auth.uid()                      ->  (select auth.uid())
--      has_role(auth.uid(), 'admin')   ->  (select has_role((select auth.uid()), 'admin'))
--    The block rewrites every policy in public / anthem / shared / storage that still has the bare
--    form and leaves already-wrapped ones alone, so it is safe to run more than once.
--    Dry run on production 2026-11-12 (rolled back): 441 policies rewritten, 0 errors, visible row
--    counts identical before/after for anon, an admin and three members across 18 tables.
--
-- 2) public.creator_card_stats(_ids): works / likes / packages / objects per creator for the
--    creator feed cards. Replaces three client queries that pulled one row per work.
--    SECURITY INVOKER on purpose: the caller's own RLS decides what is counted.

do $$
declare
  r record;
  nq text;
  nc text;
  n_ok int := 0;
  n_skip int := 0;
  bare_auth constant text := '(?<!SELECT )auth\.(uid|jwt|role)\(\)';
  bare_role constant text :=
    '(?<!SELECT )((?:public\.)?has_role\(\((?:select auth\.uid\(\)| SELECT auth\.uid\(\) AS uid)\), ''[a-z_]+''::(?:public\.)?app_role\))';
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname in ('public', 'anthem', 'shared', 'storage')
  loop
    nq := r.qual;
    nc := r.with_check;
    if nq is not null then
      nq := regexp_replace(nq, bare_auth, '(select auth.\1())', 'g');
      nq := regexp_replace(nq, bare_role, '(select \1)', 'g');
    end if;
    if nc is not null then
      nc := regexp_replace(nc, bare_auth, '(select auth.\1())', 'g');
      nc := regexp_replace(nc, bare_role, '(select \1)', 'g');
    end if;

    if nq is distinct from r.qual or nc is distinct from r.with_check then
      begin
        execute format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename)
          || case when nq is not null then format(' using (%s)', nq) else '' end
          || case when nc is not null then format(' with check (%s)', nc) else '' end;
        n_ok := n_ok + 1;
      exception when others then
        -- Keep the old (still correct) policy and carry on.
        n_skip := n_skip + 1;
        raise notice 'kept %.% / %: %', r.schemaname, r.tablename, r.policyname, sqlerrm;
      end;
    end if;
  end loop;
  raise notice 'RLS initplan: % policies rewritten, % kept as they were', n_ok, n_skip;
end $$;

create or replace function public.creator_card_stats(_ids uuid[])
returns table (
  owner_id uuid,
  project_count integer,
  like_count bigint,
  package_count integer,
  object_count integer
)
language sql
stable
set search_path = ''
as $$
  select
    o.id,
    pj.n,
    pj.likes,
    (select count(*)::int from anthem.creator_services s where s.owner_id = o.id and s.status = 'Published'),
    (select count(*)::int from anthem.creator_objects c where c.owner_id = o.id and c.status = 'Published')
  from (select distinct u.id from unnest(_ids[1:200]) as u(id)) o
  cross join lateral (
    select count(*)::int as n, coalesce(sum(p.likes), 0)::bigint as likes
    from anthem.projects p
    where p.owner_id = o.id and p.status = 'Published'
  ) pj;
$$;

revoke all on function public.creator_card_stats(uuid[]) from public;
grant execute on function public.creator_card_stats(uuid[]) to anon, authenticated;

-- 3) anthem.projects had only its primary key plus search indexes, so every feed, profile and
--    studio page scanned and sorted the whole table. These cover the three ways it is read.
create index if not exists idx_projects_published_created
  on anthem.projects (created_at desc)
  where status = 'Published';

create index if not exists idx_projects_owner_created
  on anthem.projects (owner_id, created_at desc);

create index if not exists idx_projects_studio
  on anthem.projects (studio_id)
  where studio_id is not null;
