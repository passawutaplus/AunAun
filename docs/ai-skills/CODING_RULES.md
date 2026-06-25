# Coding Rules

## General Rules

- อ่าน existing pattern ก่อนสร้าง abstraction ใหม่
- แก้เฉพาะ scope งาน อย่า refactor กว้างถ้าไม่จำเป็น
- ถ้าแตะ shared behavior ต้องเพิ่ม/ปรับ test
- ถ้าแตะ auth, wallet, referral, payment, upload, admin ต้องอ่าน `SECURITY_CHECKLIST.md`
- ถ้าแตะ UI ต้องอ่าน `UX_UI_RULES.md`
- ถ้าแตะ deploy/CI ต้องอ่าน `RELEASE_CHECKLIST.md`

## Repository Rules

- `AunAun` เป็น inline monorepo snapshot แล้ว
- ห้ามสร้าง submodule ซ้ำใน `Anthem-Code/` หรือ `Solo-Code/`
- ห้ามใช้ `.git` เก่าที่ค้างใน subfolder เป็น source of truth
- Standalone repo ต้อง clone แยกถ้าจะทำงานเฉพาะเว็บ
- ก่อนแก้ให้เช็ก branch และ working tree ก่อนเสมอ

## Supabase Rules

- ห้าม expose `service_role` ใน client bundle
- client-side ใช้ publishable/anon key เท่านั้น
- server-only logic ต้องอยู่ใน server route, RPC, edge function หรือ trusted backend
- RLS ต้องเปิดกับ table ที่มีข้อมูล user/business
- ถ้าใช้ `SECURITY DEFINER` ต้อง validate ownership และ input ให้ครบ
- อย่าข้าม type safety ด้วย `any` ถ้าไม่จำเป็น ถ้าจำเป็นให้จำกัดเฉพาะ boundary

## Auth Rules

- ห้ามสร้าง GoTrue/Supabase auth client ซ้ำหลาย instance โดยไม่จำเป็น
- login redirect ต้อง sanitize path ห้าม open redirect
- logout ต้อง clear session และ refresh แล้วยัง logged out
- guest action เช่น like/comment/hire ต้องเปิด auth prompt ชัดเจน

## Money and Reward Rules

- เงิน, wallet, PX, cashout, referral reward ต้อง idempotent
- ต้องกัน double claim, race condition, self-referral, fake account
- welcome/reward ที่ถอนไม่ได้ต้องแยกจาก earned/withdrawable
- transaction/ledger ต้อง audit ย้อนหลังได้
- cashout ต้อง enforce minimum และ KYC/Stripe requirements

## UI Code Rules

- ใช้ component pattern เดิมก่อนสร้างใหม่
- อย่าใส่ text อธิบายระบบยาวใน UI ถ้ามี control ที่ชัดกว่า
- ใช้ loading, empty, error state ทุกหน้าสำคัญ
- ปุ่มสำคัญต้อง disable ระหว่าง submit
- form error ต้องอยู่ใกล้ field และมี toast เมื่อจำเป็น
- mobile ต้องทดสอบ bottom nav, keyboard, modal, safe area

## Testing Rules

- แก้ business rule ต้องแก้ test ให้สะท้อนกติกาปัจจุบัน
- ห้ามปิด test เพื่อให้ผ่านโดยไม่เข้าใจสาเหตุ
- ถ้า dependency audit เป็น external issue ให้รายงาน ไม่จำเป็นต้อง block smoke/build ทุกกรณี
- ก่อน merge อย่างน้อยควรผ่าน typecheck, unit สำคัญ, build, smoke

## Documentation Rules

- ถ้าเพิ่ม feature สำคัญ ให้เพิ่ม docs หรือ AI skill ที่เกี่ยวข้อง
- ถ้าเปลี่ยน reward/payment/security rule ต้องอัปเดตเอกสารทันที
- เอกสารสำหรับ reviewer ต้องไม่ใส่ secret หรือข้อมูล login จริง

## Commit/PR Rules

- commit message ต้องบอก intent ไม่ใช่แค่ "fix"
- PR summary ต้องมี validation
- ถ้า local test run ไม่ได้ ให้ระบุเหตุผล เช่น dependency cache incomplete
- อย่า merge ถ้า CI แดงจาก code/test/build เว้นแต่เป็น advisory ที่ตั้งใจไม่ block
