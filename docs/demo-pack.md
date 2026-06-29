# So1o + Aplus1 — Demo Pack สำหรับ UX Review

ส่งลิงก์นี้ให้ UX researcher ทดลองใช้ (ประมาณ 30–45 นาที)

---

## Links

| App | URL | คู่มือละเอียด |
|-----|-----|---------------|
| **Aplus1** | https://aplus1-demo.vercel.app | **[ux-research-review.md](../Anthem-Code/docs/ux-research-review.md)** — เช็คลิสครบ A–T · [/research](https://aplus1-demo.vercel.app/research) · [PDF checklist](https://aplus1-demo.vercel.app/aplus1-ux-usability-checklist.pdf) |

> แบรนด์ **Aplus1** · production `https://aplus1.app` · demo บน Vercel

| **So1o** | https://solo-demo-liart.vercel.app | **[ux-research-review.md](../Solo-Code/docs/ux-research-review.md)** — เช็คลิสครบ A–T · [/research](https://solo-demo-liart.vercel.app/research) |

> **Ops Hub** — admin only ไม่แนะนำให้ reviewer ทั่วไป

---

## Login สรุป

| App | วิธี |
|-----|------|
| Aplus1 | `phatsawut@demo.pixel100.com` / `pixel100-demo-seed` — [รายชื่อเพิ่ม](../Anthem-Code/docs/demo-catalog.md) |
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

- [x] DNS + HTTPS — production `aplus1.app` บน Vercel `aplus1-prod`
- [x] `./scripts/prepare-demo.sh`
- [ ] Login demo สำเร็จทั้งสองแอปก่อนส่ง UX reviewer

ดู [deploy-vps.md](deploy-vps.md) · [ecosystem-deploy-policy.md](ecosystem-deploy-policy.md)
