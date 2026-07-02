# Kuy Radar — migration & ops

Migration file: `Solo-Code/supabase/migrations/20260702120000_kuy_radar_core.sql`

**สถานะ (2026-07-02):** นำขึ้น production แล้วบน `zkflkpbmbozrchqncpzi` (version `20260702102813`)

## RLS / admin check

ใช้ `public.has_role(auth.uid(), 'admin')` — **ไม่ใช่** `is_admin_user()` (ไม่มีบน unified project)

## Tables (shared schema)

- `kuy_businesses`, `kuy_keywords`, `kuy_leads`, `kuy_competitors`, `kuy_content_items`
- `kuy_insights`, `kuy_campaigns`, `kuy_outreach_messages`, `kuy_reports`, `kuy_settings`
- `kuy_export_audit_log`

## RPCs

- `kuy_log_export` — export audit + `log_admin_audit` for admins
- `kuy_delete_business_data` — PDPA delete path
- `kuy_seed_demo_business` — demo seed for leads/competitors

## Push migration (ครั้งถัดไป)

```bash
./scripts/check-migrations-pending.sh
cd Solo-Code && ./scripts/supabase-push-via-api.sh
```

## Local dev without migration

UI falls back to `localStorage` (`kuy-radar-local-v1`) when tables are missing.

## Env

- `VITE_KUY_RADAR_AI_MOCK=true` (default) — mock AI via `src/lib/kuy-radar/prompts.ts`

## Routes

| Path | หน้าที่ |
|------|---------|
| `/admin/kuy-radar` | Overview |
| `/admin/kuy-radar/setup` | Business setup |
| `/admin/kuy-radar/leads` | Lead radar |
| `/admin/kuy-radar/competitors` | Competitor intel |
| `/admin/kuy-radar/content` | Content intel |
| `/admin/kuy-radar/insights` | AI insights |
| `/admin/kuy-radar/ads` | Ad ideas |
| `/admin/kuy-radar/offers` | Offer builder |
| `/admin/kuy-radar/planner` | Campaign planner |
| `/admin/kuy-radar/outreach` | Outreach drafts |
| `/admin/kuy-radar/reports` | Reports + export |
| `/admin/kuy-radar/settings` | Settings + delete data |
| `/admin/kuy-radar/manual` | Bilingual manual |

Sidebar + overview ใช้ config เดียว: `src/lib/admin/adminNavigation.ts`

## Manual QA

- `/admin/kuy-radar` loads + sidebar **Kuy Radar** (กลุ่ม ศูนย์บัญชาการ)
- Create business → import lead → filter/status → export (compliance checkbox)
- TH/EN toggle, dark mode (`.kuy-radar` theme)
- Delete business data in Settings
- Do not touch Ops Hub

## Health check (2026-07-02)

| Check | ผล |
|-------|-----|
| `npm run build` | ผ่าน |
| `npm run test` | 129/129 |
| `smoke-public.sh` (production) | ผ่าน |
| Migration remote | ผ่าน |
