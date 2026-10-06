-- Takedown support: exact-bytes hash, a block list that survives deletion, and a "blocked_image" reject reason.
alter table public.discover_items add column if not exists sha256 text;
create index if not exists discover_items_sha256_idx on public.discover_items (sha256) where sha256 is not null;

create table if not exists public.image_blocks (
  id uuid primary key default gen_random_uuid(),
  sha256 text,
  phash bit(64),
  item_id uuid,
  report_id uuid,
  reason text not null default 'takedown',
  created_at timestamptz not null default now(),
  check (sha256 is not null or phash is not null)
);
create unique index if not exists image_blocks_sha256_key on public.image_blocks (sha256) where sha256 is not null;
create unique index if not exists image_blocks_phash_key on public.image_blocks (phash) where phash is not null;
alter table public.image_blocks enable row level security;
revoke all on public.image_blocks from anon, authenticated;

-- True when the bytes are identical to a blocked image, or the perceptual hash is within p_max bits of one.
create or replace function public.image_is_blocked(p_sha text, p_phash bit, p_max integer default 5)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.image_blocks b
    where (p_sha is not null and b.sha256 = p_sha)
       or (p_phash is not null and b.phash is not null and bit_count(b.phash # p_phash) <= p_max)
  )
$$;
revoke all on function public.image_is_blocked(text, bit, integer) from public, anon, authenticated;

alter table public.discover_items drop constraint if exists discover_items_reject_reason_check;
alter table public.discover_items
  add constraint discover_items_reject_reason_check check (
    reject_reason is null or reject_reason in (
      'license_not_allowed', 'missing_attribution', 'duplicate_phash', 'below_min_resolution', 'moderation_blocked',
      'missing_image', 'download_failed', 'ai_invalid_output', 'blank_or_blurry', 'low_quality', 'blocked_image'
    )
  );

alter table public.discover_reports add column if not exists resolution_note text;
alter table public.discover_reports add column if not exists replied_at timestamptz;

-- The reports list also shows whether the reporter was told the image was removed.
create or replace function public.vault_admin_list_reports(p_status text default 'open', p_limit int default 50)
returns jsonb language plpgsql security definer set search_path = public as $$
declare lim int := greatest(1, least(coalesce(p_limit, 50), 200));
begin
  if not public.is_vault_super_admin() then raise exception 'not authorized'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (
      select r.id, r.item_id, r.reason, r.details, r.email, r.status, r.created_at, r.replied_at, r.resolution_note,
        d.title as item_title, d.status as item_status, d.source, d.source_url, d.image_sm_path
      from public.discover_reports r
      join public.discover_items d on d.id = r.item_id
      where p_status = 'all' or r.status = p_status
      order by r.created_at desc
      limit lim
    ) t
  ), '[]'::jsonb);
end $$;
