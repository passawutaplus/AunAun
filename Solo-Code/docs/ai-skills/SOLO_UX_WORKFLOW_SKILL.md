# Solo UX Workflow Skill

## Purpose

ใช้เมื่อปรับ UX/UI ของ Solo:

- dashboard
- admin
- payment
- in-house
- marketplace
- project/client workflow

## UX Personality

Solo ควรรู้สึก:

- reliable
- professional
- quiet
- work-focused
- easy to scan

ไม่ควรรู้สึก:

- flashy marketing page
- gamified เกินไป
- decorative จนใช้ซ้ำยาก

## Dashboard Rules

Dashboard ควรตอบ:

1. ตอนนี้มีอะไรต้องทำ
2. เงิน/งานอยู่สถานะไหน
3. มี risk หรือ blocker อะไร
4. ต้องกดปุ่มอะไรต่อ

ต้องมี:

- status cards ที่ไม่เยอะเกิน
- table/list สำหรับงานจริง
- filters/tabs
- clear empty state
- clear error state

## Payment UX

ต้องชัด:

- amount
- fee
- status
- next step
- expected timing
- failure reason
- retry/support path

อย่าใช้คำกำกวม:

- "สำเร็จ" ถ้ายัง pending
- "ถอนเงินได้" ถ้ายังไม่ผ่าน KYC/minimum
- "ฟรี" ถ้ามีค่าธรรมเนียมแฝง

## Form UX

ทุก form สำคัญต้องมี:

- label
- required state
- validation
- disabled while submitting
- success feedback
- recoverable error

สำหรับ money form:

- confirmation step
- clear terms
- no accidental double submit

## Admin/Ops UX

ควร dense แต่ไม่รก:

- table
- filters
- bulk action
- status badges
- detail drawer/page
- audit info

อย่าทำ admin เป็น hero/card-heavy landing page

## In-house UX

- org/workspace context ต้องเห็นตลอด
- sidebar ชัด
- task status scan ง่าย
- chat/workflow ไม่แย่ง attention
- settings แยกจาก daily work

## Mobile UX

Solo mobile ควรรองรับ critical action แต่ไม่จำเป็นต้องยัดทุก admin feature:

- dashboard summary
- payment status
- task/chat basic
- notifications
- support

Admin-heavy/table-heavy อาจใช้ desktop-first ได้ แต่ต้องไม่พังบน mobile

## UX Review Checklist

- [ ] หน้านี้มี primary action เดียวที่ชัดไหม
- [ ] ผู้ใช้รู้สถานะงาน/เงินไหม
- [ ] empty state ชวน action ต่อไหม
- [ ] error state ให้ทางแก้ไหม
- [ ] mobile ไม่ล้นไหม
- [ ] copy ไม่ทำให้เข้าใจผิดเรื่องเงินไหม
- [ ] admin/user role เห็น UI ที่เหมาะสมไหม

## Red Flags

- dashboard มีแต่ตัวเลขแต่ไม่มี next action
- payment status กำกวม
- form submit แล้วไม่รู้ว่าสำเร็จไหม
- modal ซ้อนหลายชั้น
- admin action ไม่มี confirmation
- text ล้นปุ่ม/card บน mobile
