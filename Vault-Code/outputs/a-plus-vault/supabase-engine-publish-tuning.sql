-- Publish thresholds tuned after real use (config/engine.json: QUALITY_PUBLISH 75 -> 70, MIN_CONFIDENT_TAGS 4 -> 3).
-- The DB constraint must match the config, otherwise a "published" decision is rejected on write.
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
      and (legacy_published or (cardinality(tags_ids) >= 3 and quality_score >= 70))
    )
  ) not valid;
alter table public.discover_items validate constraint discover_items_published_ok;
