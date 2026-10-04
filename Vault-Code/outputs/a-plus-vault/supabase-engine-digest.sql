-- A+ Vault Engine, phase 08: weekly digest opt-in/out (DRY RUN only; nothing sends email yet).
-- Applied 2026-10-04 as migration vault_engine_digest. Idempotent.
-- opted_in defaults to false: the digest is marketing-type mail, so it needs explicit consent (phase 12 records it).

create table if not exists public.digest_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  opted_in boolean not null default false,
  opted_in_at timestamptz,
  unsubscribed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.digest_prefs enable row level security;

drop policy if exists "Users read own digest prefs" on public.digest_prefs;
create policy "Users read own digest prefs" on public.digest_prefs for select to authenticated using (user_id = auth.uid());

-- Opt-in/out through these functions only (no direct client writes).
create or replace function public.digest_set_opt_in(p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.digest_prefs (user_id, opted_in, opted_in_at, unsubscribed_at, updated_at)
  values (auth.uid(), p_on, case when p_on then now() end, case when p_on then null else now() end, now())
  on conflict (user_id) do update
    set opted_in = excluded.opted_in,
        opted_in_at = case when excluded.opted_in then now() else public.digest_prefs.opted_in_at end,
        unsubscribed_at = case when excluded.opted_in then null else now() end,
        updated_at = now();
end;
$$;
revoke all on function public.digest_set_opt_in(boolean) from public, anon;
grant execute on function public.digest_set_opt_in(boolean) to authenticated;

-- Called by api/unsubscribe.js with the service role after the signed token is verified.
create or replace function public.digest_unsubscribe(p_user uuid)
returns void
language sql
set search_path = public
as $$
  insert into public.digest_prefs (user_id, opted_in, unsubscribed_at, updated_at)
  values (p_user, false, now(), now())
  on conflict (user_id) do update set opted_in = false, unsubscribed_at = now(), updated_at = now();
$$;
revoke all on function public.digest_unsubscribe(uuid) from public, anon, authenticated;
grant execute on function public.digest_unsubscribe(uuid) to service_role;
