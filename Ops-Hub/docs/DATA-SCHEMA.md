# Ops Hub — Data Schema

โปรเจกต์ Supabase: **`rvnzjiskqliexysicfmh`**

## Schema routing (เหมือน an1hem `db.ts`)

| Schema | ตารางที่ Hub อ่าน |
|--------|-------------------|
| `public` | `profiles`, `user_roles`, `support_tickets`, `beta_feedback`, `subscriptions` |
| `anthem` | `projects`, `studios`, `job_posts`, `hiring_requests`, `collab_requests`, `user_reports`, `app_feedback` |
| `shared` | `cashout_requests`, `kyc_requests`, `aml_flags`, `platform_events` (future feed) |

## Auth

```sql
-- ตรวจสิทธิ์ admin
SELECT 1 FROM public.user_roles
WHERE user_id = auth.uid() AND role = 'admin';

-- หรือ RPC
SELECT public.has_role(auth.uid(), 'admin');
```

## Metrics ที่ Hub ดึง (MVP)

### So1o (`public`)

| Metric | Query |
|--------|-------|
| total_users | `profiles` count |
| pro_users | `profiles` where `subscription_tier = 'pro'` |
| new_users_24h | `profiles` created_at >= now()-24h |
| open_tickets | `support_tickets` status NOT IN (closed, wont_fix) |
| early_access_pending | `tester_applications` count |
| quotations_7d | `quotations` (if accessible) or RPC |

### an1hem (`anthem` + `shared`)

| Metric | Query |
|--------|-------|
| published_projects | `projects` status = Published |
| open_jobs | `job_posts` status = open |
| pending_hiring | `hiring_requests` status = ใหม่ |
| open_reports | `user_reports` status IN (open, reviewing) |
| pending_cashouts | `cashout_requests` status = pending |
| pending_kyc | `kyc_requests` status = pending |
| open_aml | `aml_flags` status = open |

## Alert queue (รวม)

```typescript
type HubAlert = {
  id: string;
  app: "so1o" | "an1hem";
  severity: "high" | "medium";
  label: string;
  count: number;
  deepLink: string; // full URL to admin page
};
```

## Deep links

| Alert | URL |
|-------|-----|
| So1o tickets | `{SO1O}/admin?section=tickets` |
| So1o early access | `{SO1O}/admin?section=early_access` |
| an1hem KYC | `{ANTHEM}/admin/kyc` |
| an1hem AML | `{ANTHEM}/admin/aml` |
| an1hem reports | `{ANTHEM}/admin/reports` |
| an1hem cashouts | `{ANTHEM}/admin/gifts` |

## Phase 2 (optional)

- RPC `ops_hub_snapshot()` — aggregate ใน Postgres ลด round-trips
- Realtime `shared.notifications` where `kind LIKE 'admin_%'`
- `platform_events` timeline รวม
