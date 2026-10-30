# LINE admin bot (@samecor)

แจ้งเตือนเข้ากลุ่ม LINE ของแอดมิน: สมาชิกใหม่ (ชื่อ + อีเมลเต็ม), ฟีดแบ็ก, รายงาน, สรุปรายวัน 09:00 (เวลาไทย) รวมผลงานใหม่

## ส่วนประกอบ
- `supabase/migrations/20261030120000_line_admin_alerts.sql` — outbox + triggers + pg_cron (digest 02:00 UTC, sweep ทุก 10 นาที)
- `functions/line-admin-notify` — ส่งรายการค้างใน outbox เข้ากลุ่ม (push API)
- `functions/line-admin-webhook` — ตรวจ signature, ตอบ group id ตอนบอตเข้ากลุ่มหรือพิมพ์ `/id`, `/ping`
- `functions/_shared/line-admin-format.ts` — จัดข้อความ (มีเทสต์ใน `src/lib/__tests__/lineAdminFormat.test.ts`)

## Secrets (ตั้งใน Supabase → Edge Functions → Secrets เอง ห้ามใส่ในแชต/โค้ด)
| ชื่อ | ค่า |
|---|---|
| LINE_ADMIN_CHANNEL_SECRET | Channel secret ของช่อง Messaging API |
| LINE_ADMIN_ACCESS_TOKEN | Channel access token (long-lived) |
| LINE_ADMIN_GROUP_ID | ได้จากบอตหลังเชิญเข้ากลุ่ม (พิมพ์ `/id`) |
| LINE_ADMIN_IGNORE_EMAILS | (ไม่บังคับ) อีเมลที่ไม่ต้องแจ้ง คั่นด้วย , |

## ขั้นตอน
1. LINE Developers → ช่อง Messaging API: reissue Channel secret, issue access token, เปิด "Allow bot to join group chats", ปิด auto-reply
2. Deploy `line-admin-webhook`, ตั้ง Webhook URL = `https://<project>.supabase.co/functions/v1/line-admin-webhook` แล้วกด Verify
3. ตั้ง secrets สองตัวแรก → สร้างกลุ่ม → เชิญ @samecor → บอตตอบ group id (หรือพิมพ์ `/id`)
4. ตั้ง `LINE_ADMIN_GROUP_ID` → apply migration → deploy `line-admin-notify`
5. ทดสอบ: สมัครสมาชิกใหม่ / ส่งฟีดแบ็ก 1 รายการ

โควตาข้อความ push ขึ้นกับแพ็กเกจ OA (ฟรีมีจำกัด/เดือน) — สมัครรัวๆ ≥4 คนต่อรอบจะรวมเป็นข้อความเดียว
