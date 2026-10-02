-- A+ Vault Discover seeder catalog.
-- Platform-owned rows (no user_id). Writes: service role only (seeder app).
-- Reads: anon + authenticated can see status = 'published' rows only.
-- Requires public.vault_set_updated_at() from supabase-moodboard-phase1.sql.

create extension if not exists "pgcrypto";

create table if not exists public.discover_items (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('met', 'aic', 'unsplash', 'pexels')),
  source_id text not null,
  source_url text not null,
  original_image_url text not null,
  title text not null default '',
  license text not null,
  license_url text,
  attribution text not null default '',
  attribution_json jsonb not null default '{}'::jsonb,
  delivery_mode text not null default 'rehosted' check (delivery_mode in ('rehosted', 'hotlink')),
  image_sm_path text,
  image_md_path text,
  image_lg_path text,
  blurhash text,
  width integer,
  height integer,
  phash bit(64),
  duplicate_of uuid references public.discover_items(id) on delete set null,
  category text not null,
  ai_category text,
  tags text[] not null default '{}',
  style text,
  colors text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected', 'hidden')),
  reject_reason text
    check (reject_reason is null or reject_reason in (
      'license_not_allowed',
      'missing_attribution',
      'duplicate_phash',
      'below_min_resolution',
      'moderation_blocked',
      'missing_image',
      'download_failed',
      'ai_invalid_output'
    )),
  source_meta jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id),
  check (status <> 'rejected' or reject_reason is not null),
  check (
    status <> 'published'
    or (
      license = 'cc0'
      and char_length(btrim(attribution)) > 0
      and source_url ~ '^https://'
      and delivery_mode = 'rehosted'
      and image_sm_path is not null
      and image_md_path is not null
      and image_lg_path is not null
      and blurhash is not null
      and phash is not null
      and width is not null
      and height is not null
      and greatest(width, height) >= 1000
    )
  )
);

create table if not exists public.seed_targets (
  category text not null check (category ~ '^[a-z][a-z0-9_-]{1,40}$'),
  source text not null check (source in ('met', 'aic')),
  query text not null check (char_length(btrim(query)) > 0),
  target_count integer not null check (target_count > 0),
  cursor integer not null default 0 check (cursor >= 0),
  exhausted boolean not null default false,
  -- Records the adapter dropped before the pipeline (not public domain / no image).
  scanned_count integer not null default 0,
  skipped_count integer not null default 0,
  enabled boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (category, source)
);

