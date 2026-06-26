# Anthem (1px) — Full Test Plan

แผนเทสครบวงจรสำหรับ **an1hem / 1px** marketplace

**Manual (ต้องลงมือ):** [`../../docs/MANUAL-TESTING.md`](../../docs/MANUAL-TESTING.md)  
**Automated gate:** `npm run test:gate` หรือ `../../scripts/test-ecosystem.sh`

**เอกสาร:** [`qa-checklist.md`](./qa-checklist.md) · [`test-accounts.md`](./test-accounts.md) · [`e2e-playwright.md`](./e2e-playwright.md) · [`e2e-puppeteer.md`](./e2e-puppeteer.md)

---

## สรุปผลรันล่าสุด

| ชั้น | คำสั่ง | ผล |
|------|--------|-----|
| Unit (Vitest) | `npm run test` | ✅ 12 files, 61 tests |
| Public smoke (curl) | `BASE_URL=https://aplus1-demo.vercel.app npm run smoke:public` | ✅ |
| Puppeteer smoke | `npm run e2e:puppeteer:smoke` | ต้อง Chrome + libs |
| Puppeteer chat | `npm run e2e:puppeteer:chat` | demo account บน demo URL |
| Playwright | `npm run e2e:smoke` | ต้อง OS รองรับ |

---

## Phase 0 — เตรียม (~30 นาที)

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:8080` |
| Demo | `https://aplus1-demo.vercel.app` |
| Production | `https://an1hem.app` |

```bash
cd Anthem-Code
npm install
npx playwright install chromium   # optional
cp .env.example .env.local        # E2E_* + VITE_*
```

บัญชี: [`test-accounts.md`](./test-accounts.md)

---

## Phase 1 — Automated gate

```bash
npm run test
npm run smoke:public
E2E_BASE_URL=https://aplus1-demo.vercel.app npm run smoke:public
npm run e2e:puppeteer:smoke
npm run e2e:puppeteer:chat      # demo chat บน demo URL
npm run e2e                     # Playwright full (ถ้ารองรับ)
```

---

## Phase 2 — Auth & guards (manual)

ใช้ matrix ใน `test-accounts.md`:

- Guest → `/chat`, `/portfolio/manage` → `/auth`
- User → portfolio, project editor, chat, earnings
- Admin → `/admin/*`
- User → `/admin` → redirect `/` (ไม่ใช่ admin)

---

## Phase 3 — Public & feed

- [ ] `/` feed โหลด
- [ ] `/jobs`, `/advertise`, `/research`
- [ ] `/legal/*`
- [ ] `/@username` public profile
- [ ] `/project/:id` published vs draft (RLS)
- [ ] `/studio/:slug`

---

## Phase 4 — Core flows (manual ~2 วัน)

| โดเมน | สิ่งที่เทส |
|-------|-----------|
| Portfolio | สร้าง/แก้/ลบ project, publish, gallery |
| Chat | inbox, thread, ส่งข้อความ, pin, กลุ่ม |
| Jobs | โพสต์, apply, match |
| Hiring / Collab | request flow |
| Wallet / Earnings | balance, cashout |
| Contracts | generate, sign |
| Studio | สร้าง, invite member, manage |
| Collections | สร้าง, เพิ่มงาน |
| Settings / Verify | profile, email verify |
| Report / Feedback | Flag, `/me/reports`, `/me/feedback` |

ทุก flow: สร้าง → refresh → ยังอยู่; User A ไม่เห็น wallet ของ User B

## Phase 5b — Notifications (email + LINE)

- [ ] `npm run email:preview` — ตรวจ templates ครบ 9 ชนิด
- [ ] Hire / gift / follow → email + LINE + in-app ที่ผู้รับ
- [ ] Settings → ปิด `notify_hire` → ไม่ได้ email
- [ ] LINE connect `/line-link` + test samples จาก Settings
- [ ] Job match → `job-match-dispatch` notification

---

## Phase 6 — Admin (manual)

- [ ] `/admin` overview + nav ทุกหน้า
- [ ] users, projects, reports, feedback, audit
- [ ] batch actions, CSV export

---

## Phase 7 — Cross-platform

Browsers + viewports ตาม `qa-checklist.md` — **iPhone จริง** สำหรับ chat + upload

---

## Phase 8 — Security + Perf

- Security smoke จาก checklist (service_role, RLS, open redirect)
- Lighthouse mobile ≥ 70, desktop ≥ 90
- axe accessibility

---

## Phase 9 — Sign-off

- Automated gate ผ่าน
- Blocker/Critical = 0
- qa-checklist.md ครบ
- Chat + wallet RLS ผ่าน

---

## แผน 4 วัน

| วัน | งาน |
|-----|-----|
| Day 1 | Phase 1 auto + Phase 2 auth + Phase 3 public |
| Day 2 | Portfolio + Jobs + Chat |
| Day 3 | Wallet, contracts, studio, report/feedback |
| Day 4 | Admin + cross-platform + security/sign-off |

---

## คำสั่งด่วน

```bash
npm run dev
npm run test
BASE_URL=https://aplus1-demo.vercel.app npm run smoke:public
E2E_BASE_URL=https://aplus1-demo.vercel.app npm run e2e:puppeteer:chat
npm run e2e:puppeteer:smoke
```
