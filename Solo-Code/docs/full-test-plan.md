# Solo-Code — Full Test Plan (เทสจัดเต็ม)

แผนเทสครบวงจรสำหรับ **So1o Freelancer Management** — ใช้ก่อน release หรือ QA engagement

**Manual (ต้องลงมือ):** [`../../docs/MANUAL-TESTING.md`](../../docs/MANUAL-TESTING.md)  
**Automated gate:** `npm run test:gate` หรือ `../../scripts/test-ecosystem.sh`

**เอกสารที่เกี่ยวข้อง:** [`qa-checklist.md`](./qa-checklist.md) · [`test-accounts.md`](./test-accounts.md) · [`../../docs/e2e-guide.md`](../../docs/e2e-guide.md)

---

## สรุปผลรันล่าสุด (อัปเดตเมื่อรัน)

| ชั้น | คำสั่ง | ผล (รันใน repo) |
|------|--------|----------------|
| Unit (Vitest) | `npm run test` | ✅ 10 files, 60 tests |
| Public smoke (curl) | `BASE_URL=https://solofreelancer.com npm run smoke:public` | ✅ |
| Puppeteer smoke | `npm run e2e:puppeteer:smoke` | ต้อง `install-chrome-deps.sh` ก่อน (WSL) |
| Playwright smoke | `npm run e2e:smoke` | ต้อง OS ที่ Playwright รองรับ |
| Playwright E2E | `npm run e2e` | ต้องมี `E2E_*` ใน `.env.local` + Playwright browsers |
| Production build | `NODE_OPTIONS=--max-old-space-size=8192 npm run build:lovable` | ✅ client + SSR built |

---

## Phase 0 — เตรียมก่อนเทส (~30 นาที)

### Environment

| ลำดับ | URL | ใช้เมื่อ |
|-------|-----|---------|
| Local | `http://localhost:5173` | dev + E2E autostart |
| Preview | ดู [`pentest-scope.md`](./pentest-scope.md) | QA ก่อน release |
| Production | `https://solofreelancer.com` | smoke หลัง deploy เท่านั้น |

### บัญชีทดสอบ (ต้องมีก่อน Phase 2+)

สร้างตาม [`test-accounts.md`](./test-accounts.md) แล้วใส่ใน `.env.local` (ห้าม commit):

```bash
E2E_USER_EMAIL=test+usera@...
E2E_USER_PASSWORD=...
E2E_USERB_EMAIL=test+userb@...
E2E_USERB_PASSWORD=...
E2E_ADMIN_EMAIL=test+admin@...
E2E_ADMIN_PASSWORD=...
E2E_UNVERIFIED_EMAIL=test+unverified@...
E2E_UNVERIFIED_PASSWORD=...
```

### ติดตั้งครั้งแรก

```bash
cd Solo-Code
npm install
npx playwright install --with-deps chromium   # สำหรับ E2E
cp .env.example .env.local   # เติม E2E + keys ตามต้องการ
```

---

## Phase 1 — Automated gate (~15 นาที)

รันทุกครั้งก่อน manual QA:

```bash
npm run test              # Vitest — 49 unit tests
npm run smoke:public      # curl smoke (หรือ BASE_URL=... npm run smoke:public)
npm run e2e:puppeteer:smoke # Puppeteer — ดู docs/e2e-guide.md
npm run e2e:smoke         # Playwright public routes (ถ้า OS รองรับ)
```

E2E ที่ต้อง login:

```bash
npm run e2e               # auth + admin guard
npm run e2e:ui            # debug mode
```

**Pass:** ทุกคำสั่ง exit 0

---

## Phase 2 — Auth & route guards (manual ~1–2 ชม.)

Login ทุก role แล้วเช็คทีละ route:

