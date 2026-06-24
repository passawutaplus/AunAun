# Data Model

> ⚠️ **Authoritative source:** the live Supabase schema. This doc is a human map.
> Generate the latest TypeScript types with the Supabase CLI; we ship them in
> `src/integrations/supabase/types.ts` (auto-generated, do not edit).

## Major tables

### Identity & access

| Table | Purpose | RLS scope |
|---|---|---|
| `profiles` | User profile (display_name, avatar, etc.) | self read/write; admin via `has_role` |
| `user_roles` | Role assignments (`admin`, `moderator`, `user`) | self read; admin write |
| `tester_applications` | Beta tester apply queue | self write; admin read/approve |

### Money

| Table | Purpose | Notes |
|---|---|---|
| `subscriptions` | User subscriptions (plan, status) | Stripe-backed (Pro, Pro+, In-House) |
| `finance_*` | Expenses, incomes, payment methods, settings | self-scoped |
| `client_invoices` | Invoices issued to user's clients | self-scoped |

### Work

| Table | Purpose | Public-token endpoint |
|---|---|---|
| `quotations` | Quote drafts + line items | `/brief/$token` |
| `dashboard_jobs` | Job tracker | `/track/$token` |
| `dashboard_job_tasks` | Sub-tasks per job | — |
| `planner_*` | Content planner items | `/planner/$token` |
| `suppliers` | Supplier directory | `/supplier/$token` |
| `clients` | Saved client contacts | self-scoped |
| `dashboard_notes` / `dashboard_tasks` | Quick scratchpad | self-scoped |

### Editorial / public

| Table | Purpose | Public read? |
|---|---|---|
| `dashboard_daily_trends` | Editorial trends widget | ✅ intentional |
| `articles` | Blog articles | ✅ published only |
| `announcement_*` | App-wide announcements | ✅ active only |
| `auth_banners` / `dashboard_banners` | Marketing slots | ✅ |

### Telemetry / feedback

| Table | Purpose |
|---|---|
| `beta_feedback` | In-app feedback |
| `device_metrics` | Anonymous device stats |
| `feature_usage` | Per-feature counters |
| `activity_log` | User actions audit |

### Admin

| Table | Purpose | Access |
|---|---|---|
| `hq_agents` | HQ AI agent configs | admin-only by design |
| `admin_audit_log` | Admin actions trail | admin-only |

## Realtime topics

| Topic pattern | Used by |
|---|---|
| `track-<uuid>` | `/track/$token` live job updates |
| `job-<uuid>` | Job collaborator presence |
| `planner-<uuid>` | Planner board |
| `planner-approvals-<uuid>` | Planner approval flow |

Topic parsing in policies uses `substring(topic FROM N)` (UUIDs contain hyphens — `split_part` breaks them).

## Key relationships

```
auth.users (Supabase managed)
  └─ profiles.id (1:1)
       ├─ user_roles.user_id (1:N)
       ├─ subscriptions.user_id (1:1)
       ├─ quotations.user_id (1:N)
       │    └─ quotation_items (1:N)
       ├─ dashboard_jobs.user_id (1:N)
       │    └─ dashboard_job_tasks (1:N)
       ├─ clients.user_id (1:N)
       │    └─ client_invoices.client_id (1:N)
       ├─ finance_expenses.user_id (1:N)
       └─ planner_items.user_id (1:N)
```

## Public-token contract

Several routes expose data via a UUID token without auth (`/brief`, `/track`, `/planner`, `/supplier`, `/vision`). Rules:

- Token is a v4 UUID stored on the parent row.
- RLS policy: `USING (token::text = current_setting('request.headers')::json->>'x-token')` or equivalent.
- Token MUST be opaque (no info leak), single-purpose, revocable.
- Public token endpoints expose **read-only** subset; never mutate state from the token.
