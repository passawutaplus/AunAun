# Scaling Readiness Skill

ใช้ไฟล์นี้เมื่อวางแผนให้ Anthem, Solo หรือ AunAun รองรับผู้ใช้เพิ่มขึ้นในอนาคต

## Goal

ระบบต้อง scale แบบปลอดภัย ไม่ใช่แค่รับ traffic ได้ แต่ต้องรับ user จริง, data จริง, abuse จริง, และ incident จริงได้

เป้าหมายหลัก:

1. หน้าเว็บไม่ช้าเมื่อ feed/data เยอะขึ้น
2. database query ไม่แพงเกินเมื่อ user เพิ่ม
3. auth, wallet, referral, payment ไม่โดน spam
4. media/image ไม่ทำให้ bandwidth หรือโหลดหน้าแตก
5. มี monitoring, backup, rollback และ incident path

## Scaling Stages

### Stage 0 - Demo / Internal Review

เหมาะกับ:

- reviewer 10-50 คน
- seed data
- usability testing

ต้องมี:

- basic CI
- demo data clearable
- no service role in client
- public smoke test
- manual rollback path

### Stage 1 - Soft Launch

เหมาะกับ:

- user 100-1,000 คน
- creator seeding
- referral beta

ต้องมี:

- rate limit auth-sensitive endpoint
- core DB indexes
- RLS reviewed
- monitoring error logs
- backup before migration
- basic admin review/report flow

### Stage 2 - Public Beta

เหมาะกับ:

- user 1,000-10,000 คน
- content grows daily
- referral starts spreading

ต้องมี:

- feed pagination/cursor
- image optimization/CDN
- query performance review
- referral abuse detection
- notification volume control
- incident checklist
- Vercel/Supabase usage monitoring

### Stage 3 - Growth

เหมาะกับ:

- user 10,000+
- daily community activity
- money/reward/cashout volume

ต้องมี:

- background job/queue strategy
- moderation queue
- campaign budget/risk scoring
- database index audit
- read/write hot path review
- alerting
- restore drill

## Database Scaling

ตรวจทุก table ที่โตเร็ว:

- projects/posts
- comments
- likes
- follows
- notifications
- referral ledger
- wallet ledger
- reports
- chat/messages
- jobs/applications

Checklist:

- [ ] มี index สำหรับ foreign keys ที่ query บ่อย
- [ ] มี composite index สำหรับ feed/filter/sort
- [ ] query ใช้ limit/pagination
- [ ] ไม่มี client fetch all rows แล้ว filter เอง
- [ ] RLS policy ไม่แพงเกินจน slow เมื่อ row เยอะ
- [ ] RPC/SQL function มี where clause ชัด
- [ ] migration ไม่ lock table ใหญ่โดยไม่จำเป็น

## Feed and Search

Rules:

- ใช้ cursor pagination แทน offset ยาว ๆ เมื่อ data โต
- อย่าโหลดรูปเต็มทุก card
- อย่า join หนักทุก request ถ้า cache/denormalize ได้อย่างปลอดภัย
- แยก public feed fields ออกจาก private user data
- คิดเรื่อง cache invalidation ตั้งแต่ต้น

Red flags:

- `select *` บน feed
- ดึง comments/likes ทั้งหมดพร้อม project
- filter/sort หลายเงื่อนไขไม่มี index
- infinite scroll ไม่มี dedupe

## Media and Storage

Checklist:

- [ ] image resize/compress ก่อนหรือหลัง upload
- [ ] thumbnail สำหรับ feed
- [ ] lazy loading
- [ ] size limit
- [ ] content type whitelist
- [ ] storage bucket public/private ถูกต้อง
- [ ] CDN/cache headers เหมาะสม

## API and Rate Limit

ต้อง rate limit:

- login/signup sensitive routes
- referral register/claim
- reward claim
- payment/cashout
- report/feedback submit
- upload
- comment/chat spam-prone routes

แนวคิด:

- per user
- per IP/device ถ้าทำได้
- per action
- stricter on anonymous routes

## Supabase Scaling

ต้อง monitor:

- database CPU
- slow queries
- row count growth
- storage growth
- auth user growth
- Realtime usage ถ้ามี
- edge function errors ถ้ามี

ควรถามก่อน scale:

1. plan ปัจจุบันรองรับ connection/compute ไหม
2. RLS policy ที่หนักสุดคืออะไร
3. table ไหนโตเร็วสุด
4. backup/restore ใช้เวลากี่นาที
5. migration rollback ทำยังไง

## Vercel Scaling

Checklist:

- [ ] production build deterministic
- [ ] env แยก preview/production
- [ ] preview deploy tested
- [ ] no localhost fallback in production
- [ ] image/static asset optimized
- [ ] route/page bundle ไม่ใหญ่เกิน
- [ ] error monitoring available

## Monitoring

ควร track:

- signup success/failure
- first post success/failure
- referral claim failure
- reward ledger errors
- cashout/payment errors
- API 4xx/5xx
- client runtime errors
- slow page/load
- report volume

## Backup and Incident Plan

ก่อนเปิดคนเยอะ:

- [ ] backup database
- [ ] know last good deployment
- [ ] know how to rollback Vercel
- [ ] risky migration has rollback note
- [ ] contact/owner for Supabase/Vercel/Stripe ready
- [ ] incident log template ready

Incident flow:

1. Identify affected surface
2. Stop rollout or disable campaign
3. Rollback deploy if needed
4. Protect data and money first
5. Patch with focused fix
6. Write root cause

## Scaling Questions for AI

ก่อนเพิ่ม feature ให้ AI ตอบ:

1. Feature นี้เพิ่ม read/write load ที่ table ไหน
2. มี index/pagination หรือยัง
3. มี abuse/rate limit หรือยัง
4. มี monitoring signal อะไร
5. ถ้า fail จะ rollback/recover ยังไง

