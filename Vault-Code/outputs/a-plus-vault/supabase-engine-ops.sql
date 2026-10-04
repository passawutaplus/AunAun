-- A+ Vault Engine, phase 09: ops tables, immediate takedown, retention, trash.
-- Applied 2026-10-04 as migration vault_engine_ops. Idempotent. Apply after supabase-engine-passport.sql and supabase-discover-reports.sql.

-- ---------------------------------------------------------------- ops tables (server-written, RLS on, no client policies)
create table if not exists public.ops_events (
  id bigint generated always as identity primary key,
  kind text not null,
  severity text not null default 'info' check (severity in ('info', 'warn', 'urgent')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ops_events_created_idx on public.ops_events (created_at desc);

create table if not exists public.ops_reports (
  day date primary key,
  body jsonb not null,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.dead_letters (
  id bigint generated always as identity primary key,
  job text not null,
  payload jsonb,
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.synonym_proposals (
  id uuid primary key default gen_random_uuid(),
  term text not null check (char_length(term) between 2 and 40),
  lang text not null default 'und' check (lang in ('th', 'en', 'mixed', 'und')),
  term_id text not null,
  status text not null default 'proposed' check (status in ('proposed', 'exported', 'rejected')),
  created_at timestamptz not null default now(),
  unique (term, lang, term_id)
);

alter table public.ops_events enable row level security;
alter table public.ops_reports enable row level security;
alter table public.dead_letters enable row level security;
alter table public.synonym_proposals enable row level security;

-- ---------------------------------------------------------------- takedown: a copyright/offensive report hides the image IMMEDIATELY
create or replace function public.discover_report_takedown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reason in ('copyright', 'offensive') then
    update public.discover_items
       set status = 'hidden', status_reason = 'takedown_pending', updated_at = now()
     where id = new.item_id and status in ('published', 'review');
    insert into public.ops_events (kind, severity, detail)
    values ('takedown', 'warn', jsonb_build_object('item', new.item_id, 'reason', new.reason, 'report', new.id));
  end if;
  return new;
end;
$$;
revoke all on function public.discover_report_takedown() from public, anon, authenticated;

drop trigger if exists discover_reports_takedown on public.discover_reports;
create trigger discover_reports_takedown after insert on public.discover_reports
  for each row execute function public.discover_report_takedown();

-- ---------------------------------------------------------------- trash: soft delete with 30-day retention
alter table public.vault_items add column if not exists deleted_at timestamptz;
create index if not exists vault_items_deleted_idx on public.vault_items (deleted_at) where deleted_at is not null;

-- ---------------------------------------------------------------- retention (run daily by the seeder's Inngest job, service role)
create or replace function public.ops_run_retention()
returns jsonb
language plpgsql
set search_path = public
as $$
declare trash int; signals int; events int; letters int;
begin
  delete from public.vault_items where deleted_at is not null and deleted_at < now() - interval '30 days';
  get diagnostics trash = row_count;
  delete from public.item_signals where created_at < now() - interval '90 days';
  get diagnostics signals = row_count;
  delete from public.ops_events where created_at < now() - interval '180 days';
  get diagnostics events = row_count;
  delete from public.dead_letters where resolved_at is not null and resolved_at < now() - interval '90 days';
  get diagnostics letters = row_count;
  delete from public.ops_reports where day < current_date - 400;
  return jsonb_build_object('trash_items', trash, 'item_signals', signals, 'ops_events', events, 'dead_letters', letters);
end;
$$;
revoke all on function public.ops_run_retention() from public, anon, authenticated;
grant execute on function public.ops_run_retention() to service_role;

create or replace function public.ops_log_event(p_kind text, p_severity text default 'info', p_detail jsonb default '{}'::jsonb)
returns void
language sql
set search_path = public
as $$
  insert into public.ops_events (kind, severity, detail) values (left(p_kind, 60), case when p_severity in ('info', 'warn', 'urgent') then p_severity else 'info' end, coalesce(p_detail, '{}'::jsonb));
$$;
revoke all on function public.ops_log_event(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.ops_log_event(text, text, jsonb) to service_role;
