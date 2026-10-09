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

เว็บร้าน BlackSmith อยู่คนละ repo ไม่ได้อยู่ในโฟลเดอร์นี้:

- `F:\blacksmith-tools` (GitHub `blacksmithtools`) — ร้านอุปกรณ์เสริมเครื่องมือช่าง, พิมพ์ 3D, ผู้ช่วยงานช่างที่ `/assistant`
- ผูกไว้ใน `AunAun.code-workspace` แล้ว ห้ามสร้าง `Craftsman-Code` หรือ `Blacksmith-Code` ซ้ำใน monorepo

## Product Relationship

Anthem และ Solo ไม่ใช่เว็บเดียวกัน แต่ช่วยกันใน ecosystem:

- Anthem = หน้าชุมชน / discovery / creator identity / community growth
- Solo = หลังบ้านธุรกิจ / payment / workflow / operations / client delivery
- AunAun = กล่องรวม source และแนวคิดเพื่อ sync ecosystem

## SAMECOR (โฟลเดอร์ `Anthem-Code/`)

ชื่อที่ผู้ใช้เห็นคือ **SAMECOR** โฟลเดอร์โค้ดยังชื่อ `Anthem-Code` โดเมนหลักคือ `samecor.com` (`aplus1.app` redirect มาที่นี่)

SAMECOR = SAME + CORE คนละสายงาน แต่มีแกนร่วมกัน ผลงานคือตัวตน แพลตฟอร์มเชื่อมผลงานนั้นเข้ากับคน โปรเจกต์ และโอกาส

- แท็กไลน์: **You Create. We Connect.**
- การเดินทาง: **Create your profile. Connect through your work. Discover new opportunities.**
- คำสัญญา: **1 Profile. 100+ Opportunities.**
- อธิบายแบรนด์: **Your work says who you are. SAMECOR connects it to what’s next.**

สิ่งที่ผลิตภัณฑ์ทำ:

- สร้างโปรไฟล์จากผลงานจริง
- เชื่อมผ่านงานนั้น เป็นบทสนทนา จ้างงาน คอลแลป เข้าทีม หรือโอกาสอื่น
- ค้นพบคนจากทำเนียบ และรูปแบบอื่นของงานเดียวกัน เช่น Packages และ Objects

คำอธิบายสั้น:

> SAMECOR คือที่ที่ผลงานของคุณเชื่อมคุณกับคน โปรเจกต์ และโอกาสถัดไป

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
- ถ้าทำร้าน BlackSmith / ผู้ช่วยงานช่าง / หน้าเกี่ยวกับเราของร้าน: เริ่มจาก `F:\blacksmith-tools`
- ถ้าทำ ecosystem sync หรือดูภาพรวม: ใช้ `AunAun`
- ถ้าขัดกันระหว่าง repo ให้ดู standalone repo ที่ deploy จริงก่อน แล้วค่อย sync เข้า AunAun

## Anti-Goals

- ไม่ทำ landing page สวยแต่ใช้งานจริงไม่ได้
- ไม่เพิ่ม reward ที่ก่อ abuse โดยไม่มี guard
- ไม่ผูก cashout กับ welcome reward
- ไม่ใช้ service role ใน client
- ไม่ทำ UI ที่อ่านภาษาไทยยาก
- ไม่ทำ workflow ที่ต้องเดาเองหลัง login
