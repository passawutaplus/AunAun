-- External links on portfolio projects (prototype, shop, etc.)
alter table if exists public.projects
  add column if not exists external_links jsonb not null default '[]'::jsonb;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'anthem' and table_name = 'projects'
  ) then
    alter table anthem.projects
      add column if not exists external_links jsonb not null default '[]'::jsonb;
  end if;
end $$;
