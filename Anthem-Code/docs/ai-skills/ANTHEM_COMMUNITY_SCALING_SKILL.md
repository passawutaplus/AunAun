# Anthem Community Scaling Skill

ใช้เมื่อเตรียม Anthem ให้รองรับผู้ใช้ community มากขึ้น เช่น creator, post, comment, follow, referral, notification และ report volume

## Goal

Anthem ต้อง scale โดยยังรักษา:

- feed เร็ว
- onboarding ลื่น
- referral ไม่โดน abuse
- moderation รับมือ content เพิ่มได้
- notification ไม่กลายเป็น spam
- community quality ไม่ตก

## Growth Stages

### Closed Review

- reviewer 20-50 คน
- ใช้ usability checklist
- focus: first impression, first post, reward clarity

### Creator Seed

- creator 30-100 คน
- project 70-200 ชิ้น
- jobs/studios/comments พอให้เว็บมีชีวิต
- focus: feed quality, creator profile, shareability

### Soft Launch

- user 100-1,000 คน
- referral beta
- focus: activation, first post rate, abuse detection

### Public Beta

- user 1,000-10,000 คน
- daily content
- focus: moderation queue, notification volume, feed performance

## Core Community Tables

ต้องระวัง scaling:

- profiles/users
- projects/posts
- comments
- likes
- follows
- collections
- notifications
- chat/messages
- reports
- referral records
- reward ledgers
- jobs/applications

## Feed Scaling

Rules:

- feed ต้อง paginate
- card query ต้องเบา
- image thumbnail ต้อง optimized
- engagement count อาจ denormalize/cache เมื่อโต
- filter by category/tag/tool ต้องมี index
- public feed ไม่ควร join private data

Checklist:

- [ ] feed card ไม่ใช้ `select *`
- [ ] limit/cursor มีทุก query
- [ ] creator/profile lookup มี index
- [ ] category/tag/tool filter มี index หรือ strategy
- [ ] similar/project recommendations ไม่ query หนักทุก render
- [ ] empty/loading/error ไม่ flicker

## First Post Scaling

First post คือ activation core

ต้องดู:

- upload reliability
- draft autosave ถ้ามี
- duplicate publish prevention
- attestation/IP copy
- reward trigger idempotency
- notification after publish

Checklist:

- [ ] user publish ซ้ำไม่สร้าง reward ซ้ำ
- [ ] failed upload recover ได้
- [ ] reward claim after first post atomic
- [ ] feed update หลัง publish ไม่ช้า
- [ ] mobile editor ใช้งานได้

## Referral Scaling

เมื่อเปิด referral public ต้องเพิ่ม guard:

- campaign budget cap
- suspicious pattern detection
- disposable-email screening ถ้ามี
- device/IP risk scoring ถ้ามี
- admin review queue for large payouts
- referral activation rate dashboard

Red flags:

- reward จ่ายเมื่อ signup เฉย ๆ
- referrer reward ไม่มี first post requirement
- ไม่มี unique ledger
- ไม่มี self-referral guard
- ไม่มี budget visibility

## Moderation Scaling

เมื่อ content เยอะ:

- reports ต้องเข้า queue
- admin ต้อง filter by severity/status/type
- duplicate reports ต้อง group ได้
- reporter privacy protected
- evidence access controlled
- profanity/spam detection ต้องช่วย triage แต่ไม่แทนมนุษย์ทั้งหมด

Checklist:

- [ ] report project/profile/comment/job/message ได้
- [ ] report queue มี status
- [ ] admin batch action มี audit
- [ ] evidence ไม่ public
- [ ] spam link flagged
- [ ] appeal/review path มีถ้าจำเป็น

## Notification Scaling

ต้องกัน notification flood:

- group likes/follows
- throttle repeated notifications
- user preferences
- digest for low-priority events
- high-priority: hire, collab, chat, reward, report/admin

Checklist:

- [ ] notification list paginated
- [ ] mark read efficient
- [ ] badge count ไม่ query หนัก
- [ ] deep link ใช้งานได้
- [ ] push/email preference ready before app launch

## Community Quality Metrics

Primary:

- first post rate
- post per active creator
- creator 7-day retention
- referral activated users
- report rate per active user
- time to moderation action

Secondary:

- likes/comments/follows
- profile completion
- collection saves
- hire/collab requests
- chat starts

## Launch Gates

ก่อนเปิดคนเยอะ:

- [ ] feed performance accepted
- [ ] first post success rate acceptable
- [ ] referral rules enforced server-side
- [ ] report/moderation works
- [ ] notification volume not noisy
- [ ] demo/seed content quality high enough
- [ ] admin can handle reports
- [ ] no service role in client

## AI Instructions

ถ้า AI เพิ่ม community feature ต้องตอบ:

1. Feature นี้เพิ่ม row ใน table ไหน
2. ต้อง paginate ไหม
3. มี index ไหม
4. มี abuse vector ไหม
5. มี report/moderation impact ไหม
6. user จะได้รับ notification เยอะขึ้นไหม

