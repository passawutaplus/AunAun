-- A+ Vault pre-launch waitlist. Written only by the /api/waitlist function (service role); no client access.
create table if not exists public.vault_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and length(email) <= 200),
  source text not null default 'welcome',
  consent boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists vault_waitlist_email_key on public.vault_waitlist (email);
alter table public.vault_waitlist enable row level security;
revoke all on public.vault_waitlist from anon, authenticated;
comment on table public.vault_waitlist is 'Pre-launch waitlist emails (consent given at sign-up). Delete on request via the privacy form.';

-- Public headcount for the welcome page (no emails leave the database).
create or replace function public.vault_waitlist_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$ select count(*) from public.vault_waitlist $$;
revoke all on function public.vault_waitlist_count() from public, anon, authenticated;
