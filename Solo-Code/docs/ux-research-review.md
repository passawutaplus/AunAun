# So1o Freelancer — คู่มือ UX/UI Research (เช็คลิสครบ A–T)

> **URL เดโม่:** https://solo-demo-liart.vercel.app  
> **คู่มือในแอป:** https://solo-demo-liart.vercel.app/research  
> **สรุปสั้น:** [`ux-research-demo.md`](./ux-research-demo.md)

---

## สรุปสั้น ๆ

| หัวข้อ   | รายละเอียด                                                      |
| -------- | --------------------------------------------------------------- |
| แบรนด์   | **So1o Freelancer** — หลังบ้านครบวงจรสำหรับฟรีแลนซ์ไทย          |
| ประเภท   | Pipeline, ใบเสนอราคา, Job Tracker, ภาษี, Smart Brief            |
| ภาษา     | ไทยเป็นหลัก                                                     |
| ระยะเวลา | Quick **45–60 นาที** (T1–T4) · Full **2–3 ชม.** (เช็คลิส A–T)   |
| Login    | สมัครบัญชีตัวเอง (Google หรืออีเมล) — **ไม่ใช่**บัญชี demo ร่วม |
| ชำระเงิน | Stripe **sandbox** เท่านั้น (`4242 4242 4242 4242`)             |

---

## วิธีใช้เช็คลิส

1. อ่าน **ข้อควรระวัง demo** ด้านล่าง
2. เลือก **Persona** ตามบทบาทที่จะทดสอบ
3. ทำ **Moderated tasks (T1–T8)** ถ้ามี facilitator — หรือข้ามไปเช็คลิสตามหมวด
4. ไล่ **Feature checklist (A–T)** ทีละระบบ — tick `[ ]` เมื่อทดสอบแล้ว
5. ประเมิน **Design foundation** ข้ามฟีเจอร์
6. บันทึก feedback ตาม template ท้ายเอกสาร

### อุปกรณ์ที่แนะนำ

- Desktop Chrome (หลัก)
- iPhone Safari (**375×812**)
- Android Chrome
- iPad แนวตั้ง (**768×1024**) ถ้ามี
- Desktop **1280+** สำหรับ layout กว้าง

---

## อ่านก่อนเริ่ม (โหมด demo)

- บัญชีทดสอบ **บันทึกถาวร** — อย่าใส่ข้อมูลส่วนตัวจริง
- ชำระเงินเป็น **sandbox** เท่านั้น
- สมัครบัญชีของตัวเอง — แต่ละ researcher แยก user (ต่างจาก Pixel100 ที่ใช้บัญชีร่วม)
- แบนเนอร์ด้านบน: `โหมดทดสอบ — บันทึกได้จริง ชำระเงินเป็น sandbox` + ลิงก์ **คู่มือ UX**

---

## Persona

| Persona            | วิธีเตรียม                      | โฟกัส                              |
| ------------------ | ------------------------------- | ---------------------------------- |
| ฟรีแลนซ์ใหม่       | สมัครใหม่ (Google แนะนำ)        | Landing, onboarding, QT แรก, Brief |
| ฟรีแลนซ์ที่มีงาน   | บัญชีที่มี Pipeline/QT/Job แล้ว | Pipeline, Track, รายได้, ภาษี      |
| ฟรีแลนซ์อัปเกรด    | บัญชี Free ที่ใช้มาแล้ว         | `/pricing`, Pro checkout sandbox   |
| ทีมเล็ก (optional) | สมัคร In-House                  | `/inhouse/...` workspace           |

---

## Moderated tasks (T1–T8)

| ID  | หัวข้อ                    | Persona          |
| --- | ------------------------- | ---------------- |
| T1  | First impression (Guest)  | Guest            |
| T2  | Sign up & onboarding      | ฟรีแลนซ์ใหม่     |
| T3  | Pipeline → Quotation      | ฟรีแลนซ์ใหม่     |
| T4  | Smart Brief + ลิงก์ลูกค้า | ฟรีแลนซ์ใหม่     |
| T5  | Job Tracker + Track link  | ฟรีแลนซ์ active  |
| T6  | รายได้ & ภาษี             | ฟรีแลนซ์ active  |
| T7  | Subscription sandbox      | ฟรีแลนซ์ upgrade |
| T8  | Help, Feedback, Support   | ทุก persona      |

รายละเอียดขั้นตอน + คำถามสัมภาษณ์ — ดูในแอปที่ `/research` หรือ `src/data/uxResearchGuide.ts`

---

## Feature checklist (A–T)

| ID  | หมวด                    |
| --- | ----------------------- |
| A   | Landing & conversion    |
| B   | Auth & session          |
| C   | Onboarding & Home       |
| D   | Pipeline & deals        |
| E   | Smart Brief & Meeting   |
| F   | Quotations & PDF        |
| G   | Job Tracker & Track     |
| H   | Income & finance        |
| I   | Tax sandbox             |
| J   | Subscription & pricing  |
| K   | Clients & My Data       |
| L   | Planner                 |
| M   | Settings & integrations |
| N   | Help Center             |
| O   | Assistant & Mentor      |
| P   | In-House (optional)     |
| Q   | Public token pages      |
| R   | Legal & trust           |
| S   | Mobile & PWA            |
| T   | Errors & support        |

---

## Feedback template

บันทึก: Persona · Task (T1–T8 หรือ A–T) · Severity · path + viewport · Screenshot · ข้อเสนอ

คำถามเปิด:

- ภาษาไทยอ่านง่ายไหม — คำศัพท์ฟรีแลนซ์/ภาษี
- First impression 10 วินาที — เข้าใจไหม
- Flow รับงาน→เก็บเงิน — ติดตรงไหน
- Mobile vs Desktop — จุดที่ใช้ยากสุด
- So1o vs Pixel100 — เข้าใจความต่างไหม

ส่งผ่าน **FeedbackFab** หรือ **Support Hub** ใน Dashboard

---

## Out of scope

- Stripe production · Admin `/admin` · Ops Hub
- KYC/AML admin · อีเมลจริงไปลูกค้าจริง
- LINE notification production (ต้องตั้งค่า OAuth แยก)

---

## Maintainer

- เนื้อหา structured: `src/data/uxResearchGuide.ts`
- หน้าในแอป: `src/routes/research.tsx`
- อัปเดตเช็คลิส A–T เมื่อ ship ฟีเจอร์ใหม่ใน My Desk
