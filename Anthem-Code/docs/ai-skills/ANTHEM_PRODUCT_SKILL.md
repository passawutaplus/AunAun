# Anthem Product Skill

> **Canonical product pack (2026-07):** อ่าน [`../MASTER_CURSOR_BRIEF.md`](../MASTER_CURSOR_BRIEF.md) และ [`../product/aplus1-prd.md`](../product/aplus1-prd.md) ก่อน skill นี้ — thesis **ผลงานจริง → โอกาส**, North Star = project-qualified conversations

## Product Definition

Aplus1 (Anthem) คือแพลตฟอร์มโอกาสสำหรับครีเอเตอร์ไทย — ไม่ใช่ marketplace แบบ package-first หรือ job board ทั่วไป

Anthem ไม่ใช่แค่ portfolio builder แต่เป็น community ที่รวม:

- discovery feed
- creator profile
- project showcase
- jobs/hiring/collab
- follow/comment/like/collection/chat
- PX reward / mission
- referral and affiliate
- trust, report, moderation

## Core Promise

> ช่วยให้ครีเอเตอร์ไทยโชว์งาน หาโอกาส และเริ่มมี community activity จริงตั้งแต่วันแรก

## Primary User Journeys

### Guest

1. เปิดหน้าแรก
2. เข้าใจว่าเว็บคือ creator community
3. browse feed/designers/studios
4. เปิด project/profile
5. กด action เช่น like/hire/follow แล้วเห็น auth prompt

### New Creator

1. สมัครหรือ login
2. เห็น onboarding/mission
3. เข้าใจ PX/reward
4. ตั้ง profile
5. publish งานแรก
6. แชร์/referral

### Active Creator

1. post งานเพิ่ม
2. รับ like/comment/follow
3. ได้ request hire/collab
4. manage profile/requests
5. สะสม earned PX / cashout เมื่อเข้าเงื่อนไข

### Client / Hiring User

1. ค้นหา creator จาก feed/profile
2. ดูงานและ credibility
3. กด hire หรือ collab
4. ส่งรายละเอียดโจทย์
5. ติดตาม chat/notification

## Key Product Concepts

### PX

- PX เป็น reward/credit concept ของ ecosystem
- welcome PX ใช้กระตุ้น onboarding แต่ถอนไม่ได้
- earned PX เกิดจาก action ที่มีคุณภาพ เช่น referral ที่เพื่อน active แล้ว
- cashout ต้องใช้ earned PX และขั้นต่ำ 1,000 px

### First Meaningful Action

Action ที่ถือว่าสำคัญ:

- publish project แรก
- post community/work แรก ถ้าระบบรองรับ
- complete core mission ที่ทำให้ user active จริง

ไม่ควรให้ reward ใหญ่จากแค่ signup

### Community Quality

Anthem ต้องดูมีชีวิตก่อน public launch:

- มี creator seed
- มีผลงานจริง/น่าดู
- มี engagement
- มี jobs หรือ hiring examples
- มี report/feedback/trust mechanism

## Feature Priority

### Must Have for Demo Review

- หน้าแรก/feed เข้าใจง่าย
- profile/project detail ดูน่าเชื่อ
- onboarding หลัง login
- create/publish first work
- referral/reward copy ชัด
- report/feedback
- mobile layout ไม่พัง

### Must Have for Public Beta

- referral attribution ถูกต้อง
- anti-abuse guard
- notifications/chats ใช้ได้
- creator eligibility/cashout copy ชัด
- admin moderation ขั้นพื้นฐาน
- production env and deploy stable

### Later

- full app store native flow
- advanced creator analytics
- campaign budget/risk scoring
- deeper marketplace/payment integration

## Product Rules for AI

- อย่าเปลี่ยน Anthem ให้กลายเป็น generic landing page
- อย่าลดความสำคัญของ first post / activation
- อย่าเพิ่ม reward ที่ไม่ผูกกับ real activity
- อย่าเขียน copy ที่ทำให้ผู้ใช้คิดว่า PX = เงินสดทันที
- อย่าแก้ feature community โดยไม่คิด trust/safety
- ถ้าแก้ onboarding ต้องดู mobile ด้วย

## Success Metrics

- signup to first post rate
- first post completion time
- referral to active user conversion
- number of daily projects/posts
- creator 7-day return
- hire/collab request rate
- report rate and moderation response

## Open Questions to Ask Before Big Changes

1. งานนี้เพิ่ม activation หรือแค่เพิ่ม feature?
2. ผู้ใช้ใหม่จะเข้าใจเร็วขึ้นไหม?
3. reward rule ยังกัน abuse ได้ไหม?
4. mobile ใช้ง่ายขึ้นหรือยากขึ้น?
5. reviewer ภายนอกจะ test ได้ไหมโดยไม่ต้องถามทีม?