-- Single-row switch for the admin Pause/Resume button. Starts paused.
create table if not exists public.seeder_control (
  id boolean primary key default true check (id),
  paused boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.seeder_control (id, paused)
values (true, true)
on conflict (id) do nothing;

alter table public.discover_items enable row level security;
alter table public.seed_targets enable row level security;
alter table public.seeder_control enable row level security;

drop policy if exists "Public read published discover items" on public.discover_items;
create policy "Public read published discover items"
  on public.discover_items for select to anon, authenticated
  using (status = 'published');

-- seed_targets and seeder_control: no policies. Service role bypasses RLS.

revoke insert, update, delete on public.discover_items from anon, authenticated;
revoke all on public.seed_targets from anon, authenticated;
revoke all on public.seeder_control from anon, authenticated;

create index if not exists discover_items_category_status_idx
  on public.discover_items (category, status);
create index if not exists discover_items_published_feed_idx
  on public.discover_items (published_at desc, id desc)
  where status = 'published';
create index if not exists discover_items_reject_reason_idx
  on public.discover_items (reject_reason, source)
  where status = 'rejected';
create index if not exists discover_items_tags_idx
  on public.discover_items using gin (tags);
create index if not exists discover_items_duplicate_of_idx
  on public.discover_items (duplicate_of)
  where duplicate_of is not null;

drop trigger if exists discover_items_set_updated_at on public.discover_items;
create trigger discover_items_set_updated_at
  before update on public.discover_items
  for each row execute function public.vault_set_updated_at();

drop trigger if exists seed_targets_set_updated_at on public.seed_targets;
create trigger seed_targets_set_updated_at
  before update on public.seed_targets
  for each row execute function public.vault_set_updated_at();

drop trigger if exists seeder_control_set_updated_at on public.seeder_control;
create trigger seeder_control_set_updated_at
  before update on public.seeder_control
  for each row execute function public.vault_set_updated_at();

-- Near-duplicate lookup by perceptual hash (Hamming distance).
create or replace function public.discover_find_similar(p_phash bit(64), p_max_distance int default 6)
returns table (id uuid, distance int)
language sql
stable
set search_path = public
as $$
  select d.id, bit_count(d.phash # p_phash)::int as distance
  from public.discover_items d
  where d.phash is not null
    and d.status in ('published', 'pending', 'hidden')
    and bit_count(d.phash # p_phash) <= p_max_distance
  order by distance asc
  limit 5;
$$;

revoke all on function public.discover_find_similar(bit, int) from public, anon, authenticated;
grant execute on function public.discover_find_similar(bit, int) to service_role;

-- Published count per category vs target (scheduler + admin).
create or replace function public.discover_category_progress()
returns table (category text, target_count int, published int, pending int, rejected int)
language sql
stable
set search_path = public
as $$
  with targets as (
    select t.category, max(t.target_count)::int as target_count
    from public.seed_targets t
    where t.enabled
    group by t.category
  )
  select
    t.category,
    t.target_count,
    count(i.id) filter (where i.status = 'published')::int,
    count(i.id) filter (where i.status = 'pending')::int,
    count(i.id) filter (where i.status = 'rejected')::int
  from targets t
  left join public.discover_items i on i.category = t.category
  group by t.category, t.target_count
  order by t.category;
$$;

revoke all on function public.discover_category_progress() from public, anon, authenticated;
grant execute on function public.discover_category_progress() to service_role;

-- Reject reasons per source (admin).
create or replace function public.discover_reject_summary()
returns table (reject_reason text, source text, total int)
language sql
stable
set search_path = public
as $$
  select d.reject_reason, d.source, count(*)::int
  from public.discover_items d
  where d.status = 'rejected'
  group by d.reject_reason, d.source
  order by count(*) desc;
$$;

revoke all on function public.discover_reject_summary() from public, anon, authenticated;
grant execute on function public.discover_reject_summary() to service_role;

-- Public storage bucket for rehosted WebP renditions. Writes via service role only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('discover-media', 'discover-media', true, 5242880, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Starter categories (museum CC0 sources). Review queries before resuming the seeder.
-- AIC rows start disabled: its IIIF image server answered 403 (Cloudflare) to scripted downloads
-- during testing. Enable from /admin/seeder after one AIC batch succeeds from the deployed seeder.
insert into public.seed_targets (category, source, query, target_count, enabled) values
  ('poster',       'met', 'poster',          200, true),
  ('poster',       'aic', 'poster',          200, false),
  ('typography',   'met', 'calligraphy',     200, true),
  ('typography',   'aic', 'lettering',       200, false),
  ('illustration', 'met', 'illustration',    200, true),
  ('illustration', 'aic', 'illustration',    200, false),
  ('textile',      'met', 'textile',         200, true),
  ('textile',      'aic', 'textile',         200, false),
  ('ceramic',      'met', 'ceramic',         200, true),
  ('ceramic',      'aic', 'ceramic',         200, false),
  ('furniture',    'met', 'chair',           200, true),
  ('furniture',    'aic', 'furniture',       200, false),
  ('architecture', 'met', 'architecture',    200, true),
  ('architecture', 'aic', 'architecture',    200, false),
  ('photography',  'met', 'photograph',      200, true),
  ('photography',  'aic', 'photograph',      200, false),
  ('print',        'met', 'woodblock print', 200, true),
  ('print',        'aic', 'woodblock',       200, false),
  ('pattern',      'met', 'pattern',         200, true),
  ('pattern',      'aic', 'pattern',         200, false)
on conflict (category, source) do nothing;
