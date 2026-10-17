-- Collab tasks: optional note and reference links per task (shown as icons on the card).
alter table shared.collab_tasks
  add column if not exists note text not null default '',
  add column if not exists links text[] not null default '{}';

alter table shared.collab_tasks
  drop constraint if exists collab_tasks_note_len,
  drop constraint if exists collab_tasks_links_len;
alter table shared.collab_tasks
  add constraint collab_tasks_note_len check (char_length(note) <= 2000),
  add constraint collab_tasks_links_len check (cardinality(links) <= 10);
