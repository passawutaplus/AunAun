-- A+ Vault Discover: allow open licenses beyond CC0 (Public Domain Mark, CC BY, CC BY-SA).
-- NC/ND are NOT allowed. CC BY / BY-SA rows must carry an https license_url (credit is a legal condition).
-- Apply after supabase-discover-openverse.sql. Idempotent. Then re-run supabase-admin-sources.sql (violation check changed).

do $$
declare c record;
begin
  -- The original "published" check is unnamed: find it by its definition and replace it.
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
    )
  ) not valid;
alter table public.discover_items validate constraint discover_items_published_ok;
