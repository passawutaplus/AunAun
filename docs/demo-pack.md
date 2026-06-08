# So1o + an1hem — Demo Pack สำหรับ UX Review / สัมภาษณ์

ส่งเอกสารนี้พร้อมลิงก์ให้ freelancer UX/UI หรือผู้สัมภาษณ์ทดลองใช้ (ประมาณ 30–45 นาที)

---

## Links (Production)

| App | URL | คำอธิบาย |
|-----|-----|----------|
| **an1hem** | https://an1hem.app | ชุมชนครีเอเตอร์ — ฟีด, โปรไฟล์, จ้างงาน, สตูดิโอ |
| **So1o** | https://www.solofreelancer.com | โต๊ะฟรีแลนซ์ — pipeline, ใบเสนอราคา, desk |

> **Ops Hub** (https://hq.solofreelancer.com) — admin only ไม่แนะนำให้ reviewer ทั่วไป

---

## Test login (an1hem)

| Field | Value |
|-------|-------|
| Email | `phatsawut@demo.an1hem.app` |
| Password | `an1hem-demo-seed` |

มีบัญชี demo 50 คน — เปลี่ยน username ก่อน `@demo.an1hem.app` ได้ (รายชื่อใน [Anthem-Code/docs/demo-catalog.md](../Anthem-Code/docs/demo-catalog.md))

เมื่อเปิด **โหมดทดสอบ** จะมีแถบด้านบนแสดงวิธี login

---

## So1o login

- สมัครด้วย **Google** ได้ (ถ้าไม่มีบัญชี demo)
- หรือสร้างบัญชีอีเมล/รหัสผ่านปกติ
- Early Access lock **ปิด** ใน demo build (`VITE_EARLY_ACCESS=false`)

---

## Suggested UX review path (an1hem)

1. หน้าแรก `/` — ฟีด, skeleton, ตัวเลขชุมชน
2. แท็บดีไซเนอร์ / สตูดิโอ
3. เปิดโปรไฟล์ `/u/{uuid}` — ผลงาน, ติดตาม
4. เปิดผลงาน `/project/{id}` — จ้าง / collab
5. `/jobs` — ประกาศงาน
6. Login demo → `/portfolio`, `/notifications`, `/chat`
7. Mobile viewport (375px) — navigation, touch targets

---

## Suggested path (So1o)

1. Landing / signup
2. Dashboard หลัง login
3. Pipeline (ถ้ามีข้อมูล)
4. ลิงก์ไป an1hem จาก ecosystem

---

## Feedback ที่อยากได้

- ความชัดของภาษาไทย / hierarchy
- First impression หน้าแรก
- Flow จ้างงาน / สมัคร / ค้นหาคน
- จุดที่สับสนหรือติดขัด
- Mobile vs desktop

---

## Out of scope (ยังไม่สมบูรณ์)

- ชำระเงินจริง (Stripe test mode)
- KYC / ถอน Pixel / AML admin
- Admin panels เต็มรูปแบบ
- Ops Hub PM workspace (สัมภาษณ์ internal เท่านั้น)

---

## English summary (for international reviewers)

**an1hem** is a Thai creative community portfolio app. Use `phatsawut@demo.an1hem.app` / `an1hem-demo-seed` to log in. Browse the feed, profiles, projects, and jobs. **So1o** is the freelancer desk at solofreelancer.com — sign in with Google or email. Please focus on UX clarity, Thai copy, and mobile layout.

---

## Maintainer checklist (ก่อนส่งลิงก์)

- [ ] DNS ชี้ VPS + HTTPS (`./scripts/deploy-ecosystem.sh --https`)
- [ ] `./scripts/prepare-demo.sh` (auth URLs + seed + ops migration)
- [ ] เปิด https://an1hem.app — ฟีดมีข้อมูล
- [ ] Login demo สำเร็จ
- [ ] Google OAuth บน So1o ทำงาน

ดู [deploy-vps.md](deploy-vps.md) สำหรับ deploy เต็มรูปแบบ
