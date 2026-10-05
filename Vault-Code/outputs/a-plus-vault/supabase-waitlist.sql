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
