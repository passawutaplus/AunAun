# So1o + Pixel100 — Demo Pack สำหรับ UX Review

ส่งลิงก์นี้ให้ UX researcher ทดลองใช้ (ประมาณ 30–45 นาที)

---

## Links

| App | URL | คู่มือละเอียด |
|-----|-----|---------------|
| **Pixel100** | https://1px-demo.vercel.app | **[ux-research-review.md](../Anthem-Code/docs/ux-research-review.md)** — เช็คลิสครบ A–T · [/research](https://1px-demo.vercel.app/research) |

> แบรนด์ **Pixel100** · canonical `pixel100.com` (ยังไม่จดโดเมน) · URL ชั่วคราวบน Vercel

| **So1o** | https://solo-demo-liart.vercel.app | **[ux-research-review.md](../Solo-Code/docs/ux-research-review.md)** — เช็คลิสครบ A–T · [/research](https://solo-demo-liart.vercel.app/research) |

> **Ops Hub** — admin only ไม่แนะนำให้ reviewer ทั่วไป

---

## Login สรุป

| App | วิธี |
|-----|------|
| Pixel100 | `phatsawut@demo.pixel100.com` / `pixel100-demo-seed` — [รายชื่อเพิ่ม](../Anthem-Code/docs/demo-catalog.md) |
| So1o | Google หรือสมัครอีเมล — บันทึกถาวร ชำระเงิน sandbox |

---

## Feedback ที่อยากได้

- ภาษาไทยอ่านง่ายไหม / hierarchy
- First impression · flow จ้างงาน / สมัคร
- จุดติดขัด · mobile vs desktop

---

## Out of scope

ชำระเงินจริง · KYC/AML admin · Admin panels · Ops Hub

---

## Maintainer checklist

- [x] DNS + HTTPS (`./scripts/deploy-ecosystem.sh --https`) — ใช้ Vercel demo URLs แทน VPS
- [x] `./scripts/prepare-demo.sh`
- [x] Login demo สำเร็จทั้งสองแอป (ทดสอบมือ: Pixel100 demo account + So1o Google) — auth pages OK มิ.ย. 2026; login จริงทดสอบก่อนส่ง UX reviewer

ดู [deploy-vps.md](deploy-vps.md)
