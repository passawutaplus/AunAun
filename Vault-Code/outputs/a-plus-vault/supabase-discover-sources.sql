-- A+ Vault Discover: more CC0 sources for the seeder.
-- Adds Cleveland Museum of Art Open Access ('cma'), Smithsonian Open Access API ('si'),
-- and Cooper Hewitt from the Smithsonian bulk dump on AWS ('chndm', no key).
-- Apply after supabase-discover-seeder.sql. Idempotent.

alter table public.discover_items drop constraint if exists discover_items_source_check;
alter table public.discover_items
  add constraint discover_items_source_check
  check (source in ('met', 'aic', 'cma', 'si', 'chndm', 'unsplash', 'pexels'));

alter table public.seed_targets drop constraint if exists seed_targets_source_check;
alter table public.seed_targets
  add constraint seed_targets_source_check
  check (source in ('met', 'aic', 'cma', 'si', 'chndm'));

-- Same categories as the Met/AIC rows. Cleveland needs no key, so its rows start enabled.
-- Smithsonian rows start disabled: set SMITHSONIAN_API_KEY on the seeder (DEMO_KEY is ~50 req/day),
-- then enable them from /admin/seeder.
insert into public.seed_targets (category, source, query, target_count, enabled) values
  ('poster',       'cma', 'poster',          200, true),
  ('poster',       'si',  'poster',          200, false),
  ('typography',   'cma', 'calligraphy',     200, true),
  ('typography',   'si',  'lettering',       200, false),
  ('illustration', 'cma', 'illustration',    200, true),
  ('illustration', 'si',  'illustration',    200, false),
  ('textile',      'cma', 'textile',         200, true),
  ('textile',      'si',  'textile',         200, false),
  ('ceramic',      'cma', 'ceramic',         200, true),
  ('ceramic',      'si',  'ceramic',         200, false),
  ('furniture',    'cma', 'chair',           200, true),
  ('furniture',    'si',  'chair',           200, false),
  ('architecture', 'cma', 'architecture',    200, true),
  ('architecture', 'si',  'architecture',    200, false),
  ('photography',  'cma', 'photograph',      200, true),
  ('photography',  'si',  'photograph',      200, false),
  ('print',        'cma', 'woodblock print', 200, true),
  ('print',        'si',  'print',           200, false),
  ('pattern',      'cma', 'pattern',         200, true),
  ('pattern',      'si',  'pattern',         200, false),
  ('poster',       'chndm', 'poster',        200, true),
  ('typography',   'chndm', 'typeface',      200, true),
  ('illustration', 'chndm', 'drawing',       200, true),
  ('textile',      'chndm', 'textile',       200, true),
  ('ceramic',      'chndm', 'ceramic',       200, true),
  ('furniture',    'chndm', 'chair',         200, true),
  ('architecture', 'chndm', 'architecture',  200, true),
  ('photography',  'chndm', 'photograph',    200, true),
  ('print',        'chndm', 'print',         200, true),
  ('pattern',      'chndm', 'sidewall',      200, true)
on conflict (category, source) do nothing;
