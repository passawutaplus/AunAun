-- A+ Vault Discover: Openverse source ('ov'), CC0 only, curated institutions (see seeder/src/seeder/adapters/ov.ts).
-- Apply after supabase-discover-sources.sql. Idempotent. Not applied automatically.

alter table public.discover_items drop constraint if exists discover_items_source_check;
alter table public.discover_items
  add constraint discover_items_source_check
  check (source in ('met', 'aic', 'cma', 'si', 'chndm', 'ov', 'unsplash', 'pexels'));

alter table public.seed_targets drop constraint if exists seed_targets_source_check;
alter table public.seed_targets
  add constraint seed_targets_source_check
  check (source in ('met', 'aic', 'cma', 'si', 'chndm', 'ov'));

-- Anonymous Openverse limit is ~200 requests/day: rows start disabled, enable a few from /admin/seeder.
insert into public.seed_targets (category, source, query, target_count, enabled) values
  ('poster',       'ov', 'poster',       100, false),
  ('typography',   'ov', 'calligraphy',  100, false),
  ('illustration', 'ov', 'illustration', 100, false),
  ('pattern',      'ov', 'pattern',      100, false),
  ('print',        'ov', 'woodblock',    100, false)
on conflict (category, source) do nothing;
