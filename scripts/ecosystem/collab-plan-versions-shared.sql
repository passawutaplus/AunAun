-- Immutable snapshots per collab plan content version (v1 = first save, v2+ = each edit save).
-- Apply on shared schema alongside collab_plans.

create table if not exists shared.collab_plan_versions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  version integer not null check (version >= 1),
  payload jsonb not null default '{}'::jsonb,
  current_step text not null default 'align',
  status text not null default 'draft',
  acks jsonb not null default '{}'::jsonb,
  saved_by uuid,
  saved_at timestamptz not null default now(),
  unique (conversation_id, version)
);

create index if not exists collab_plan_versions_conversation_idx
  on shared.collab_plan_versions (conversation_id, version desc);

comment on table shared.collab_plan_versions is
  'Read-only snapshots of collab plan payload per version; v1 = baseline save, v2+ = each content edit.';

alter table shared.collab_plan_versions enable row level security;

revoke all on table shared.collab_plan_versions from anon;
grant select, insert on table shared.collab_plan_versions to authenticated;
grant all on table shared.collab_plan_versions to service_role;
