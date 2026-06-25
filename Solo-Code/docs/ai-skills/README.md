# Solo AI Skills

ใช้เอกสารนี้เมื่อทำงานใน `Solo-Code`

## อ่านตามประเภทงาน

- Product/feature ใหม่: `SOLO_PRODUCT_SKILL.md`
- Payment/cashout/Stripe/escrow: `SOLO_PAYMENT_SECURITY_SKILL.md`
- In-house org/workspace/task/chat: `SOLO_INHOUSE_SKILL.md`
- Dashboard/admin/workflow UX: `SOLO_UX_WORKFLOW_SKILL.md`
- Deploy/env/Supabase/CI/ops: `SOLO_PRODUCTION_OPS_SKILL.md`

## Shared skills ที่ควรอ่านร่วม

จาก root monorepo:

- `docs/ai-skills/PRODUCT_CONTEXT.md`
- `docs/ai-skills/CODING_RULES.md`
- `docs/ai-skills/SECURITY_CHECKLIST.md`
- `docs/ai-skills/UX_UI_RULES.md`
- `docs/ai-skills/RELEASE_CHECKLIST.md`

## Prompt แนะนำ

```text
อ่าน Solo-Code/docs/ai-skills/README.md และ skill ที่เกี่ยวข้องกับงานนี้ก่อน
ถ้างานแตะเงิน/payment/cashout ให้อ่าน SOLO_PAYMENT_SECURITY_SKILL.md และ docs/ai-skills/SECURITY_CHECKLIST.md ก่อนเสมอ
สรุปความเสี่ยงก่อนแก้โค้ด
```

## Most Important Rule

Solo ต้อง optimize ไปที่:

1. payment/cashout ถูกต้องและ audit ได้
2. dashboard scan ง่าย
3. in-house permission ไม่รั่ว
4. production deploy stable
5. operational UI ใช้งานซ้ำได้ ไม่ใช่แค่สวย
