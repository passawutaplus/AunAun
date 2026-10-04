-- A+ Vault Engine, phase 03: Image Passport on top of public.discover_items + engine tables.
-- NOT APPLIED. Review, then apply once (Supabase SQL editor). Idempotent. Apply after supabase-discover-open-licenses.sql.
-- Passport names map to existing columns (not duplicated): license_status = license, credit_text = attribution,
-- image url = image_*_path, source_url/title/width/height/blurhash/phash/published_at already exist.
-- Thresholds below mirror config/engine.json (MIN_CONFIDENT_TAGS 4, QUALITY_PUBLISH 75); change both together.

-- ---------------------------------------------------------------- passport columns
alter table public.discover_items
  add column if not exists tags_json jsonb not null default '[]'::jsonb,       -- [{id, facet, conf 0-1, src code|meta|ai|user}]
  add column if not exists tags_ids text[] not null default '{}',               -- only conf >= TAG_MIN_CONF; set by the publish function
  add column if not exists palette jsonb,
  add column if not exists metrics jsonb,
  add column if not exists quality_score integer check (quality_score is null or quality_score between 0 and 100),
  add column if not exists enrich_level smallint not null default 0 check (enrich_level between 0 and 3),
  add column if not exists alt_text_th text,
  add column if not exists alt_text_en text,
  add column if not exists status_reason text,
  add column if not exists last_checked_at timestamptz,
  add column if not exists check_fail_count integer not null default 0,
  add column if not exists era text,
  add column if not exists culture_region text,
  add column if not exists medium text,
  add column if not exists institution text,
  add column if not exists year integer,
  -- Rows published before the passport existed keep showing until phase 05 re-tags them.
  add column if not exists legacy_published boolean not null default false;

update public.discover_items set legacy_published = true where status = 'published' and legacy_published = false and cardinality(tags_ids) = 0;

-- ---------------------------------------------------------------- status: add 'review'
alter table public.discover_items drop constraint if exists discover_items_status_check;
alter table public.discover_items
  add constraint discover_items_status_check check (status in ('pending', 'review', 'published', 'rejected', 'hidden'));

-- ---------------------------------------------------------------- publish gate (license rules unchanged + passport rules)
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.discover_items'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%published%'
      and pg_get_constraintdef(oid) like '%license%'
  loop
    execute format('alter table public.discover_items drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.discover_items drop constraint if exists discover_items_published_ok;
alter table public.discover_items
  add constraint discover_items_published_ok check (
    status <> 'published'
    or (
      license in ('cc0', 'pdm', 'cc-by', 'cc-by-sa')
      and (license in ('cc0', 'pdm') or license_url ~ '^https://')
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
      and (legacy_published or (cardinality(tags_ids) >= 4 and quality_score >= 75))
    )
  ) not valid;
alter table public.discover_items validate constraint discover_items_published_ok;

-- ---------------------------------------------------------------- indexes
create index if not exists discover_items_tags_ids_gin on public.discover_items using gin (tags_ids);
create index if not exists discover_items_text_gin on public.discover_items
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(array_to_string(tags, ' '), '')));

-- ---------------------------------------------------------------- engine tables (server-written; RLS on, no client policies)
create table if not exists public.unknown_terms (
  term text not null,
  lang text not null default 'und' check (lang in ('th', 'en', 'mixed', 'und')),
  count integer not null default 1,
  last_seen timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'promoted', 'ignored')),
  primary key (term, lang)
);

create table if not exists public.item_signals (
  id bigint generated always as identity primary key,
  item_id uuid not null references public.discover_items(id) on delete cascade,
  type text not null check (type in ('view', 'save', 'skip', 'open')),
  tag_ids text[],                       -- no user id, by design
  created_at timestamptz not null default now()
);
create index if not exists item_signals_item_idx on public.item_signals (item_id, created_at desc);

create table if not exists public.eval_queries (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  expected_tag_ids text[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.user_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,                  -- first day of the month
  count integer not null default 0,
  primary key (user_id, month)
);

alter table public.unknown_terms enable row level security;
alter table public.item_signals enable row level security;
alter table public.eval_queries enable row level security;
alter table public.user_ai_usage enable row level security;
-- Reports already exist as public.discover_reports (supabase-discover-reports.sql); consent_events / dsar_requests come in phase 12.

-- ---------------------------------------------------------------- seeder_control: kill switch + monthly budget (phase 04 uses them)
alter table public.seeder_control
  add column if not exists kill_switch boolean not null default false,        -- stops AI image fetching AND email
  add column if not exists monthly_budget_usd numeric(8, 2) not null default 5,
  add column if not exists month_spend_usd numeric(8, 4) not null default 0,
  add column if not exists budget_month date;

-- Public read stays: policy "Public read published discover items" (status = 'published') + the CHECK above, so
-- unknown-license, 'review' and incomplete rows are never visible to anonymous reads.
