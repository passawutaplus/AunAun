# Pixel100 — คู่มือ UX/UI Research (เช็คลิสครบ)

> **URL เดโม่:** https://1px-demo.vercel.app  
> **คู่มือในแอป:** https://1px-demo.vercel.app/research  
> **Canonical:** https://pixel100.com · **Demo:** https://1px-demo.vercel.app

---

## สรุปสั้น ๆ

| หัวข้อ | รายละเอียด |
|--------|------------|
| แบรนด์ | **Pixel100** — ชุมชนฟรีแลนซ์ครีเอทีฟ ทุกคนคือ 1 pixel |
| ประเภท | พอร์ตโฟลิโอ + ชุมชน + จับคู่งานเบา ๆ |
| ภาษา | ไทยเป็นหลัก |
| ระยะเวลา | Quick **45–60 นาที** (T1–T4) · Full **2–3 ชม.** (เช็คลิส A–T) |

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
- Mobile Safari หรือ Chrome Android (**375×812**)
- iPad แนวตั้ง (**768×1024**) ถ้ามี
- Desktop **1280+** สำหรับ layout กว้าง

---

## อ่านก่อนเริ่ม (โหมด demo)

- บัญชี `*@demo.pixel100.com` บันทึกถาวร — ใช้ร่วมกัน **อย่าสมัครใหม่**
- อย่าใส่ข้อมูลส่วนตัวจริง · ไม่มีการชำระเงินจริง
- รหัสผ่านทุกบัญชีส่งให้ผู้รีวิวผ่านช่องทางส่วนตัวและหมุนใหม่หลังจบรอบรีวิว
- บัญชีอื่น ๆ ดูใน [`demo-catalog.md`](./demo-catalog.md) (50 ครีเอเตอร์)

---

## Persona & บัญชีทดสอบ

| Persona | อีเมล | ใช้ทดสอบ |
|---------|--------|----------|
| **ครีเอเตอร์ใหม่** | `phatsawut@demo.pixel100.com` | Onboarding, Welcome PX, สร้าง/เผยแพร่ผลงาน |
| **ครีเอเตอร์ยอดนิยม** | `napatsara@demo.pixel100.com` | Engagement, ของขวัญ, คอลเลกชัน |
| **ผู้จ้าง / สำรวจงาน** | `chatchai@demo.pixel100.com` | Jobs, คำขอจ้าง, แชท |

---

## Journey ผู้ใช้ใหม่ (New user UX)

ตอบโจทย์: *คนใหม่รู้ว่าต้องทำอะไรต่อไหม?*

| # | ขั้น | ที่ไหน | เกณฑ์ UX |
|---|------|--------|----------|
| 1 | Guest เปิดหน้าแรก | `/` | เข้าใจ value prop “ทุกคนคือ 1 PX” ภายใน 10 วิ |
| 2 | Guest กด action ที่ต้อง login | Bottom nav, ไลก์, จ้างงาน | Auth dialog ชัด ไม่หลง |
| 3 | Login demo | `/auth` | ไม่สับสนกับ production signup |
| 4 | หลัง login ครั้งแรก | `/portfolio` | Welcome checklist 8 ภารกิจ — next step ชัด |
| 5 | รับ Welcome PX | Checklist | เข้าใจ PX คืออะไร — progress 0/500 |
| 6 | เผยแพร่ผลงานแรก | `/portfolio/new` | Attestation + `/legal/ip` ไม่น่ากลัว/สับสน |

**เช็คลิส journey**

- [ ] Guest เข้าใจเว็บภายใน 10 วิ
- [ ] Auth prompt ชัดเมื่อ guest กด action
- [ ] Login demo ไม่ชวนสมัครใหม่
- [ ] Checklist แสดงทันทีหลัง login
- [ ] PX gamification ช่วย ไม่รบกวน
- [ ] Publish ครั้งแรก + attestation ลื่น

---

## Design & UI foundation

เช็คลิสข้ามฟีเจอร์ — เน้น visual/UX

