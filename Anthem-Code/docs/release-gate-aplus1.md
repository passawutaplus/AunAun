# Aplus1 Release Gate

Updated: 2026-07-03

เอกสารรวมสำหรับ deploy production Aplus1 — รวม pre-launch requirements, rebrand regression, และ DB gate

Production: **https://aplus1.app** · Demo: **https://aplus1-demo.vercel.app**

Manual QA checklist แยก: [qa-checklist.md](./qa-checklist.md) · Ecosystem: [MANUAL-TESTING.md](../../docs/MANUAL-TESTING.md)

---

## 1. Pre-launch requirements

Build ผ่านอย่างเดียว **ไม่ใช่** production release

### Domain & config

- [ ] Canonical domain **`aplus1.app`** ใน `VITE_SITE_URL`, OAuth redirects, sitemap, robots, email links, universal links, store listings
- [ ] Legacy `an1hem.app` redirect ไป `aplus1.app` — ไม่ใช้ domain เก่าใน config ใหม่
- [ ] `VITE_DEMO_MODE=false` บน production build
- [ ] Support, privacy, security email addresses ยืนยันแล้ว

### Database migrations

Apply ทั้งหมดจาก `Solo-Code/supabase/migrations` ตามลำดับ timestamp:

```bash
./scripts/check-migrations-pending.sh
cd Solo-Code && ./scripts/supabase-push-via-api.sh
```

- [ ] `20260622120000_anthem_community_production_hardening.sql`
- [ ] `20260622160000_anthem_referral_affiliate.sql` (ก่อนเปิด referral links)
- [ ] `20260702120000_kuy_radar_core.sql` (Marketing — RLS ใช้ `has_role(auth.uid(), 'admin')`)
- [ ] `scripts/ecosystem/ux-research-feedback.sql` (ถ้ายังไม่รัน — แท็บ UX Research ใน admin)

### Payments & security

- [ ] Mock payment RPCs ปิดใน production
- [ ] Stripe live-mode secrets เฉพาะ server environments
- [ ] Sentry, uptime monitoring, database backups + tested restore ([backup-restore.md](../../docs/backup-restore.md))

### Community & chat scale

Migration hardening มี:

- Server-side post, comment, message rate limits
- Moderation state, strikes, mute, ban ใน Postgres
- Protected counters + idempotent notifications
- Feed, comment, message indexes + Realtime publication
- Atomic group conversation creation

Frontend ต้อง page feed และ bound chat history — **ห้าม** เปลี่ยนกลับเป็น unbounded reads

### Load test gate (non-production Supabase)

- 200 concurrent feed readers × 10 min
- 50 concurrent comment writers × 20+ posts
- 100 concurrent chat users × 30+ conversations
- Burst rate-limit tests + reconnect after 30s network drop

Pass: p95 feed < 800ms, p95 message insert < 500ms, error rate < 1% (excluding rate limits), no duplicate notifications / cross-user leaks

### Supabase ops

- Supavisor/connection pooling สำหรับ app traffic
- Service-role keys เฉพาะ server/Edge Functions
- Budget alerts: DB size, egress, Realtime, storage

### Rollback

1. Keep previous frontend deployment available
2. Maintenance banner ถ้า migration fail
3. Roll back frontend ก่อน — อย่า down-migrate user content
4. Restore backup เฉพาะ data corruption

---

## 2. Rebrand & product regression

ใช้ก่อน deploy หลังรอบ rebrand / product P0

### Smoke (ไม่ต้อง login)

```bash
cd Anthem-Code && npm run build
BASE_URL=https://aplus1-demo.vercel.app ./scripts/smoke-public.sh
npm run e2e:seo
```

- [ ] `/research/feedback` → 200

### Brand & copy

- [ ] หน้าแรก title/OG: `Aplus1 — 1 โปรไฟล์ สู่ 100+ โอกาส`
- [ ] Auth hero ใช้ tagline จาก brandConfig
- [ ] Appreciation แสดง **+1** ไม่ใช่หัวใจ (feed, project detail, community, profile stats)
- [ ] PX แยกจาก +1 (wallet/gift ไม่เปลี่ยนเป็น +1)
- [ ] แจ้งเตือน in-app: appreciation ใช้ +1

### Product loop (P0 — [MASTER_CURSOR_BRIEF.md](./MASTER_CURSOR_BRIEF.md))

- [ ] Creator ตั้ง opportunity status ได้
- [ ] Publish project มีบริบท (role/process อย่างน้อย)
- [ ] Project detail CTA **คุยต่อจากผลงานนี้**
- [ ] Save → collection ใช้ได้ทันทีหลังสร้าง collection
- [ ] Inquiry จากผลงานเปิดแชทพร้อม project context

### Admin

- [ ] Sidebar: Aplus1 Admin + BrandLogo — **launch minimal** แสดงเฉพาะเมนูที่เปิดใช้ (~5 หมวด); demo/full build ยังเห็นครบ 8 หมวด
- [ ] Overview: KPI launch = ข้อความ 24h แทนงานเปิดรับ; คิวไม่มี KYC/ถอนเงิน/จ้าง/คอลแลป
- [ ] `/admin/jobs`, `/admin/marketing` → redirect `/admin` เมื่อ launch minimal
- [ ] Marketing: `/admin/marketing` โหลดได้ + export compliance (เฉพาะ non-launch build)
- [ ] System: แท็บ Supabase Usage โหลดได้
- [ ] Feedback: แท็บ UX Research

### UX research

- [ ] `/research` → `/research/feedback`
- [ ] ฟอร์มส่งได้ · Admin เห็น submission

### Email & legal

- [ ] `npm run email:preview` — header Aplus1 ไม่มี 1PX/Pixel100
- [ ] Privacy: ข้อความ +1 แทนไลก์
- [ ] LINE notification kinds: Aplus1 showcase

### Out of scope (ไม่ regression)

- สี/ฟอนต์/FeedHero concept copy
- `*@demo.pixel100.com` demo accounts
- `com.pixel100.app` bundle id (Capacitor — แยก track)

---

## 3. Manual QA pointer

ก่อน release รัน [qa-checklist.md](./qa-checklist.md) (browsers, viewports, auth states, major flows)

Ecosystem manual items: [MANUAL-TESTING.md](../../docs/MANUAL-TESTING.md)

UX research full checklist: [ux-research-review.md](./ux-research-review.md)
