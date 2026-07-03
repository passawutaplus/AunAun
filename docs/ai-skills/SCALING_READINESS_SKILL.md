# Scaling Readiness Skill

ใช้ไฟล์นี้เมื่อวางแผนให้ Aplus1, Solo หรือ AunAun รองรับผู้ใช้เพิ่มขึ้น

**Runbook ฉบับเต็ม (SLO, CCU, checklist รายข้อ):** [scale-readiness-checklist.md](../scale-readiness-checklist.md)

## Goal

ระบบต้อง scale แบบปลอดภัย — รับ user จริง, data จริง, abuse จริง, incident จริง

1. หน้าเว็บไม่ช้าเมื่อ feed/data เยอขึ้น
2. database query ไม่แพงเกินเมื่อ user เพิ่ม
3. auth, wallet, referral, payment ไม่โดน spam
4. media/image ไม่ทำให้ bandwidth แตก
5. มี monitoring, backup, rollback path

## Scaling Stages (สรุป)

| Stage | CCU / users | ต้องมี |
|-------|-------------|--------|
| 0 Demo | 10–50 reviewer | CI, demo clearable, smoke test, no service role in client |
| 1 Soft launch | 100–1,000 | rate limits, core indexes, RLS reviewed, backup before migration |
| 2 Public beta | 1,000–10,000 | feed pagination, image CDN, referral abuse detection, usage monitoring |
| 3 Growth | 10,000+ | moderation queue, index audit, alerting, restore drill |

รายละเอียด SLO, hot path, load test: ดู [scale-readiness-checklist.md](../scale-readiness-checklist.md)

## Red flags (ห้าม ship)

- `select *` บน feed โดยไม่มี limit
- client fetch all rows แล้ว filter เอง
- infinite scroll ไม่มี dedupe
- migration lock table ใหญ่โดยไม่จำเป็น
- ไม่มี rate limit บน referral/payment/upload

## ก่อนเพิ่ม feature ให้ตอบ

1. Feature นี้เพิ่ม read/write load ที่ table ไหน
2. มี index/pagination หรือยัง
3. มี abuse/rate limit หรือยัง
4. มี monitoring signal อะไร
5. ถ้า fail จะ rollback/recover ยังไง

## Related docs

- [scale-readiness-checklist.md](../scale-readiness-checklist.md) — SLO + CCU playbook
- [ecosystem-hosting.md](../ecosystem-hosting.md) — Vercel topology
- [backup-restore.md](../backup-restore.md) — restore procedure
- [Anthem-Code/docs/release-gate-aplus1.md](../../Anthem-Code/docs/release-gate-aplus1.md) — load test gate
