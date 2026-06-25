# Release Checklist

ใช้ก่อน push, merge, deploy หรือส่ง demo ให้ reviewer

## Pre-Work

- [ ] อยู่ repo/branch ถูกต้อง
- [ ] working tree สะอาดหรือรู้ว่ามี local changes อะไร
- [ ] pull main ล่าสุดแล้ว
- [ ] ไม่มี nested `.git` ผิดที่
- [ ] อ่าน skill ที่เกี่ยวข้องกับงานแล้ว

## Code Quality

- [ ] lint ผ่าน หรือ warning ถูกยอมรับพร้อมเหตุผล
- [ ] typecheck ผ่าน
- [ ] unit tests สำคัญผ่าน
- [ ] build ผ่าน
- [ ] smoke test public pages ผ่าน
- [ ] ไม่มี console error สำคัญ

## Security

- [ ] ไม่มี secret ใน git diff
- [ ] service role ไม่อยู่ใน client bundle
- [ ] auth redirect sanitize
- [ ] RLS/policy/RPC ผ่านตาม scope
- [ ] payment/referral/cashout idempotent ถ้าแตะระบบเหล่านี้
- [ ] npm audit reviewed

## UX

- [ ] mobile 360-430px ไม่พัง
- [ ] desktop 1280px ไม่โล่ง/รกเกิน
- [ ] loading/empty/error state มี
- [ ] form validation ชัด
- [ ] Thai copy อ่านง่าย
- [ ] reward/money copy ไม่ทำให้เข้าใจผิด

## Anthem Demo Release

- [ ] Demo URL เปิดได้
- [ ] login demo หรือ reviewer account พร้อม
- [ ] first impression หน้าแรกชัด
- [ ] onboarding/mission/PX ทดสอบแล้ว
- [ ] first project/post flow ทดสอบแล้ว
- [ ] referral/reward copy ชัด
- [ ] report/feedback ใช้งานได้
- [ ] usability PDF/checklist พร้อมส่ง

## Solo Production Release

- [ ] Stripe/payment/cashout flows ไม่ถูก mock ใน production
- [ ] env ครบ
- [ ] rate limit เปิด
- [ ] build production ผ่าน
- [ ] Vercel deploy success
- [ ] admin/ops route guard ถูกต้อง
- [ ] backup/rollback path ชัด

## GitHub / PR

- [ ] PR summary บอกสิ่งที่แก้
- [ ] validation ระบุคำสั่งหรือ CI ที่ผ่าน
- [ ] ถ้า local test run ไม่ได้ ต้องเขียนเหตุผล
- [ ] checks เขียวก่อน merge
- [ ] draft PR ต้อง ready before merge
- [ ] หลัง merge เช็ก Vercel deploy

## Post-Deploy

- [ ] เปิด production/demo URL
- [ ] เช็กหน้าแรก
- [ ] เช็ก auth prompt/login
- [ ] เช็ก critical CTA
- [ ] เช็ก logs/errors ถ้ามี access
- [ ] แจ้งทีมว่าพร้อม review หรือมี known issue อะไร

## Rollback Notes

ถ้า deploy พัง:

1. หยุด merge เพิ่ม
2. ระบุ commit/deployment ที่พัง
3. rollback ใน Vercel ถ้าจำเป็น
4. เปิด issue/PR fix เฉพาะจุด
5. อย่า force-push main ถ้าไม่จำเป็น
