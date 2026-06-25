# Product Context

## Ecosystem Overview

ระบบนี้มี 3 repo หลัก:

1. `AunAun`
   - monorepo / ecosystem snapshot
   - รวม Anthem, Solo และ Ops/เอกสารภาพรวม
   - ใช้ดูความสัมพันธ์ระหว่างระบบ
   - ไม่ควรทำให้โฟลเดอร์ย่อยกลายเป็น nested git repo อีก

2. `Anthem-Code`
   - creator community platform
   - ใช้สำหรับ demo, community launch, creator onboarding, referral, reward
   - โฟกัส public-facing product และ mobile app readiness

3. `Solo-Code`
   - freelance/business operations platform
   - โฟกัส payment, cashout, dashboard, in-house workflow, admin/ops
   - เป็นส่วนที่จริงจังเรื่องเงิน, client work, documents, operational flow

## Product Relationship

Anthem และ Solo ไม่ใช่เว็บเดียวกัน แต่ช่วยกันใน ecosystem:

- Anthem = หน้าชุมชน / discovery / creator identity / community growth
- Solo = หลังบ้านธุรกิจ / payment / workflow / operations / client delivery
- AunAun = กล่องรวม source และแนวคิดเพื่อ sync ecosystem

## Anthem Positioning

Anthem คือ community สำหรับ creator/designer ไทย:

- โชว์ผลงาน
- สร้าง profile/portfolio
- หาโอกาสจ้างงานหรือ collab
- ทำ community activity เช่น like, comment, follow, collection, chat
- มี PX, mission, referral, reward เพื่อกระตุ้น activation

คำอธิบายสั้น:

> Anthem คือพื้นที่ให้ครีเอเตอร์ไทยโชว์งาน หาโอกาส และเติบโตผ่าน community activity จริง

## Solo Positioning

Solo คือระบบสำหรับ freelance/business operation:

- จัดการงาน ลูกค้า โปรเจกต์
- payment/cashout/Stripe
- dashboard และ admin
- in-house workspace, task, chat, monitoring
- production ops และ financial safety

คำอธิบายสั้น:

> Solo คือระบบหลังบ้านสำหรับฟรีแลนซ์และทีมที่ต้องจัดการงาน เงิน และ operation ให้ปลอดภัย

## Primary Audiences

### Anthem

- junior designer / creative student
- freelance creator
- creator ที่อยากมี portfolio + community
- brand/client ที่อยากค้นหา creator
- creator/affiliate ที่ช่วยชวนคนเข้าระบบ

### Solo

- freelancer ที่รับงานจริง
- creator ที่เริ่มมีรายได้
- client / hiring party
- internal ops/admin
- small creative team / in-house team

## Business Model Themes

- referral and affiliate ที่จ่ายตาม performance จริง
- PX reward เพื่อกระตุ้น active user
- earned PX / cashout ต้องแยกจาก welcome PX
- payment/escrow/cashout ต้องปลอดภัยและตรวจสอบย้อนหลังได้
- community quality สำคัญกว่าสมัครเยอะอย่างเดียว

## Source of Truth

- ถ้าทำ UX/UI Anthem demo: เริ่มจาก `Anthem-Code`
- ถ้าทำ payment/cashout/dashboard: เริ่มจาก `Solo-Code`
- ถ้าทำ ecosystem sync หรือดูภาพรวม: ใช้ `AunAun`
- ถ้าขัดกันระหว่าง repo ให้ดู standalone repo ที่ deploy จริงก่อน แล้วค่อย sync เข้า AunAun

## Anti-Goals

- ไม่ทำ landing page สวยแต่ใช้งานจริงไม่ได้
- ไม่เพิ่ม reward ที่ก่อ abuse โดยไม่มี guard
- ไม่ผูก cashout กับ welcome reward
- ไม่ใช้ service role ใน client
- ไม่ทำ UI ที่อ่านภาษาไทยยาก
- ไม่ทำ workflow ที่ต้องเดาเองหลัง login
