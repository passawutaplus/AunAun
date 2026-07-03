# So1o + Aplus1 — Demo Pack สำหรับ UX Review

Updated: 2026-07-03

ส่งลิงก์นี้ให้ UX researcher ทดลองใช้ (ประมาณ 30–45 นาที)

---

## Links

| App | URL | คู่มือละเอียด |
|-----|-----|---------------|
| **Aplus1** | https://aplus1-demo.vercel.app | **[ux-research-review.md](../Anthem-Code/docs/ux-research-review.md)** — เช็คลิสครบ A–T · [/research](https://aplus1-demo.vercel.app/research) · [PDF checklist](https://aplus1-demo.vercel.app/aplus1-ux-usability-checklist.pdf) |
| **So1o** | https://solo-demo-liart.vercel.app | **[ux-research-review.md](../Solo-Code/docs/ux-research-review.md)** — เช็คลิสครบ A–T · [/research](https://solo-demo-liart.vercel.app/research) |

> แบรนด์ **Aplus1** · production `https://aplus1.app` · demo บน Vercel  
> **Ops Hub** — admin only ไม่แนะนำให้ reviewer ทั่วไป

---

## Login สรุป

| App | วิธี |
|-----|------|
| Aplus1 | `phatsawut@demo.pixel100.com` / `pixel100-demo-seed` — [รายชื่อเพิ่ม](../Anthem-Code/docs/demo-catalog.md) |
| So1o | Google หรือสมัครอีเมล — บันทึกถาวร ชำระเงิน sandbox |

---

## Local demo setup (Aplus1)

### เปิดโหมดทดสอบบนเครื่อง

ใน `Anthem-Code/.env` (ไม่ commit):

```env
VITE_DEMO_MODE=true
```

จะแสดงแถบบนสุดพร้อมวิธี login demo · dev server → http://localhost:8080

### รัน seed (20 ครีเอเตอร์ + กิจกรรมครบ)

```bash
cd Anthem-Code
export SUPABASE_ACCESS_TOKEN=sbp_...   # Dashboard → Account → Access Tokens
npm run seed:demo-full
```

หรือขั้นตอนแยก: `npm run seed:demo` แล้ว `npm run seed:demo-chats`

ดูรายชื่อครบใน [demo-catalog.md](../Anthem-Code/docs/demo-catalog.md)

### เช็กลิสต์ UX หลัง seed

- [ ] หน้าแรก `/` — ฟีดโหลด skeleton ไม่กระพริบ "ไม่พบผลงาน"
- [ ] Hero แสดงตัวเลขดีไซเนอร์/ผลงาน
- [ ] แท็บดีไซเนอร์ / สตูดิโอ — การ์ด + empty state ภาษาไทย
- [ ] เปิด `/u/{demo-uuid}` — โปรไฟล์ + ผลงาน
- [ ] `/project/{id}` — รายละเอียด + จ้าง/คอลแลป
- [ ] `/jobs`, `/s/doi-studio`
- [ ] Login demo → `/portfolio`, `/notifications`, `/chat`, `/collections`
- [ ] Welcome Bonus / ส่งของขวัญ / `/earnings` (earned_px vs welcome_px)

### ลบ demo ก่อน production

`Anthem-Code/scripts/sql/purge-demo-users.sql` + ลบ `auth.users` ที่ `@demo.pixel100.com`

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

Deploy: [ecosystem-deploy-policy.md](ecosystem-deploy-policy.md) · [deploy-vps.md](deploy-vps.md) (ทางเลือก self-host)