- [ ] **Brand & messaging** — คอนเซปต์ 1 PX สื่อสารได้; tagline ไม่ซ้ำ concept ในหน้าเดียว
- [ ] **Typography ไทย** — อ่านง่าย บรรทัดยาวไม่แตกแปลก
- [ ] **Visual hierarchy** — การ์ดผลงาน, ปุ่มจ้าง/คอลแลป/สนับสนุน แยกชัด
- [ ] **Navigation** — bottom nav (mobile) vs header (desktop) ไม่หลง
- [ ] **Responsive** — safe-area, chat ซ่อน bottom nav, editor บน mobile
- [ ] **States** — skeleton / empty / error ภาษาไทยเข้าใจใน 3 วิ
- [ ] **Microcopy** — จ้าง vs คอลแลป vs สมัครงาน ไม่สับสน
- [ ] **Trust & legal** — cookie banner, footer legal, `/legal/ip` อ่านง่าย
- [ ] **Accessibility** — focus ring, alt รูป, contrast ปุ่มสำคัญ
- [ ] **Pixel100 vs So1o** — ผู้ใช้ใหม่เข้าใจความต่างหน้าร้าน vs หลังบ้าน

---

## Moderated tasks (T1–T8)

### T1 — ค้นหาดีไซเนอร์จากฟีด · Guest

1. เปิดหน้าแรก `/`
2. สลับแท็บ ผลงาน / ดีไซเนอร์ / สตูดิโอ
3. เปิดโปรไฟล์และผลงาน 2–3 รายการ

**สำเร็จเมื่อ:** เข้าใจว่าฟีดช่วยค้นหาและประเมินครีเอเตอร์ได้เร็วแค่ไหน

**ถาม:** ภายใน 10 วิ เข้าใจว่าเว็บทำอะไรไหม? · จะเลือกครีเอเตอร์จากอะไร?

---

### T2 — Onboarding + Welcome PX · phatsawut@

1. Login ด้วยบัญชี demo
2. ไป `/portfolio` ดู Welcome checklist
3. ทำ 2–3 ภารกิจและกดรับ PX

**สำเร็จเมื่อ:** รู้ว่าหลัง login ทำอะไรต่อ และเข้าใจ PX

**ถาม:** Checklist ช่วยหรือรบกวน? · PX คืออะไรในความเข้าใจคุณ?

---

### T3 — สร้างและเผยแพร่ผลงาน + attestation · phatsawut@

1. ไป `/portfolio/new`
2. กรอกข้อมูล + อัปโหลดรูป
3. ติ๊ก attestation แล้ว publish

**สำเร็จเมื่อ:** เผยแพร่ได้โดยเข้าใจข้อกำหนดลิขสิทธิ์

**ถาม:** Attestation อ่านเข้าใจไหม? · Editor บน mobile เป็นอย่างไร?

---

### T4 — จ้างงาน vs ขอคอลแลป · chatchai@

1. เปิดผลงานจากฟีด
2. กดจ้างงาน — สังเกตฟอร์ม
3. กดขอคอลแลป — เปรียบเทียบ

**สำเร็จเมื่อ:** ไม่สับสนระหว่างจ้าง vs คอลแลป

**ถาม:** ความต่างชัดไหม? · หลังส่งแล้วคาดหวังอะไร?

---

### T5 — สำรวจงานและสมัคร · chatchai@

1. ไป `/jobs`
2. อ่านประกาศ 2–3 รายการ
3. ลองสมัครหรือโพสต์งาน

**สำเร็จเมื่อ:** เห็นภาพรวมตลาดงานครีเอทีฟไทย

**ถาม:** Jobs ต่างจากจ้างจากผลงานอย่างไร?

---

### T6 — แชทและการแจ้งเตือน · phatsawut@ + chatchai@

1. เปิด `/chat`
2. ส่งข้อความใน thread
3. เปิด `/notifications`

**สำเร็จเมื่อ:** ติดตามการสนทนาและเหตุการณ์ใหม่ได้

---

### T7 — ส่ง PX และคอลเลกชัน · chatchai@ → napatsara@

1. ส่ง PX จากผลงาน napatsara
2. บันทึกผลงานลง collection
3. เปิด `/collections`

**สำเร็จเมื่อ:** สนับสนุนและเก็บผลงานที่ชอบได้

**ถาม:** PX สับสนกับเงินจริงไหม?

---

### T8 — รายงานและ feedback · ทุก persona

1. รายงานคอมเมนต์หรือผลงาน
2. กด FeedbackFab
3. เปิด `/me/reports`

