-- Creators share their OWN uploaded work to Discover. Automatic checks decide (no staff picking third-party work).
-- Written by the signed-in owner (RLS); processed by the seeder with the service role; withdrawn through an RPC.
create table if not exists public.creator_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_path text not null check (asset_path like user_id::text || '/%'),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  credit_name text not null check (char_length(btrim(credit_name)) between 1 and 120),
  license text not null default 'cc-by' check (license in ('cc0', 'cc-by', 'cc-by-sa')),
  link_url text check (link_url is null or (link_url ~ '^https://' and char_length(link_url) <= 500)),
  owner_confirmed boolean not null check (owner_confirmed),
  status text not null default 'pending' check (status in ('pending', 'published', 'not_published', 'withdrawn')),
  reject_reason text,
  discover_item_id uuid references public.discover_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists creator_submissions_asset_key on public.creator_submissions (asset_path) where status <> 'withdrawn';
create index if not exists creator_submissions_user_idx on public.creator_submissions (user_id, created_at desc);
create index if not exists creator_submissions_pending_idx on public.creator_submissions (created_at) where status = 'pending';

alter table public.creator_submissions enable row level security;
revoke all on public.creator_submissions from anon, authenticated;
grant select on public.creator_submissions to authenticated;
grant insert (asset_path, title, credit_name, license, link_url, owner_confirmed, user_id) on public.creator_submissions to authenticated;
drop policy if exists creator_submissions_select_own on public.creator_submissions;
create policy creator_submissions_select_own on public.creator_submissions for select to authenticated using (user_id = auth.uid());
drop policy if exists creator_submissions_insert_own on public.creator_submissions;
create policy creator_submissions_insert_own on public.creator_submissions for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- Abuse guard: at most 10 submissions per user per day.
create or replace function public.creator_submissions_rate_guard() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.creator_submissions where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'daily submission limit reached';
  end if;
  return new;
end $$;
drop trigger if exists creator_submissions_rate_guard on public.creator_submissions;
create trigger creator_submissions_rate_guard before insert on public.creator_submissions for each row execute function public.creator_submissions_rate_guard();

-- The owner can withdraw at any time: the Discover copy is hidden at once.
create or replace function public.creator_withdraw(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_item uuid;
begin
  update public.creator_submissions set status = 'withdrawn', updated_at = now()
   where id = p_id and user_id = auth.uid() and status in ('pending', 'published', 'not_published')
   returning discover_item_id into v_item;
  if not found then raise exception 'submission not found'; end if;
  if v_item is not null then
    update public.discover_items set status = 'hidden', status_reason = 'withdrawn by creator' where id = v_item;
  end if;
end $$;
revoke all on function public.creator_withdraw(uuid) from public, anon;
grant execute on function public.creator_withdraw(uuid) to authenticated;

-- Discover rows may now come from creators.
alter table public.discover_items drop constraint if exists discover_items_source_check;
alter table public.discover_items add constraint discover_items_source_check
  check (source in ('met', 'aic', 'cma', 'si', 'chndm', 'ov', 'unsplash', 'pexels', 'creator'));
