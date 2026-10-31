-- Backstory (เล่าเบื้องหลังผลงาน) lets creators attach pictures to each answer:
-- { "brief": [url…], "process": [url…], "outcome": [url…] } — public project-media URLs, max 4 per answer.
alter table anthem.projects
  add column if not exists context_images jsonb not null default '{}'::jsonb;

alter table anthem.projects
  drop constraint if exists projects_context_images_shape;
alter table anthem.projects
  add constraint projects_context_images_shape check (
    jsonb_typeof(context_images) = 'object'
    and pg_column_size(context_images) <= 8192
  );
