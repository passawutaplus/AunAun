# So1o + 1PX — Demo Pack สำหรับ UX Review

ส่งลิงก์นี้ให้ UX researcher ทดลองใช้ (ประมาณ 30–45 นาที)

---

## Links

| App | URL | คู่มือละเอียด |
|-----|-----|---------------|
| **1PX** | https://1px-demo.vercel.app | [ux-research-review.md](../Anthem-Code/docs/ux-research-review.md) · [/research](https://1px-demo.vercel.app/research) |
| **So1o** | https://www.solofreelancer.com | [ux-research-demo.md](../Solo-Code/docs/ux-research-demo.md) |

> **Ops Hub** — admin only ไม่แนะนำให้ reviewer ทั่วไป

---

## Login สรุป

| App | วิธี |
|-----|------|
| 1PX | `phatsawut@demo.an1hem.app` / `an1hem-demo-seed` — [รายชื่อเพิ่ม](../Anthem-Code/docs/demo-catalog.md) |
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

- [ ] DNS + HTTPS (`./scripts/deploy-ecosystem.sh --https`)
- [ ] `./scripts/prepare-demo.sh`
- [ ] Login demo สำเร็จทั้งสองแอป

ดู [deploy-vps.md](deploy-vps.md)
