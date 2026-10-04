-- A+ Vault Engine, phase 12: consent log + data-subject requests. Applied 2026-10-04 as migration vault_engine_privacy. Idempotent.

create table if not exists public.consent_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  anon_id text,
  purpose text not null check (purpose in ('ai_private_tagging', 'analytics', 'marketing_email')),
  granted boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now(),
  check (user_id is not null or anon_id is not null)
);
create index if not exists consent_events_user_idx on public.consent_events (user_id, purpose, created_at desc);
alter table public.consent_events enable row level security;
-- Append-only: nobody can update or delete through the API.
drop policy if exists "Users read own consent events" on public.consent_events;
create policy "Users read own consent events" on public.consent_events for select to authenticated using (user_id = auth.uid());

-- Latest choice per purpose for the signed-in user.
create or replace function public.consent_current()
returns table (purpose text, granted boolean, policy_version text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (c.purpose) c.purpose, c.granted, c.policy_version, c.created_at
  from public.consent_events c
  where c.user_id = auth.uid()
  order by c.purpose, c.created_at desc;
$$;
revoke all on function public.consent_current() from public, anon;
grant execute on function public.consent_current() to authenticated;

-- Record a choice (signed-in users). Marketing email also keeps digest_prefs in sync.
create or replace function public.log_consent(p_purpose text, p_granted boolean, p_policy_version text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_purpose not in ('ai_private_tagging', 'analytics', 'marketing_email') then raise exception 'unknown purpose'; end if;
  insert into public.consent_events (user_id, purpose, granted, policy_version) values (auth.uid(), p_purpose, p_granted, left(p_policy_version, 40));
  if p_purpose = 'marketing_email' then perform public.digest_set_opt_in(p_granted); end if;
end;
$$;
revoke all on function public.log_consent(text, boolean, text) from public, anon;
grant execute on function public.log_consent(text, boolean, text) to authenticated;

-- Server-side check used before any AI call on a user's private image (default OFF).
create or replace function public.consent_granted(p_user uuid, p_purpose text)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((select c.granted from public.consent_events c where c.user_id = p_user and c.purpose = p_purpose order by c.created_at desc limit 1), false);
$$;
revoke all on function public.consent_granted(uuid, text) from public, anon, authenticated;
grant execute on function public.consent_granted(uuid, text) to service_role;

create table if not exists public.dsar_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text check (email is null or char_length(email) <= 200),
  type text not null check (type in ('access', 'delete', 'rectify', 'object', 'restrict', 'withdraw', 'complaint')),
  details text not null default '' check (char_length(details) <= 4000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'rejected')),
  created_at timestamptz not null default now(),
  due_at timestamptz not null default (now() + interval '30 days'),
  resolved_at timestamptz
);
create index if not exists dsar_requests_open_idx on public.dsar_requests (status, due_at);
alter table public.dsar_requests enable row level security;
drop policy if exists "Users read own requests" on public.dsar_requests;
create policy "Users read own requests" on public.dsar_requests for select to authenticated using (user_id = auth.uid());
-- Inserts happen through api/privacy-request.js (service role, rate limited), never directly from the browser.
