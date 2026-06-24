# คู่มือ UX + ทดสอบด้วยข้อมูล Demo

> **ส่งให้ UX researcher:** ใช้ **[`ux-research-review.md`](./ux-research-review.md)** (เช็คลิสครบ A–T) หรือหน้าเว็บ **`/research`**

## เปิดโหมดทดสอบบนเครื่อง

ใน `.env` (ไม่ commit):

```env
VITE_DEMO_MODE=true
```

จะแสดงแถบบนสุดพร้อมวิธี login demo

## รัน seed (ข้อมูลจริงจำลอง 50 ครีเอเตอร์ + กิจกรรมครบ)

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...   # Dashboard → Account → Access Tokens
npm run db:qa-full
```

หรือขั้นตอนแยก: `npm run db:apply-anthem` แล้ว `npm run seed:demo`

| อีเมล | รหัส |
|--------|------|
| `phatsawut@demo.pixel100.com` (และ username อื่น ๆ) | รับรหัสผ่านจากผู้ดูแล demo |

ดูรายชื่อครบใน `docs/demo-catalog.md`

## เช็กลิสต์ UX หลัง seed

- [ ] หน้าแรก `/` — ฟีดโหลด skeleton ไม่กระพริบ "ไม่พบผลงาน"
- [ ] Hero แสดงตัวเลขดีไซเนอร์/ผลงาน (หลัง migration `public_feed_stats`)
- [ ] แท็บดีไซเนอร์ / สตูดิโอ — การ์ด + empty state ภาษาไทย
- [ ] เปิด `/u/{demo-uuid}` — โปรไฟล์ + ผลงาน Unsplash
- [ ] `/project/{id}` — รายละเอียด + จ้าง/คอลแลป
- [ ] `/jobs` — ประกาศจาก seed
- [ ] `/s/doi-studio` — สตูดิโอ demo
- [ ] Login demo → `/portfolio`, `/notifications`, `/chat`, `/collections`
- [ ] ตรวจคอมเมนต์/ไลค์/จ้าง/คอลแลปบนผลงาน
- [ ] Admin: users 50, projects, comments, gifts (ถ้ามี role admin)
- [ ] `/portfolio` — เช็กลิสต์ Welcome Bonus 0/500 PX แสดงบนโปรไฟล์
- [ ] ทำภารกิจ (เช่น ตั้งโปรไฟล์) → ปุ่ม **รับ PX** → `welcome_px` เพิ่มตามรางวัล
- [ ] ส่งของขวัญจากผลงาน — หัก `welcome_px` ก่อน purchased (ดูยอดพร้อมใช้ใน DonationModal)
- [ ] `/earnings` — ถอนได้เฉพาะ `earned_px` ไม่รวม welcome_px

## ลบ demo ก่อน production

`scripts/sql/purge-demo-users.sql` + ลบ `auth.users` ที่ `@demo.pixel100.com`