| Route | Guest | Unverified | User | Admin |
|-------|:-----:|:----------:|:----:|:-----:|
| `/` | ✅ | ✅ | ✅ | ✅ |
| `/auth` | ✅ | → apply | → dashboard | → dashboard |
| `/apply` | ✅ | ✅ | ✅ | ✅ |
| `/dashboard` | → auth | → apply | ✅ | ✅ |
| `/admin` | → auth | → apply | → dashboard | ✅ |
| `/pricing`, `/blog` | ✅ | ✅ | ✅ | ✅ |
| `/terms`, `/privacy`, `/cookies` | ✅ | ✅ | ✅ | ✅ |
| `/track/:token` (valid) | ✅ | ✅ | ✅ | ✅ |
| `/track/:token` (invalid) | empty/404 | | | |
| `/brief/:token` | ✅ public | | | |
| `/supplier/:token` | ✅ public | | | |
| `/license/:token` | ✅ public | | | |

**เช็คเพิ่ม:**

- [ ] Session หมดอายุกลางทาง → re-auth สุภาพ
- [ ] Logout → Back ไม่เห็น dashboard เก่า
- [ ] Google OAuth (ถ้าเปิดใช้)
- [ ] Forgot password → reset link ทำงาน

---

## Phase 3 — Landing & public (manual ~1 ชม.)

ดู [`qa-checklist.md`](./qa-checklist.md) section Landing:

- [ ] Nav: logo, theme toggle, mobile sheet, login/dashboard CTA
- [ ] Hero + Early Access progress
- [ ] Fair Price calculator (ไม่ซ่อนใน accordion)
- [ ] ลิงก์ an1hem Showcase / ใบเสนอราคาฟรี
- [ ] AI Mentor chat โหลด + ส่งข้อความ (แขก)
- [ ] Blog insights + footer
- [ ] `/pricing` ตรง `src/data/plans.ts`
- [ ] `/blog`, `/blog/:slug`
- [ ] Help: `/help`, `/help/getting-started`, `/help/brief`, `/help/tax`
- [ ] `/creative-partner`, `/labs`, `/refund`, `/survey`

---

## Phase 4 — Dashboard core flows (manual ~1–2 วัน)

ทุก flow: **สร้าง → แก้ → ลบ → refresh → ยังถูก**

### Client Work

| หน้า | Section | สิ่งที่ต้องเทส |
|------|---------|--------------|
| Pipeline | finance/pipeline | deal stages, new deal |
| Smart Brief | planner/briefs | สร้าง brief, share link, PDF |
| Quotation | finance/quotations | สร้าง, mockup PDF, share `/track/:token` |
| Job Tracker | finance/jobs | steps, deadlines, comments |

### Finance

| หน้า | สิ่งที่ต้องเทส |
|------|--------------|
| Income | sync จาก quotation, กราฟ, export CSV |
| Tax | ประมาณการ, 50 ทวิ, sandbox |
| Subscription | Stripe checkout (sandbox), banner status |

### Planning

| หน้า | สิ่งที่ต้องเทส |
|------|--------------|
| Content | calendar planner |
| To Do List | projects/tasks |
| Feedback | feedback hub |

### Data (My Data)

| หน้า | สิ่งที่ต้องเทส |
|------|--------------|
| Clients | CRM CRUD |
| Suppliers | PDF samples, links |
| Assets | upload, gallery |
| Legal Desk | documents |

### More + Settings

- [ ] News & Trends (`/dashboard` trends)
- [ ] Inspire tab
- [ ] Settings: profile, theme, LINE link (`/line-link`), subscription
- [ ] Overview tab widgets
- [ ] Command menu (⌘K)
- [ ] Notification bell
- [ ] BottomNav บนมือถือไม่บังปุ่มสำคัญ

---

## Phase 5 — Token / public share pages

- [ ] `/track/:token` — ดู quotation, พิมพ์ PDF เต็ม
- [ ] `/brief/:token` — client brief view + PDF
- [ ] `/planner/:token`, `/vision/:token`
- [ ] `/supplier/:token`
- [ ] `/license/:token`
- [ ] Invalid token → empty state / 404 สุภาพ

---

## Phase 6 — In-House workspace (shipped MVP)

- [ ] `/inhouse` — org list
- [ ] `/inhouse/invite/:token` — accept invite
- [ ] Workspace: kanban, todos, chat, canvas, monitor
- [ ] Org settings `/inhouse/:orgSlug/settings`
- [ ] Member vs owner permissions

---

## Phase 7 — RLS / isolation (~1 ชม.)

ใช้ **User A** และ **User B**:

