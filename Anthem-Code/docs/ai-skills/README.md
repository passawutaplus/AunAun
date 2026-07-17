# Anthem AI Skills

ใช้เอกสารนี้เมื่อทำงานใน `Anthem-Code`

## อ่านตามประเภทงาน

- **Product direction / feature ใหม่ (อ่านก่อน skill นี้):** [`../MASTER_CURSOR_BRIEF.md`](../MASTER_CURSOR_BRIEF.md) → `../product/*` → `../research/*`
- Product/feature ใหม่: `ANTHEM_PRODUCT_SKILL.md`
- UX/UI/demo/usability: `ANTHEM_UX_RESEARCH_SKILL.md`
- **ใบเสนอราคาในแชท (รอบถัดไป — อ้างอิง Fastwork):** [`../product/fastwork-quotation-ux-reference.md`](../product/fastwork-quotation-ux-reference.md) · เกต `isAplus1ChatOffersEnabled()`
- Referral/PX/reward/cashout copy: `ANTHEM_REFERRAL_REWARD_SKILL.md`
- **Payments / Omise / hire money / FX display (ไม่ใช่ PX):** `ANTHEM_PAYMENTS_SKILL.md` + [`../payments-omise.md`](../payments-omise.md)
- Report/moderation/profanity/community trust: `ANTHEM_COMMUNITY_SAFETY_SKILL.md`
- Android/iOS/app readiness: `ANTHEM_MOBILE_APP_SKILL.md`
- Launch/content/referral campaign: `ANTHEM_MARKETING_SKILL.md`
- รองรับ community/user/post/referral เพิ่มขึ้น: `ANTHEM_COMMUNITY_SCALING_SKILL.md`

## Shared skills ที่ควรอ่านร่วม

จาก root monorepo:

- `docs/ai-skills/PRODUCT_CONTEXT.md`
- `docs/ai-skills/CODING_RULES.md`
- `docs/ai-skills/SECURITY_CHECKLIST.md`
- `docs/ai-skills/UX_UI_RULES.md`
- `docs/ai-skills/RELEASE_CHECKLIST.md`
- `docs/ai-skills/SCALING_READINESS_SKILL.md`

## Prompt แนะนำ

```text
อ่าน Anthem-Code/docs/ai-skills/README.md และ skill ที่เกี่ยวข้องกับงานนี้ก่อน
จากนั้นสรุป product rule, UX rule, security rule ที่ต้องระวัง
แล้วค่อยเสนอแผน/แก้โค้ด
```

## Most Important Rule

Anthem ต้อง optimize ไปที่:

1. เข้าใจ product ภายใน 10 วินาที
2. login แล้วรู้ next step
3. publish/post งานแรกได้
4. referral/reward ชัดและกัน abuse
5. community รู้สึกปลอดภัยพอสำหรับ public beta
6. feed/referral/moderation รองรับ user เพิ่มขึ้นโดยไม่พัง
