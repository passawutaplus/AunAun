-- A+ Vault: moodboard schema catch-up + capture queue hardening
-- Fixes client/DB drift for standalone moodboards and service-role-only capture queue.

-- 1) Moodboard Phase 1: standalone boards + layout metadata
alter table public.vault_boards
  alter column project_id drop not null;

alter table public.vault_boards
  add column if not exists layout_mode text not null default 'smart_grid',
  add column if not exists grid_preset text not null default 'balanced',
  add column if not exists gap numeric not null default 16,
  add column if not exists padding numeric not null default 24,
  add column if not exists visibility text not null default 'private',
  add column if not exists version integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vault_boards_layout_mode_check'
  ) then
    alter table public.vault_boards
      add constraint vault_boards_layout_mode_check
      check (layout_mode in ('smart_grid', 'freeform'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'vault_boards_visibility_check'
  ) then
    alter table public.vault_boards
      add constraint vault_boards_visibility_check
      check (visibility in ('private', 'link'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'vault_boards_grid_preset_check'
  ) then
    alter table public.vault_boards
      add constraint vault_boards_grid_preset_check
      check (grid_preset in ('balanced', 'masonry', 'editorial', 'hero_support', 'contact'));
  end if;
end $$;

alter table public.vault_board_objects
  add column if not exists sort_order integer not null default 0;

do $$
begin
  alter table public.vault_board_objects drop constraint if exists vault_board_objects_kind_check;
  alter table public.vault_board_objects
    add constraint vault_board_objects_kind_check
    check (kind in ('item', 'text', 'palette', 'note', 'connector', 'frame', 'todo'));
end $$;

create index if not exists vault_boards_user_updated_idx
  on public.vault_boards (user_id, updated_at desc);

create index if not exists vault_boards_project_id_nullable_idx
  on public.vault_boards (project_id);

-- 2) Capture queue: service-role only (no client grants)
revoke all on table public.vault_extension_captures from anon, authenticated;

create index if not exists vault_extension_captures_bearer_hash_idx
  on public.vault_extension_captures (bearer_hash, created_at desc);

create index if not exists vault_extension_captures_user_id_idx
  on public.vault_extension_captures (user_id, created_at desc)
  where user_id is not null;

-- 3) Harden trigger function search_path
create or replace function public.vault_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
