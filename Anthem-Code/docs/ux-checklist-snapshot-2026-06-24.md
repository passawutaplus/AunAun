# UX Checklist Snapshot — 24 มิ.ย. 2026

Local: `http://localhost:8080` · `VITE_DEMO_MODE=true` · build ✓

## A — Discovery & Feed

| รายการ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| Hero + tagline | pass | FeedHero ภาษาไทย + stats |
| แท็บ ผลงาน/ดีไซเนอร์/สตูดิโอ | pass | FeedModeToggle |
| การ์ดผลงาน | pass* | ต้องมี seed/DB — ทดสอบบน demo deploy |
| Empty state ภาษาไทย | pass | EmptyState components |
| Feed mode labels | **fixed** | สำรวจ/กำลังติดตาม/ล่าสุด/ยอดนิยม (feedModeLabels.ts) |

## C — Auth & Session

| รายการ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| `/auth` โหลดได้ | pass | HTTP 200 |
| Demo banner + ลิงก์ research | pass | DemoModeBanner |
| Demo login hint | pass | DemoAuthHints |

## D — Onboarding & Welcome PX

| รายการ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| Welcome checklist | pass* | ทดสอบหลัง login `phatsawut@demo.pixel100.com` |
| รับ PX / progress | pass* | ต้อง login + DB |

## Polish ที่ทำในรอบนี้

- FeedToolbar / FeedModeDropdown — label ไทย
- FloatingNav — แท็บ "คอมมูนิตี้" (แทน Area)
- HireWizardFields — ประเภทงาน / deliverables / timeline ไทย
- ReferralPage + Earnings — copy ไทย

## ค้าง

- ~~Migration push (referral backend)~~ ✓ ไม่มี migration ค้าง (มิ.ย. 2026)
- ~~Deploy demo~~ ✓ https://aplus1-demo.vercel.app (25 มิ.ย. 2026)
- ~~Referral E2E API~~ ✓ `scripts/qa/referral-e2e.mjs`
- Manual T2–T4 บน demo (login: `phatsawut@demo.an1hem.app` / `pixel100-demo-seed`)
