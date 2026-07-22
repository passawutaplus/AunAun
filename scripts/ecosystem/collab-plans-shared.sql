-- Shared collab pipeline plan (both chat parties can edit notes).
-- Applied remotely as collab_plans_shared_workspace (no FK: conversations has no PK).

create table if not exists shared.collab_plans (
  conversation_id uuid primary key,
  stages jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table shared.collab_plans is 'Joint collab pipeline notes per conversation; editable by both participants.';
comment on column shared.collab_plans.stages is 'Map of stage id -> { done: boolean, note: text }';

alter table shared.collab_plans enable row level security;

revoke all on table shared.collab_plans from anon;
grant select, insert, update on table shared.collab_plans to authenticated;
grant all on table shared.collab_plans to service_role;
