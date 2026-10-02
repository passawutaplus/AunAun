-- A+ Vault: scale hardening (collections sync table, upsert keys, dedupe index,
-- RLS initplan, redundant index cleanup, Discover search index).
-- Additive / equivalent changes only; safe to apply before the matching app deploy.

-- 1. Extension collection sync table (API routes query it for every caller).
create table if not exists public.vault_extension_collections (
  id uuid primary key default gen_random_uuid(),
  bearer_hash text not null,
  user_id uuid references auth.users(id) on delete cascade,
  client_key text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bearer_hash, client_key)
);

create index if not exists vault_extension_collections_bearer_hash_idx
  on public.vault_extension_collections (bearer_hash, created_at asc);

alter table public.vault_extension_collections enable row level security;
-- No client policies: only the server-side service role reads/writes this table.

-- 2. One collection per (user, client_key) so the API can upsert in a single request.
create unique index if not exists vault_collections_user_client_key_uniq
  on public.vault_collections (user_id, client_key);
drop index if exists public.vault_collections_user_client_key_idx;

-- 3. Duplicate detection by indexed keys instead of scanning recent captures.
alter table public.vault_extension_captures
  add column if not exists dedupe_keys text[] not null default '{}';

update public.vault_extension_captures c
set dedupe_keys = coalesce((
  select array_agg(distinct split_part(v, '#', 1))
  from unnest(array[
    c.item->>'sourceUrl', c.item->>'assetUrl', c.item->>'previewUrl', c.item->>'thumbnailUrl',
    c.item#>>'{captureContext,imageUrl}', c.item#>>'{captureContext,linkUrl}',
    c.item#>>'{captureContext,pageUrl}', c.item#>>'{captureContext,videoUrl}'
  ]) as v
  where coalesce(v, '') <> '' and v !~* '^data:' and length(v) <= 2048
), '{}')
where c.dedupe_keys = '{}';

create index if not exists vault_extension_captures_dedupe_idx
  on public.vault_extension_captures using gin (dedupe_keys);

-- 4. Evaluate auth.uid() once per query instead of once per row.
do $$
declare p record;
begin
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and tablename like 'vault\_%'
      and (qual = '(auth.uid() = user_id)' or with_check = '(auth.uid() = user_id)')
  loop
    execute format(
      'alter policy %I on public.%I %s %s',
      p.policyname, p.tablename,
      case when p.qual is not null then 'using ((select auth.uid()) = user_id)' else '' end,
      case when p.with_check is not null then 'with check ((select auth.uid()) = user_id)' else '' end
    );
  end loop;
end $$;

-- 5. Redundant indexes (covered by composite indexes) and unused JSON GIN indexes.
drop index if exists public.vault_boards_project_id_nullable_idx;
drop index if exists public.vault_boards_project_id_idx;
drop index if exists public.vault_boards_user_id_idx;
drop index if exists public.vault_items_user_id_idx;
drop index if exists public.vault_projects_user_id_idx;
drop index if exists public.vault_board_objects_board_id_idx;
drop index if exists public.vault_items_client_payload_idx;
drop index if exists public.vault_items_capture_context_idx;

-- 6. Discover keyword search: one trigram-indexed column instead of 9 ilike scans.
alter table public.discover_items
  add column if not exists search_text text generated always as (
    lower(
      coalesce(title, '') || ' ' || coalesce(style, '') || ' ' || coalesce(attribution, '') || ' ' ||
      coalesce(source_meta->>'medium', '') || ' ' || coalesce(source_meta->>'object_name', '') || ' ' ||
      coalesce(source_meta->>'culture', '') || ' ' || coalesce(source_meta->>'geography', '') || ' ' ||
      coalesce(source_meta->>'classification', '') || ' ' || coalesce(source_meta->>'period', '')
    )
  ) stored;

create index if not exists discover_items_search_trgm_idx
  on public.discover_items using gin (search_text public.gin_trgm_ops)
  where status = 'published';
