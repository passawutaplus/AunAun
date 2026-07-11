-- Extension capture queue for hosted API routes (service-role writes only).
-- Apply via Supabase migration before enabling production capture API.

create table if not exists public.vault_extension_captures (
  id uuid primary key default gen_random_uuid(),
  object_id text not null unique,
  item jsonb not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists vault_extension_captures_created_at_idx
  on public.vault_extension_captures (created_at desc);

alter table public.vault_extension_captures enable row level security;

-- No client policies: only the server-side service role should read/write this queue.

-- Applied 2026-07-10 via vault_moodboard_and_capture_hardening:
-- revoke all on table public.vault_extension_captures from anon, authenticated;
-- indexes on bearer_hash / user_id
