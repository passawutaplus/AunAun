-- Extension collection sync for hosted API routes (service-role writes only).
-- Apply via Supabase migration before enabling production collection sync API.

create table if not exists public.vault_extension_collections (
  id uuid primary key default gen_random_uuid(),
  bearer_hash text not null,
  user_id uuid references auth.users(id) on delete cascade,
  client_key text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bearer_hash, client_key)
);

create index if not exists vault_extension_collections_bearer_hash_idx
  on public.vault_extension_collections (bearer_hash, created_at asc);

alter table public.vault_extension_collections enable row level security;

-- No client policies: only the server-side service role should read/write this sync table.
