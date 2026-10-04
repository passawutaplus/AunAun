-- A+ Vault Engine, phase 05: new reject reasons + near-duplicate search that includes 'review' rows + tag inheritance by phash.
-- Applied 2026-10-04 as migration vault_engine_cascade. Idempotent. Apply after supabase-engine-passport.sql.

alter table public.discover_items drop constraint if exists discover_items_reject_reason_check;
alter table public.discover_items
  add constraint discover_items_reject_reason_check check (reject_reason is null or reject_reason in (
    'license_not_allowed', 'missing_attribution', 'duplicate_phash', 'below_min_resolution', 'moderation_blocked',
    'missing_image', 'download_failed', 'ai_invalid_output', 'blank_or_blurry', 'low_quality'
  ));

-- 'review' rows keep their renditions, so they count for duplicate detection too.
create or replace function public.discover_find_similar(p_phash bit(64), p_max_distance int default 6)
returns table (id uuid, distance int)
language sql
stable
set search_path = public
as $$
  select d.id, bit_count(d.phash # p_phash)::int as distance
  from public.discover_items d
  where d.phash is not null
    and d.status in ('published', 'review', 'pending', 'hidden')
    and bit_count(d.phash # p_phash) <= p_max_distance
  order by distance asc
  limit 5;
$$;
revoke all on function public.discover_find_similar(bit, int) from public, anon, authenticated;
grant execute on function public.discover_find_similar(bit, int) to service_role;

-- T1 (user items): a saved image that is a near-match of a PUBLISHED Discover image may inherit its public tags and palette.
-- Server only; the result never exposes anything that is not already public.
create or replace function public.discover_inherit_tags(p_phash bit(64), p_max_distance int default 4)
returns table (id uuid, distance int, tags_ids text[], palette jsonb)
language sql
stable
set search_path = public
as $$
  select d.id, bit_count(d.phash # p_phash)::int as distance, d.tags_ids, d.palette
  from public.discover_items d
  where d.status = 'published'
    and d.phash is not null
    and cardinality(d.tags_ids) > 0
    and bit_count(d.phash # p_phash) <= p_max_distance
  order by distance asc
  limit 1;
$$;
revoke all on function public.discover_inherit_tags(bit, int) from public, anon, authenticated;
grant execute on function public.discover_inherit_tags(bit, int) to service_role;
