# Aplus1 release regression — rebrand + UX

ใช้ก่อน deploy production หลังรอบ rebrand (tagline, +1, admin, UX form)

## Smoke (ไม่ต้อง login)

```bash
cd Anthem-Code && npm run build
BASE_URL=https://aplus1-demo.vercel.app ./scripts/smoke-public.sh
npm run e2e:seo
```

ตรวจ path ใหม่: `/research/feedback` ต้อง 200

## Brand & copy

- [ ] หน้าแรก title/OG: `Aplus1 — 1 โปรไฟล์ สู่ 100+ โอกาส`
- [ ] Auth hero ใช้ tagline จาก brandConfig
- [ ] Appreciation แสดง **+1** ไม่ใช่หัวใจ (feed, project detail, community, profile stats)
- [ ] **FeedHero** ยังคง "ที่ถูกใจคุณ" (ตาม scope)
- [ ] PX แยกจาก +1 (wallet/gift ไม่เปลี่ยนเป็น +1)
- [ ] แจ้งเตือน in-app: ข้อความ appreciation ใช้ +1

## Admin

- [ ] Sidebar: Aplus1 Admin + BrandLogo + 8 หมวดจาก `adminNavigation.ts`
- [ ] Overview: KPI "+1 24h", cashout → `/admin/wallet`, ลิงก์จัดกลุ่มตาม sidebar
- [ ] Kuy Radar: `/admin/kuy-radar` โหลดได้ + export compliance
- [ ] System: แท็บ Supabase Usage โหลดได้
- [ ] Feedback: แท็บ UX Research (หลัง apply SQL)

## UX research

- [ ] `/research` มีปุ่มส่งผล → `/research/feedback`
- [ ] ฟอร์มส่งได้ (หลัง `scripts/ecosystem/ux-research-feedback.sql`)
- [ ] Admin เห็น submission ในแท็บ UX Research

## Email & legal

- [ ] `npm run email:preview` — header Aplus1 ไม่มี 1PX/Pixel100
- [ ] Privacy: ข้อความ +1 แทนไลก์
- [ ] LINE notification kinds: Aplus1 showcase

## Out of scope (ไม่ regression)

- สี/ฟอนต์/FeedHero concept copy
- `*@demo.pixel100.com` demo accounts
- `com.pixel100.app` bundle id
- DonationModal gift success heart

## DB ก่อน production

```bash
./scripts/check-migrations-pending.sh
# ต้องไม่มีค้าง — รวม 20260702120000_kuy_radar_core (applied 2026-07-02)
# scripts/ecosystem/ux-research-feedback.sql ถ้ายังไม่รัน
```
