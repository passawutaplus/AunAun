-- A+ Vault MVP Supabase schema (applied to zkflkpbmbozrchqncpzi)
-- Storage bucket: vault-assets (private)

-- This file mirrors the deployed migration a_plus_vault_mvp_schema.
-- Use Supabase migrations for future edits instead of running this file repeatedly.

-- A+ Vault MVP Supabase schema
-- Run after creating a private storage bucket named vault-assets.

create extension if not exists "pgcrypto";

create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('image', 'video', 'link', 'note')),
  title text not null,
  note text,
  source_url text,
  asset_path text,
  thumbnail_path text,
  asset_url text,
  thumbnail_url text,
  preview_url text,
  pinned_at timestamptz,
  capture_context jsonb not null default '{}'::jsonb,
  client_payload jsonb not null default '{}'::jsonb,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_item_analysis (
  item_id uuid primary key references public.vault_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tags text[] not null default '{}',
  colors text[] not null default '{}',
  ocr_text text,
  summary text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  system boolean not null default false,
  client_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vault_collection_items (
  collection_id uuid not null references public.vault_collections(id) on delete cascade,
  item_id uuid not null references public.vault_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, item_id)
);

create table if not exists public.vault_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  client_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.vault_projects(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  width integer not null default 1440,
  height integer not null default 960,
  background text not null default '#ffffff',
  layout_mode text not null default 'smart_grid' check (layout_mode in ('smart_grid', 'freeform')),
  grid_preset text not null default 'balanced',
  gap numeric not null default 16,
  padding numeric not null default 24,
  visibility text not null default 'private' check (visibility in ('private', 'link')),
  version integer not null default 1,
  share_token uuid unique,
  share_enabled boolean not null default false,
  client_key text,
  objects_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_board_objects (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.vault_boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('item', 'text', 'palette', 'note', 'connector', 'frame', 'todo')),
  item_id uuid references public.vault_items(id) on delete set null,
  text_content text,
  colors text[] not null default '{}',
  x numeric not null default 40,
  y numeric not null default 40,
  w numeric not null default 180,
  h numeric not null default 140,
  rotation numeric not null default 0,
  z_index integer not null default 0,
  sort_order integer not null default 0,
  style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_board_shares (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.vault_boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.vault_items enable row level security;
alter table public.vault_item_analysis enable row level security;
alter table public.vault_collections enable row level security;
alter table public.vault_collection_items enable row level security;
alter table public.vault_projects enable row level security;
alter table public.vault_boards enable row level security;
alter table public.vault_board_objects enable row level security;
alter table public.vault_board_shares enable row level security;

create policy "Users can manage their own vault items" on public.vault_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own vault analysis" on public.vault_item_analysis for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own vault collections" on public.vault_collections for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own vault collection links" on public.vault_collection_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own vault projects" on public.vault_projects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own vault boards" on public.vault_boards for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own vault board objects" on public.vault_board_objects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own vault board shares" on public.vault_board_shares for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists vault_items_user_type_idx on public.vault_items (user_id, type, created_at desc);
create index if not exists vault_items_user_pinned_created_idx on public.vault_items (user_id, pinned_at desc nulls last, created_at desc);
create index if not exists vault_items_search_idx on public.vault_items using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(note, '') || ' ' || coalesce(source_url, '')));
create index if not exists vault_item_analysis_tags_idx on public.vault_item_analysis using gin (tags);
create index if not exists vault_items_capture_context_idx on public.vault_items using gin (capture_context);
create index if not exists vault_items_client_payload_idx on public.vault_items using gin (client_payload);
create index if not exists vault_collections_user_client_key_idx on public.vault_collections (user_id, client_key);
create index if not exists vault_board_objects_item_id_idx on public.vault_board_objects (item_id);
create index if not exists vault_board_objects_user_id_idx on public.vault_board_objects (user_id);
create index if not exists vault_board_objects_board_id_idx on public.vault_board_objects (board_id);
create index if not exists vault_board_shares_board_id_idx on public.vault_board_shares (board_id);
create index if not exists vault_board_shares_user_id_idx on public.vault_board_shares (user_id);
create index if not exists vault_boards_project_id_idx on public.vault_boards (project_id);
create index if not exists vault_boards_user_id_idx on public.vault_boards (user_id);
create index if not exists vault_collection_items_item_id_idx on public.vault_collection_items (item_id);
create index if not exists vault_collection_items_user_id_idx on public.vault_collection_items (user_id);
create index if not exists vault_item_analysis_user_id_idx on public.vault_item_analysis (user_id);
create index if not exists vault_items_user_id_idx on public.vault_items (user_id);
create index if not exists vault_projects_user_id_idx on public.vault_projects (user_id);

-- Private storage bucket: vault-assets.
-- Alpha bucket settings now allow image/jpeg, image/png, image/webp, video/mp4, and video/webm up to 10MB.
-- Configure storage policies in Supabase Dashboard or a dedicated storage migration.