**สำเร็จเมื่อ:** รู้ช่องทางรายงานและส่ง feedback

---

## Feature checklist (A–T)

### A — Discovery & Feed

**Paths:** `/`, `/?mode=designers`, `/?mode=studios`, `/explore/:kind/:value`  
**บัญชี:** Guest หรือทุก persona

- [ ] Hero + tagline อ่านเข้าใจภายใน 10 วิ
- [ ] แท็บ ผลงาน/ดีไซเนอร์/สตูดิโอ สลับ smooth
- [ ] การ์ดผลงาน — รูป, ชื่อ, หมวด, engagement ชัด
- [ ] Empty state ภาษาไทย
- [ ] Explore / หมวดหมู่ — นำทางกลับฟีดได้

**สำเร็จเมื่อ:** ค้นหาและประเมินครีเอเตอร์จากฟีดได้โดยไม่ต้องถาม

---

### B — โปรไฟล์ & ผลงาน public

**Paths:** `/u/:id`, `/@username`, `/project/:id`, `/similar/:id`

- [ ] โปรไฟล์ — avatar, bio, skills, grid
- [ ] ติดตาม / แชร์ / รายงาน
- [ ] Project detail — gallery, tools, stats, side panel
- [ ] ไลก์ + คอมเมนต์ (guest → auth prompt)
- [ ] Similar images

---

### C — Auth & Session

**Paths:** `/auth`, `/auth/callback`

- [ ] Auth dialog / หน้า /auth — CTA ชัด
- [ ] Demo login hint ในโหมด demo
- [ ] Redirect กลับหน้าเดิมหลัง login
- [ ] Logout แล้ว refresh ยัง logged out

---

### D — Onboarding & Welcome PX

**Paths:** `/portfolio` (Welcome checklist) · **บัญชี:** phatsawut@

- [ ] Checklist 8 ภารกิจ + ลิงก์ไปหน้าที่เกี่ยวข้อง
- [ ] ปุ่มรับ PX + progress 0/500
- [ ] Celebration เมื่อครบ
- [ ] Dismiss ได้

---

### E — Portfolio manage

**Paths:** `/portfolio`, `/portfolio/manage`

- [ ] Portfolio grid + stats
- [ ] Manage — hiring / collab tabs
- [ ] แชร์ @username

---

### F — Project editor

**Paths:** `/portfolio/new`, `/portfolio/:id/edit`

- [ ] ฟอร์ม editor + gallery DnD
- [ ] Tool picker + license
- [ ] AI assist (optional)
- [ ] Attestation + `/legal/ip`
- [ ] Publish vs Draft

---

### G — Jobs

**Paths:** `/jobs`, `/jobs/:id` · **บัญชี:** chatchai@

- [ ] Jobs list + filter
- [ ] Job detail + สมัคร
- [ ] โพสต์งาน
- [ ] ReportTrigger บนงาน

---

### H — Hiring & Collab

**Paths:** ProjectSidePanel → `/portfolio/manage?focus=`

- [ ] ปุ่มจ้างงาน vs ขอคอลแลป — copy ต่างกัน
- [ ] ฟอร์ม + validation + toast
- [ ] ผู้รับเห็นใน manage tab

---

### I — Chat

**Paths:** `/chat`, `/chat/:id`

- [ ] Inbox + thread
- [ ] Report user/message
- [ ] Mobile — keyboard, bottom nav ซ่อน

---

### J — Notifications

**Paths:** `/notifications`

- [ ] List + mark read + deep link
- [ ] Badge บน bottom nav

---

### K — Collections & Inspire

**Paths:** `/collections`, `/inspire/:boardId`

- [ ] Collections CRUD + save popover
- [ ] Inspire board

---

### L — Gifting, PX & Earnings

**Paths:** SupportButton, `/earnings`

- [ ] DonationModal — welcome_px vs earned
- [ ] /earnings breakdown + cashout (demo)

---

### M — Studio

**Paths:** `/s/doi-studio`, `/studio/new`, `/studio/manage`

- [ ] Studio public page
- [ ] สร้าง / จัดการ / invites

---

### N — Contracts

**Paths:** `/contracts`, `/contracts/new`

- [ ] List + editor + sign flow

---

### O — Settings & Verify

