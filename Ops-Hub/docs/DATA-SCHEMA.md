# Ops Hub — Data Schema

โปรเจกต์ Supabase: **`rvnzjiskqliexysicfmh`**

## Schema routing

| Schema | ตารางที่ Hub ใช้ |
|--------|-------------------|
| `public` | `profiles`, `user_roles`, `support_tickets`, `feature_suggestions`, `platform_events`, `app_feedback`, `user_reports`, … |
| `anthem` | `projects`, `job_posts`, `hiring_requests`, … |
| `shared` | `cashout_requests`, `kyc_requests`, `aml_flags`, `notifications` |
| `ops` | `projects`, `cycles`, `issues`, `issue_comments`, `roadmap_items` |

## Auth

```sql
SELECT 1 FROM public.user_roles
WHERE user_id = auth.uid() AND role = 'admin';
```

## Work items (Phase 1 — aggregate)

| Source | Table | Inbox filter |
|--------|-------|--------------|
| support_ticket | `public.support_tickets` | status IN (new, in_progress, qa, resolved) |
| feature_suggestion | `public.feature_suggestions` | status IN (new, reviewing, planned) |
| app_feedback | `public.app_feedback` | status IN (new, reviewing) |
| user_report | `public.user_reports` | status IN (open, reviewing) |
| ops_issue | `ops.issues` | status NOT IN (done, cancelled) |

Client adapter: `src/lib/work-items.ts` → unified `WorkItem` type.

### Mutations (admin RLS)

| Source | Fields |
|--------|--------|
| support_tickets | status, priority, admin_note |
| feature_suggestions | status, admin_note |
| app_feedback | status, admin_note |
| user_reports | status, admin_note |
| ops.issues | status, priority, cycle_id, project_id, … |

## Native PM (Phase 2 — `ops` schema)

Migration: `Solo-Code/supabase/migrations/20260610120000_ops_hub_pm_schema.sql`

```sql
ops.projects     -- Ecosystem, So1o Platform, an1hem
ops.cycles       -- Sprint (planned/active/completed)
ops.issues       -- OPS-0001, link source_type/source_id
ops.roadmap_items
ops.issue_comments
```

### Promote RPC

```sql
SELECT public.ops_promote_work_item(
  'support_ticket',  -- source_type
  'uuid',            -- source_id
  'title',
  'description'
);
```

## Activity feed

```sql
SELECT * FROM public.platform_events
ORDER BY created_at DESC LIMIT 50;
-- admin SELECT policy via has_role(admin)
```

## Metrics (Overview — unchanged)

ดู [useHubMetrics.ts](../src/hooks/useHubMetrics.ts) สำหรับ KPI counts และ alert queue.

## Deploy migration

```bash
cd Solo-Code
export SUPABASE_ACCESS_TOKEN=sbp_...
npx supabase db push
# หรือ apply 20260610120000_ops_hub_pm_schema.sql บน dashboard
```
