# Anthem UX Research Skill

## Purpose

ใช้ skill นี้เมื่อทำงานเกี่ยวกับ:

- usability review
- onboarding
- first post flow
- referral/reward understanding
- mobile UX
- demo readiness
- feedback synthesis

## Research Goal

Anthem ต้องพิสูจน์ 4 อย่างก่อนเปิด public:

1. ผู้ใช้เข้าใจ value ภายใน 10 วินาที
2. ผู้ใช้ใหม่รู้ว่าต้องทำอะไรหลัง login
3. creator publish/post งานแรกได้จริง
4. PX/referral/reward ไม่ทำให้สับสนหรือไม่น่าเชื่อถือ

## Recommended Usability Session

ระยะเวลา: 45-60 นาที  
จำนวน reviewer รอบแรก: 8-15 คน  
กลุ่ม reviewer:

- 5 creator/designer
- 3 student/junior creator
- 2 client/hiring user
- 2 community/safety reviewer
- optional: 1-3 power creator หรือ affiliate

## Core Tasks

### T1 - First Impression

Prompt:

> เปิดหน้าแรกแล้วบอกว่าเว็บนี้คืออะไร และคุณจะกดอะไรต่อ

Observe:

- ใช้เวลาเข้าใจนานไหม
- อ่าน tagline แล้วเข้าใจไหม
- ดู feed แล้วรู้ไหมว่าเป็น community
- CTA เด่นพอไหม

Pass:

- อธิบาย product ได้โดยไม่ต้องช่วย
- รู้ action ถัดไป

### T2 - Explore as Guest

Prompt:

> ลองหาครีเอเตอร์หรือผลงานที่คุณสนใจ

Observe:

- feed scan ง่ายไหม
- project/profile detail ช่วยตัดสินใจไหม
- guest action เปิด auth prompt ชัดไหม

### T3 - Login and Onboarding

Prompt:

> เข้าสู่ระบบ แล้วบอกว่าระบบอยากให้คุณทำอะไรต่อ

Observe:

- redirect หลัง login
- checklist/mission ชัดไหม
- PX เข้าใจไหม

### T4 - First Project/Post

Prompt:

> ลองสร้างหรือเผยแพร่ผลงานแรก

Observe:

- หาปุ่มสร้างงานเจอไหม
- form ยาวเกินไหม
- upload ลื่นไหม
- attestation/IP ทำให้กลัวไหม
- publish แล้วเห็นผลลัพธ์ไหม

### T5 - Referral and Reward

Prompt:

> ลองดูว่าคุณจะชวนเพื่อนยังไง และจะได้ reward เมื่อไหร่

Observe:

- เงื่อนไข 20px/100px/50px ชัดไหม
- แยก welcome vs earned ได้ไหม
- เข้าใจ cashout 1,000px ไหม
- มี incentive แต่ไม่ spammy ไหม

### T6 - Hire / Collab / Jobs

Prompt:

> ถ้าคุณอยากจ้างหรือร่วมงานกับ creator คนนี้ คุณจะทำอย่างไร

Observe:

- hire vs collab ชัดไหม
- form ส่งแล้วคาดหวังอะไรต่อ
- jobs ต่างจาก project hire ไหม

### T7 - Trust and Safety

Prompt:

> ถ้าเจอผลงานหรือคอมเมนต์ที่มีปัญหา คุณจะรายงานอย่างไร

Observe:

- report หาเจอไหม
- evidence/reason ชัดไหม
- feedback button ไม่บัง UI
- legal/IP อ่านง่ายไหม

### T8 - Mobile Check

Prompt:

> ใช้ flow เดิมบนมือถือ

Observe:

- bottom nav
- modal
- keyboard
- upload/editor
- text overflow

## Scoring

ให้คะแนน 1-5:

- 5 ลื่น เข้าใจทันที
- 4 ใช้ได้ดี สะดุดเล็กน้อย
- 3 ใช้ได้แต่ต้องเดา
- 2 สับสน ต้องช่วย
- 1 ทำไม่สำเร็จ

Severity:

- Blocker: เปิด public ไม่ได้
- Major: กระทบ conversion/activation/trust
- Minor: ใช้ได้แต่สะดุด
- Suggestion: ปรับ polish

## Feedback Fields

ทุก issue ควรมี:

- persona
- task
- page/path
- viewport/device
- severity
- expected
- actual
- screenshot/video
- suggested fix

## Usability PDF

ใช้ไฟล์ล่าสุด:

- `output/pdf/anthem-usability-review-checklist.pdf`
- `output/pdf/anthem-usability-review-checklist.md`

ถ้าปรับ feature ใหม่ ต้องอัปเดต checklist ให้ reviewer ทันด้วย

## Research Synthesis

หลังเก็บ feedback ให้จัดกลุ่ม:

1. Activation blockers
2. Reward/referral confusion
3. Mobile usability
4. Trust/safety concerns
5. Copy/messaging
6. Visual polish
7. Feature request

Priority formula:

`impact on activation/trust x frequency x severity`

## Do Not

- อย่าฟังเฉพาะคำชม
- อย่าแก้ตามทุก suggestion ถ้าขัด product direction
- อย่าวัดแค่ signup ให้ดู first post และ return intent
- อย่าถาม leading question เช่น "ระบบนี้เข้าใจง่ายใช่ไหม"
- อย่าส่ง demo โดยไม่มี ground rules เรื่องข้อมูลส่วนตัว