**Paths:** `/settings`, `/verify`

- [ ] Profile, skills, notification toggles
- [ ] LINE section (Pro+)
- [ ] ลิงก์ /me/reports, /me/feedback

---

### P — Upgrade & Ads

**Paths:** `/upgrade`, `/advertise`, `/ads/:id`

- [ ] Plan comparison ไม่ aggressive
- [ ] Advertise form

---

### Q — Trust & Safety

**Paths:** ReportTrigger, FeedbackFab, `/me/reports`, `/me/feedback`

- [ ] Report — project, profile, comment, chat, job
- [ ] Evidence upload
- [ ] FeedbackFab ไม่บังเนื้อหา

---

### R — Legal & Privacy

**Paths:** `/legal/*`

- [ ] privacy, terms, cookies, rights, **ip**
- [ ] Cookie banner
- [ ] IP สอดคล้อง editor attestation

---

### S — Assistant & Help

- [ ] AnthemAssistantFab
- [ ] /research + DemoModeBanner

---

### T — Errors & 404

- [ ] 404 + /error/*
- [ ] ปุ่มกลับ home
- [ ] Network error feedback

---

## แผนที่หน้า (grouped)

### Public

| หน้า | Path |
|------|------|
| ฟีดหลัก | `/` |
| งาน | `/jobs` |
| ลงโฆษณา | `/advertise` |
| อัปเกรด | `/upgrade` |
| คู่มือ UX | `/research` |
| สตูดิโอตัวอย่าง | `/s/doi-studio` |

### Auth

| เข้าสู่ระบบ | `/auth` |

### Creator (login)

| พอร์ตโฟลิโอ | `/portfolio` |
| จัดการคำขอ | `/portfolio/manage` |
| สร้างผลงาน | `/portfolio/new` |
| รายได้ | `/earnings` |
| ตั้งค่า | `/settings` |

### Community (login)

| แชท | `/chat` |
| การแจ้งเตือน | `/notifications` |
| คอลเลกชัน | `/collections` |
| สัญญา | `/contracts` |

### Me

| รายงานของฉัน | `/me/reports` |
| Feedback | `/me/feedback` |

### Legal

| ความเป็นส่วนตัว | `/legal/privacy` |
| ข้อกำหนด | `/legal/terms` |
| คุกกี้ | `/legal/cookies` |
| สิทธิข้อมูล | `/legal/rights` |
| ลิขสิทธิ์ | `/legal/ip` |

---

## Feedback template

บันทึกแต่ละประเด็น:

| ฟิลด์ | ตัวอย่าง |
|-------|---------|
| Persona | phatsawut@ |
| Task / Section | T3 หรือ F |
| Severity | blocker / major / minor / suggestion |
| หน้า + viewport | `/portfolio/new` · 375px |
| Screenshot | แนบ |
| ข้อเสนอ | … |

**คำถามเปิด**

- ภาษาไทยอ่านง่ายไหม — คำศัพท์ tech/ฟรีแลนซ์
- คอนเซปต์ "ทุกคนคือ 1 PX" สื่อสารได้หรือยัง
- ผู้ใช้ใหม่รู้ next step หลัง login ไหม
- Mobile vs Desktop — จุดที่ใช้ยากที่สุด
- Empty / loading / error — เข้าใจไหม
- ความต่าง Pixel100 vs So1o — เข้าใจไหม

ส่งกลับทีมผ่านช่องทางที่กำหนด (Figma / Notion / Google Form)

---

## Out of scope

- การชำระเงิน / Stripe จริง
- KYC/AML admin flows
- Admin panel (`/admin`) — staff only
- So1o back-office
- Ops Hub
- จดทะเครื่องหมาย / โดเมน production

---

## ภาคผนวก — Admin (Optional / staff only)

ไม่บังคับ UX researcher ทั่วไป

- [ ] `/admin` nav ครบ
- [ ] Reports / feedback batch actions
- [ ] CSV export

---

## เอกสารที่เกี่ยวข้อง

- [`ux-demo-guide.md`](./ux-demo-guide.md) — seed demo data
- [`demo-catalog.md`](./demo-catalog.md) — 50 บัญชี demo
- [`qa-checklist.md`](./qa-checklist.md) — QA engineering (คนละ audience)
