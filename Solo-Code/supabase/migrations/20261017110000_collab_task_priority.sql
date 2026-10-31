-- Collab board: 3-level priority per task (0 ปกติ / 1 ด่วน / 2 ด่วนมาก), shown as green / yellow / red.
alter table shared.collab_tasks
  add column if not exists priority smallint not null default 0;

alter table shared.collab_tasks
  drop constraint if exists collab_tasks_priority_check;
alter table shared.collab_tasks
  add constraint collab_tasks_priority_check check (priority between 0 and 2);
