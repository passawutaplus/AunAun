-- Project context template (บริบทผลงาน) — anthem.projects / public.projects
-- Safe to re-run. Apply on shared Supabase if editor saves context but detail/edit show empty.

alter table if exists public.projects
  add column if not exists brief text,
  add column if not exists creator_role text,
  add column if not exists process_note text,
  add column if not exists deliverables text,
  add column if not exists duration_label text,
  add column if not exists outcome_note text,
  add column if not exists opportunity_types text[] default '{}',
  add column if not exists opportunity_note text;

-- Anthem schema mirror (when projects live in anthem schema)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'anthem' and table_name = 'projects'
  ) then
    alter table anthem.projects
      add column if not exists brief text,
      add column if not exists creator_role text,
      add column if not exists process_note text,
      add column if not exists deliverables text,
      add column if not exists duration_label text,
      add column if not exists outcome_note text,
      add column if not exists opportunity_types text[] default '{}',
      add column if not exists opportunity_note text;
  end if;
end $$;
