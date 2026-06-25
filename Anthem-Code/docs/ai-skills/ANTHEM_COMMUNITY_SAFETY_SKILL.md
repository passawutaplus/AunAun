# Anthem Community Safety Skill

## Purpose

ใช้เมื่อแก้:

- report/feedback
- moderation
- profanity/spam detection
- project/profile/comment/chat safety
- admin reports
- trust/legal copy

## Safety Principles

- community ต้องรู้สึกปลอดภัยก่อน scale
- report ต้องหาเจอ แต่ไม่เด่นจนทำลาย experience
- moderation ต้องไม่เปิดเผย reporter
- false positive ต้องไม่ทำให้ creator ดี ๆ รู้สึกถูกลงโทษ
- safety copy ควรช่วย user ไม่ขู่เกินไป

## Reportable Targets

ควรรองรับ:

- project
- profile/user
- comment
- chat/message
- job post
- studio
- feedback/general issue

## Report Flow

Required fields:

- reason
- optional detail
- evidence upload ถ้ามี
- target id/type
- reporter id
- status

Statuses:

- open
- reviewing
- resolved
- dismissed

UX:

- success message หลัง report
- duplicate open report ต้องจัดการอย่างสุภาพ
- user ดู report ของตัวเองได้
- admin ดูและ batch action ได้

## Profanity and Spam

ควรตรวจ:

- Thai vulgar words
- English vulgar words
- spaced Thai evasion
- leetspeak/common symbol evasion เช่น `f*ck`
- telegram/line spam links
- repeated promotional text

อย่าทำ:

- block คำที่อาจเป็นคำปกติแบบไม่มี context มากเกิน
- show raw profanity detector reason ที่ technical
- rely เฉพาะ client-side detection

## Trust UI

ควรมี:

- report button
- feedback button
- legal/IP page
- privacy/terms/cookies
- creator attestation ตอน publish
- visible but calm safety copy

## Admin Safety

- admin role ต้อง enforce server-side
- admin reports page ต้อง filter ได้
- evidence files ต้อง private หรือ controlled access
- CSV export ไม่ควรมีข้อมูลเกินจำเป็น
- admin action ควรมี audit trail

## Safety Tests

- guest report behavior
- logged-in report project
- duplicate report
- report with evidence
- user sees own reports only
- admin changes status
- profanity detection core cases
- clean content allowed
- spam link flagged

## Launch Readiness

ก่อน public beta:

- [ ] report project/profile/comment/job ได้
- [ ] feedback form ใช้งานได้
- [ ] admin review basic flow ใช้ได้
- [ ] legal/IP copy ไม่ทำให้ creator กลัวเกิน
- [ ] profanity/spam smoke test ผ่าน
- [ ] no private report data leaked

## Red Flags

- report ส่งแล้วไม่มี feedback
- reporter identity โผล่ให้ reported user
- evidence file public
- admin page เข้าได้โดย user ธรรมดา
- profanity blocks normal Thai content จำนวนมาก
- legal copy ทำให้ creator ไม่กล้า publish
