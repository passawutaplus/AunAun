# Solo In-house Skill

## Purpose

ใช้เมื่อแก้ module in-house:

- organization
- workspace
- tasks
- chat
- monitor
- canvas
- settings
- members/roles

## Product Meaning

In-house คือ workspace สำหรับทีม/องค์กรที่ต้องจัดการงานภายใน Solo:

- เห็นภาพรวมงาน
- แบ่ง task
- คุยในทีม
- monitor progress
- ตั้งค่า organization

## UX Model

ควรแยกให้ชัด:

- Home / overview
- Sidebar navigation
- Workspace
- Tasks
- Chat
- Monitor
- Canvas
- Settings

อย่าให้ทุกอย่างกองในหน้าเดียวจน scan ยาก

## Permission Model

ต้องถามเสมอ:

- user เป็นสมาชิก org นี้ไหม
- role อนุญาต action นี้ไหม
- workspace นี้อยู่ใน org เดียวกันไหม
- task/chat belongs to workspace/org นี้ไหม

## Data Rules

- org data ต้องไม่ leak ข้าม org
- member list จำกัดตาม role
- task update validate ownership/org
- chat message validate membership
- settings update validate admin/owner role

## UI Rules

- Sidebar active state ชัด
- Empty state ของ workspace/task/chat ชวน action ต่อ
- Status badge ใช้ consistent label
- Task form มี owner, due date, status, priority ถ้ามี
- Chat ไม่ควรบัง nav บน mobile
- Settings ต้องมี confirmation เมื่อ action สำคัญ

## Type Safety

ถ้าชน Supabase generated type:

- พยายามใช้ type ที่ถูกต้องก่อน
- ถ้าต้อง cast Json ให้จำกัด boundary
- อย่ากระจาย `any` ทั่ว module
- document shape ของ JSON fields

## Tests

- non-member cannot read org
- member can read allowed workspace
- non-admin cannot update settings
- task update preserves org boundary
- chat message requires membership
- mobile nav does not break

## Red Flags

- query ไม่ filter org_id/workspace_id
- settings update ได้โดย member ธรรมดา
- chat ของ org หนึ่งเห็นในอีก org
- JSON update cast กว้างจน typecheck ไม่ช่วย
- dashboard แสดงข้อมูลข้าม org
