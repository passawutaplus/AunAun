# Marketing — migration & ops

Migration files:
- `Solo-Code/supabase/migrations/20260702120000_kuy_radar_core.sql`
- `Solo-Code/supabase/migrations/20260703120000_marketing_internal_signals.sql`

**สถานะ (2026-07-02):** `kuy_radar_core` นำขึ้น production แล้วบน `zkflkpbmbozrchqncpzi`

## RLS / admin check

ใช้ `public.has_role(auth.uid(), 'admin')` — **ไม่ใช่** `is_admin_user()` (ไม่มีบน unified project)

## Tables (shared schema)

- `kuy_businesses`, `kuy_keywords`, `kuy_leads`, `kuy_competitors`, `kuy_content_items`
- `kuy_insights`, `kuy_campaigns`, `kuy_outreach_messages`, `kuy_reports`, `kuy_settings`
- `kuy_export_audit_log`

`kuy_leads.lead_origin` — `external` (default) หรือ `internal` (in-app signals)

## RPCs

- `kuy_log_export` — export audit + `log_admin_audit` for admins
- `kuy_delete_business_data` — PDPA delete path
- `kuy_seed_demo_business` — demo seed for leads/competitors
- `marketing_sync_internal_signals` — upsert in-app signals → `kuy_leads`

## Edge functions

- `marketing-ai` — admin-only Gemini insights (no user quota)
- `marketing-outreach` — admin-only in-app notifications (+ audit)

## Push migration (ครั้งถัดไป)

```bash
./scripts/check-migrations-pending.sh
cd Solo-Code && ./scripts/supabase-push-via-api.sh
```

## Local dev without migration

UI falls back to `localStorage` (`marketing-local-v1`) when tables are missing.

## Env

- `VITE_MARKETING_AI_MOCK=true` — mock AI (dev default)
- `VITE_MARKETING_AI_MOCK=false` — เรียก `marketing-ai` edge function
- fallback ชั่วคราว: `VITE_KUY_RADAR_AI_MOCK`

## Routes

| Path | หน้าที่ |
|------|---------|
| `/admin/marketing` | Overview (platform KPIs + pipeline) |
| `/admin/marketing/setup` | Business setup |
| `/admin/marketing/signals` | In-app signals + Sync to pipeline |
| `/admin/marketing/leads` | Leads (filter In-app / External) |
| `/admin/marketing/competitors` | Competitor intel |
| `/admin/marketing/content` | Content intel |
| `/admin/marketing/insights` | AI insights |
| `/admin/marketing/ads` | Ad ideas |
| `/admin/marketing/offers` | Offer + referral copy |
| `/admin/marketing/planner` | Campaign planner |
| `/admin/marketing/outreach` | Outreach (internal in-app / external draft) |
| `/admin/marketing/reports` | Reports + export |
| `/admin/marketing/settings` | Settings + delete data |
| `/admin/marketing/manual` | Bilingual manual |

Redirect: `/admin/kuy-radar/*` → `/admin/marketing/*`

Sidebar + overview ใช้ config เดียว: `src/lib/admin/adminNavigation.ts`

## Manual QA

- `/admin/marketing` loads + sidebar **Marketing**
- `/admin/kuy-radar/leads` redirects to `/admin/marketing/leads`
- Overview แสดงตัวเลขแพลตฟอร์มจริง (ไม่ใช่ demo 428/186 บน production)
- Signals → Sync to pipeline → ปรากฏใน Leads แท็บ In-app
- AI insight (`VITE_MARKETING_AI_MOCK=false` on staging)
- Internal outreach → notification ปรากฏ
- Export + compliance ยังทำงาน (internal links redacted)
- Do not touch Ops Hub
