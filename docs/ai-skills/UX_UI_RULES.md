# UX/UI Rules

## Product UX Principles

- ทำให้ผู้ใช้รู้ next step ภายใน 10 วินาที
- ลดความลังเลก่อน action สำคัญ เช่น signup, first post, hire, reward claim
- ใช้ภาษาไทยที่เป็นธรรมชาติ ไม่ technical เกินไป
- ให้ UI เป็น app ที่ใช้งานจริง ไม่ใช่ landing page อย่างเดียว
- ทุกหน้าใหญ่ต้องมี loading, empty, error state
- Mobile-first สำคัญมาก โดยเฉพาะ bottom nav, keyboard, modal, form

## Thai Copy Rules

- ใช้คำสั้น ชัด ตรง action
- อย่าใช้ศัพท์ backend เช่น RPC, RLS, ledger, idempotency ใน UI ผู้ใช้
- แยกคำให้ชัด:
  - "จ้างงาน" = มีโจทย์/เงิน/ขอบเขตงาน
  - "คอลแลป" = ทำงานร่วมกัน/เสนอ collaboration
  - "สมัครงาน" = apply job post
  - "สนับสนุน" = ส่ง PX/gift
- PX ต้องอธิบายแบบไม่ทำให้เข้าใจผิดว่าเป็นเงินฟรีทันที
- ถอนไม่ได้/ถอนได้ ต้องแยกคำชัดเจน

## Visual Design Rules

- ใช้ hierarchy ชัด: title, context, primary action, secondary action
- หลีกเลี่ยง card ซ้อน card
- card radius ไม่ควรใหญ่เกินถ้าเป็น dashboard/tool UI
- อย่าทำ palette โทนเดียวจนทั้งเว็บตัน
- ปุ่มสำคัญต้อง contrast ดี
- form field ต้องมี label ไม่ใช่ placeholder อย่างเดียว

## Mobile Rules

- 360px ต้องไม่ล้น
- bottom nav ไม่บัง CTA
- chat/editor ต้องไม่ชน keyboard
- modal ต้อง scroll ได้
- toast ต้องไม่บังปุ่มสำคัญ
- ปุ่มหลักควรกดง่ายด้วยนิ้วโป้ง

## Accessibility

- focus ring ต้องเห็น
- image มี alt หรือ alt="" ถ้า decorative
- contrast สำคัญ >= 4.5:1
- icon-only button ต้องมี aria label/tooltip
- error message อยู่ใกล้ field
- keyboard tab order ต้องไม่หลุด

## State Design

### Loading

- ใช้ skeleton หรือ loading text ที่ไม่ทำให้เข้าใจว่าไม่มีข้อมูล
- อย่า flash empty state ก่อน data load เสร็จ

### Empty

- บอกว่าทำไมว่าง
- เสนอ next action
- ใช้ copy สั้น ๆ

### Error

- บอกสิ่งที่ user ทำต่อได้
- ไม่ show stack trace หรือ DB detail
- ให้ retry เมื่อเหมาะสม

## Anthem UX Focus

- First impression: เข้าใจว่าเป็น creator community
- Activation: สร้าง/โพสต์ผลงานครั้งแรก
- Reward clarity: PX/reward/referral เข้าใจง่ายและน่าเชื่อ
- Community trust: report, legal, profile, creator credibility
- Mobile demo: พร้อมส่ง reviewer

## Solo UX Focus

- Work dashboard ต้อง scan ง่าย
- Payment/cashout ต้องชัดและน่าเชื่อ
- Admin/ops ต้อง dense แต่ไม่รก
- Form ที่เกี่ยวกับเงินต้องมี validation และ confirmation
- In-house workflow ต้องแยก workspace/task/chat/monitor ชัด

## Usability Review Questions

ถามทุกครั้งหลังแก้ UX สำคัญ:

1. ผู้ใช้รู้ไหมว่าหน้านี้ทำอะไร
2. ปุ่มหลักคืออะไร
3. ต้องใช้ความจำจากหน้าอื่นไหม
4. ถ้าข้อมูลว่าง ระบบช่วยอะไร
5. ถ้า error ผู้ใช้ไปต่อได้ไหม
6. บนมือถือยังใช้ได้ไหม
7. ข้อความทำให้เข้าใจผิดเรื่องเงิน/reward ไหม
