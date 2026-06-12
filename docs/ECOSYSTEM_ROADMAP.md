# Ecosystem Roadmap — Anthem ↔ So1o

Deferred items from the Ecosystem Master Plan (Phase 4+). Phase 1–3 implementation lives in code; apply SQL from `scripts/ecosystem/ecosystem-phase1.sql` on the unified Supabase project.

## Completed (Sprint 1–3)

- **Flywheel จ้างงาน:** Quote deep-link, `ecosystem_links`, Anthem jobs panel, hire email
- **Tier:** `pro_plus`, seats sync, realtime `user_id` filter on Anthem
- **Storage:** แยก 2 กระเป๋า (Anthem / So1o) + UI Settings + upload enforcement บน Anthem
- **Free caps + วิดีโอ:** published/draft limits, `video_urls`, editor + detail page
- **AI:** Shared credits (`ecosystem-ai-usage`, `anthem-assistant`), `AnthemAssistantFab`, `generate-contract` debit
- **LINE:** LIFF page `/line-link`, `line-link-account`, `anthem_*` notify kinds, enqueue on hire

## Phase 4 — Deferred (ทีหลัง)

| หัวข้อ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| ปิดลูปโพสต์ผลงาน | Stub | `PostToAnthemBanner` ใน Job Tracker → `/portfolio/new?from=so1o` |
| Gifts/PX cashout | ยังไม่ทำ | Stripe Connect / payout |
| Boost/โฆษณาผลงาน | ยังไม่ทำ | tier-gated |
| In-House workspace | **Shipped (MVP)** | org, invites, roles, kanban, chat, monitor — migration `inhouse-workspace.sql` |
| SSO ข้ามโดเมน | ยังไม่ทำ | parallel กับ unified `profiles` |
| ไลฟ์ทำงาน | เลื่อนออก | scope แยก |
| Escrow marketplace | ยังไม่ทำ | ชำระเงินลูกค้าผ่านแพลตฟอร์ม |
| Ecosystem auto-link Pro+ | ยังไม่ทำ | Brief จากแชท → CRM + Quote draft อัตโนมัติ |

## Deploy checklist

```bash
# Edge functions (unified project rvnzjiskqliexysicfmh)
supabase functions deploy notify-hire-request anthem-assistant ecosystem-ai-usage line-link-account line-queue-process

# SQL (manual)
psql ... -f scripts/ecosystem/ecosystem-phase1.sql
```

## Env

- `VITE_LINE_LIFF_ID` — So1o + Anthem link to `/line-link`
- Stripe lookup keys: `pro_plus_monthly`, `pro_plus_yearly`
