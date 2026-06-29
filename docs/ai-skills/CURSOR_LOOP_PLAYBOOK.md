# Cursor Loop Playbook

สูตร `/loop` สำหรับเฝ้างานใน Agent chat — copy ไปใช้ได้เลย

อ้างอิง: [.cursor/rules/deploy-workflow.mdc](../../.cursor/rules/deploy-workflow.mdc) · [ecosystem-deploy-policy.md](../ecosystem-deploy-policy.md) · [demo-pack.md](../demo-pack.md)

## เมื่อไหร่ใช้อะไร

| สถานการณ์ | ใช้ |
|-----------|-----|
| เฝ้า CI / deploy / smoke ใน session | `/loop` (ไฟล์นี้) |
| สั่ง deploy demo หรือ prod | deploy-workflow rule |
| workflow ถาวร (PR, Slack, schedule) | Cursor Automations |

## กติกา

- ห้าม loop deploy **production** โดยไม่ยืนยัน
- ก่อน prod ต้อง `./scripts/check-migrations-pending.sh` — มีค้างให้หยุด
- ห้าม commit secrets / service role / Stripe secret
- หยุด loop: พิมพ์ `หยุด loop` หรือ `stop loop`

## App alias

| พูด | แอป | โฟลเดอร์ |
|-----|-----|----------|
| aplus1, 1px, anthem | Aplus1 | `Anthem-Code/` |
| solo, so1o | Solo | `Solo-Code/` |

---

## สูตร

### CI บน branch ปัจจุบัน

```text
/loop 2m ตรวจ GitHub Actions บน branch นี้ ถ้า fail สรุป error และแนะนำ fix
```

### Migration ก่อน deploy prod

```text
/loop 5m รัน ./scripts/check-migrations-pending.sh ถ้ามีค้าง แจ้งรายการและหยุด deploy prod
```

### Smoke หลัง deploy demo — Aplus1

```text
/loop 3m รัน BASE_URL=<preview-url> Anthem-Code/scripts/smoke-public.sh สรุปผล
```

Production: `BASE_URL=https://aplus1.app`

### Smoke หลัง deploy demo — Solo

```text
/loop 3m รัน BASE_URL=<preview-url> Solo-Code/scripts/smoke-public.sh สรุปผล
```

Production: `BASE_URL=https://solofreelancer.com`

### แก้ CI จน green (dynamic — ไม่ระบุ interval)

```text
/loop แก้ CI บน branch นี้จน green แล้วสรุป diff ที่แก้
```

### เฝ้า demo ระหว่าง UX review

```text
/loop 10m เช็ค demo URLs ใน docs/demo-pack.md ว่ายัง up และ login demo Aplus1 ได้
```

Login demo Aplus1: `phatsawut@demo.pixel100.com` / `pixel100-demo-seed`

### งาน payment / Stripe (Solo)

```text
/loop 2m ตรวจ CI บน branch นี้ อ่าน Solo-Code/docs/ai-skills/SOLO_PAYMENT_SECURITY_SKILL.md ก่อนสรุป
```
