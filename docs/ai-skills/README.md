# AI Skills Index

เอกสารชุดนี้คือ "memory pack" สำหรับให้ Cursor, Codex หรือ AI coding assistant เข้าใจทิศทางของ ecosystem ก่อนแก้โค้ด

ใช้เมื่อ:
- เริ่มงานรอบใหม่หลัง `git pull`
- ให้ AI รีวิว/แก้ UX/UI
- ให้ AI แตะระบบ security, payment, referral, Supabase หรือ deploy
- ต้องการกันไม่ให้ AI แก้ผิด product direction

## วิธีใช้กับ Cursor

ส่ง prompt แบบนี้ก่อนเริ่มงาน:

```text
อ่าน docs/ai-skills/README.md และไฟล์ skill ที่เกี่ยวข้องก่อนแก้โค้ด
ถ้างานเกี่ยวกับ Anthem ให้อ่าน Anthem-Code/docs/ai-skills/*
ถ้างานเกี่ยวกับ Solo ให้อ่าน Solo-Code/docs/ai-skills/*
สรุปสิ่งที่เข้าใจก่อนลงมือแก้ และห้ามขัดกับ security/release checklist
```

## Shared Skills

1. `PRODUCT_CONTEXT.md` - ภาพรวม ecosystem และบทบาทของแต่ละเว็บ
2. `CODING_RULES.md` - กติกาเขียนโค้ดและแก้ repo
3. `SECURITY_CHECKLIST.md` - security baseline สำหรับทั้งสองเว็บ
4. `UX_UI_RULES.md` - design/UX rules สำหรับงานหน้าเว็บ
5. `RELEASE_CHECKLIST.md` - checklist ก่อน push/merge/deploy

## Anthem Skills

อยู่ใน `Anthem-Code/docs/ai-skills/`

1. `ANTHEM_PRODUCT_SKILL.md`
2. `ANTHEM_UX_RESEARCH_SKILL.md`
3. `ANTHEM_REFERRAL_REWARD_SKILL.md`
4. `ANTHEM_COMMUNITY_SAFETY_SKILL.md`
5. `ANTHEM_MOBILE_APP_SKILL.md`
6. `ANTHEM_MARKETING_SKILL.md`

## Solo Skills

อยู่ใน `Solo-Code/docs/ai-skills/`

1. `SOLO_PRODUCT_SKILL.md`
2. `SOLO_PAYMENT_SECURITY_SKILL.md`
3. `SOLO_INHOUSE_SKILL.md`
4. `SOLO_UX_WORKFLOW_SKILL.md`
5. `SOLO_PRODUCTION_OPS_SKILL.md`

## กติกาสำคัญ

- ถ้า AI ไม่แน่ใจว่าแก้ใน repo ไหน ให้ถามก่อน
- ห้ามใช้โฟลเดอร์ย่อยที่มี `.git` เก่าค้างเป็น source of truth
- `AunAun` คือ monorepo สำหรับ sync ภาพรวม
- `Anthem-Code` และ `Solo-Code` ยังเป็น standalone repo แยกสำหรับ deploy/ทำงานเฉพาะเว็บ
- ห้าม commit secrets, service role key, production token, Stripe secret, Supabase access token
- งานที่แตะเงิน, reward, referral, wallet, RLS, auth ต้องอ่าน security skill ก่อนเสมอ
