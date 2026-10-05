-- A+ Vault Discover: "Report this image" from the detail view.
-- Guests and signed-in users may insert; nobody can read through the API (review in Supabase / service role).
-- Apply after supabase-discover-seeder.sql. Idempotent.

create table if not exists public.discover_reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.discover_items(id) on delete cascade,
  reason text not null check (reason in ('copyright', 'credit', 'offensive', 'broken', 'duplicate', 'other')),
  details text not null default '' check (char_length(details) <= 2000),
  email text check (email is null or (char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  -- Copyright claims need a way to reach the claimant.
  check (reason <> 'copyright' or email is not null)
);

create index if not exists discover_reports_open_idx
  on public.discover_reports (status, created_at desc);

alter table public.discover_reports enable row level security;

drop policy if exists "Anyone can report a published discover item" on public.discover_reports;
create policy "Anyone can report a published discover item"
  on public.discover_reports for insert to anon, authenticated
  with check (
    status = 'open'
    and (user_id is null or user_id = auth.uid())
    and exists (select 1 from public.discover_items d where d.id = item_id and d.status = 'published')
  );

grant insert (item_id, reason, details, email) on public.discover_reports to anon, authenticated;
