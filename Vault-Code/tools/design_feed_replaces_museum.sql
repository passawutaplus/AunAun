-- Design Feed replaces Museum (run in Supabase SQL editor). DESTRUCTIVE: deletes the Museum catalog.
begin;

delete from public.item_signals where item_id in (select id from public.discover_items);
delete from public.discover_items;

alter table public.discover_items drop constraint if exists discover_items_published_ok;
alter table public.discover_items drop constraint if exists discover_items_source_check;

alter table public.discover_items add constraint discover_items_source_check
  check (source = any (array['met','aic','cma','si','chndm','ov','unsplash','pexels','creator','feed']));

-- Published Design Feed items must always carry credit, an https source link and an https image.
alter table public.discover_items add constraint discover_items_published_ok
  check (
    status <> 'published'
    or (
      char_length(btrim(attribution)) > 0
      and source_url ~ '^https://'
      and original_image_url ~ '^https://'
      and image_sm_path ~ '^https://'
      and image_md_path ~ '^https://'
      and image_lg_path ~ '^https://'
      and delivery_mode = 'hotlink'
    )
  );

drop table if exists public.design_feed_items;

update public.seed_targets set enabled = false;
update public.seeder_control set paused = true;

commit;