| Action | User A | User B |
|--------|:------:|:------:|
| SELECT own profile | ✅ | ✅ |
| SELECT User A quotations | ✅ | ❌ empty |
| UPDATE User A quotations | ✅ | ❌ |
| SELECT admin tables | ❌ | ❌ |
| `/admin` | ❌ | ❌ |

Admin ต้องเข้า `/admin` และดู audit ได้

---

## Phase 8 — PDF / Print (สำคัญ — ต้องมี iPhone จริง)

- [ ] Quotation mockup → บันทึก PDF — เนื้อหาครบ หลายหน้า
- [ ] Smart Brief PDF
- [ ] `/brief/:token` download/print
- [ ] `/track/:token` full quotation print
- [ ] Tax Sandbox export หลายหน้า
- [ ] iOS Safari → Save as PDF + toast แนะนำ
- [ ] Android Chrome → Save as PDF
- [ ] โลโก้ใน PDF แสดง (CORS storage)
- [ ] Dialog ปุ่ม X ไม่ทับ «บันทึก PDF»

---

## Phase 9 — Cross-platform (~0.5–1 วัน)

### Browsers

- [ ] Chrome (Win/macOS)
- [ ] Safari (macOS + **iPhone จริง**)
- [ ] Firefox
- [ ] Edge
- [ ] Android Chrome

### Viewports

375, 390, 768, 1280, 1920

### PWA

- [ ] Add to Home Screen (iPhone = Safari)
- [ ] Standalone + safe-area
- [ ] Touch targets ≥ 44px
- [ ] Dark / Light mode
- [ ] ไม่มี action ที่ต้อง hover บน touch

### UI states (ทุกหน้าสำคัญ)

- [ ] Loading skeleton
- [ ] Empty state ภาษาไทย + CTA
- [ ] Error + retry (DevTools offline)
- [ ] Success toast

---

## Phase 10 — Security + A11y + Performance (~2–4 ชม.)

### Security smoke

- [ ] `javascript:alert(1)` ใน URL field → block
- [ ] `<script>` ใน text → ไม่ execute
- [ ] `?redirect=//evil.com` → ไม่ออก domain
- [ ] Network: ไม่มี `service_role`
- [ ] Logout → back ไม่เห็น data

### Accessibility

- [ ] Tab order, focus ring
- [ ] Form labels (axe DevTools)
- [ ] Contrast WCAG AA
- [ ] `alt` รูป

### Performance

- [ ] Lighthouse mobile ≥ 70, desktop ≥ 90
- [ ] หน้าแรก < 3s Fast 3G
- [ ] CLS < 0.1, LCP < 2.5s
- [ ] Lazy load รูป below fold

---

## Phase 11 — Sign-off

| เกณฑ์ | เป้า |
|-------|------|
| `npm run test` | pass |
| `npm run smoke:public` | pass |
| `npm run e2e:smoke` | pass |
| Blocker / Critical bugs | 0 open |
| Major bugs | 0 หรือมี workaround |
| qa-checklist.md | ครบ section ที่เกี่ยวกับ release |
| PDF บน iOS Safari | ผ่าน |
| User A/B RLS | ผ่าน |

### Bug report

ใช้ template ใน [`qa-onboarding.md`](./qa-onboarding.md)

---

## แผนรายวัน (คนเดียว ~4 วัน)

| วัน | งาน |
|-----|-----|
| **Day 1** | Phase 0–1 (auto) + Phase 2 (auth) + Phase 3 (landing) |
| **Day 2** | Phase 4 Client Work + Finance + Phase 8 PDF (desktop) |
| **Day 3** | Phase 4 Planning/Data/Settings + Phase 5 token pages + Phase 6 inhouse |
| **Day 4** | Phase 7 RLS + Phase 9 cross-platform (iPhone) + Phase 10 + sign-off |

---

## คำสั่งอ้างอิงด่วน

```bash
npm run dev
npm run test
npm run smoke:public
BASE_URL=https://solofreelancer.com npm run smoke:public
npm run e2e:smoke
npm run e2e
npx playwright show-report
NODE_OPTIONS=--max-old-space-size=8192 npm run build:lovable
```
