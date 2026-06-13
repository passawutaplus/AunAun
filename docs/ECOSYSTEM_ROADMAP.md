# Ecosystem Roadmap — Anthem ↔ So1o

Deferred items from the Ecosystem Master Plan (Phase 4+). Phase 1–3 implementation lives in code; apply SQL from `scripts/ecosystem/ecosystem-phase1.sql` on the unified Supabase project.

## Completed (Sprint 1–3)

- **Flywheel จ้างงาน:** Quote deep-link, `ecosystem_links`, Anthem jobs panel, hire email
- **Tier:** `pro_plus`, seats sync, realtime `user_id` filter on Anthem
- **Storage:** แยก 2 กระเป๋า (Anthem / So1o) + UI Settings + upload enforcement บน Anthem
- **Free caps + วิดีโอ:** published/draft limits, `video_urls`, editor + detail page
- **AI:** Shared credits (`ecosystem-ai-usage`, `anthem-assistant`), `AnthemAssistantFab`, `generate-contract` debit
- **LINE:** LIFF page `/line-link`, `line-connect`, `anthem_*` + `inhouse_*` notify kinds, enqueue on hire
- **Stripe PX:** top-up (`px_*` lookup keys) + Connect cashout workflow
- **Notifications:** email templates + `notify-anthem*` edge functions

## Phase 4 — Deferred (ทีหลัง)

| หัวข้อ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| ปิดลูปโพสต์ผลงาน | Stub | `PostToAnthemBanner` ใน Job Tracker → `/portfolio/new?from=so1o` |
| Boost/โฆษณาผลงาน | ยังไม่ทำ | tier-gated |
| SSO ข้ามโดเมน | ยังไม่ทำ | parallel กับ unified `profiles` |
| ไลฟ์ทำงาน | เลื่อนออก | scope แยก |
| Escrow marketplace | ยังไม่ทำ | ชำระเงินลูกค้าผ่านแพลตฟอร์ม |
| Ecosystem auto-link Pro+ | ยังไม่ทำ | Brief จากแชท → CRM + Quote draft อัตโนมัติ |
| In-House workspace | **Shipped (MVP)** | org, invites, roles, kanban, chat, monitor — `inhouse-workspace.sql` |
| Gifts/PX cashout | **Shipped** | Stripe Connect + admin transfer — ดู `aml-compliance.md` |

## Deploy checklist

```bash
cd Solo-Code
export SUPABASE_ACCESS_TOKEN=sbp_...

# Notify + LINE
supabase functions deploy \
  notify-anthem notify-anthem-chat notify-anthem-collab notify-hire-request \
  job-match-dispatch line-connect line-webhook line-queue-process \
  --project-ref rvnzjiskqliexysicfmh

# AI + ecosystem
supabase functions deploy anthem-assistant ecosystem-ai-usage generate-contract \
  --project-ref rvnzjiskqliexysicfmh

# SQL (manual if needed)
# scripts/ecosystem/ecosystem-phase1.sql
# scripts/ecosystem/stripe-payments.sql
# scripts/ecosystem/inhouse-workspace.sql
```

## Env

- `VITE_LINE_LIFF_ID` + `VITE_LINE_CHANNEL_ID` — So1o + Anthem link to `/line-link`
- Stripe lookup keys: `pro_plus_monthly`, `pro_plus_yearly`, `inhouse_monthly`, `px_500`, `px_2000`, `px_10000`

## เอกสารที่เกี่ยวข้อง

- [ecosystem-notifications.md](./ecosystem-notifications.md)
- [Solo-Code/docs/stripe.md](../Solo-Code/docs/stripe.md)
