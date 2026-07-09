# Aplus1 — คู่มือ UX/UI Research (เช็คลิสครบ)

> **URL Production:** https://aplus1.app  
> **คู่มือในแอป:** https://aplus1.app/research  
> **ส่งผลทดสอบ:** https://aplus1.app/research/feedback  
> **Demo (optional):** https://aplus1-demo.vercel.app

---

## สรุปสั้น ๆ

| หัวข้อ | รายละเอียด |
|--------|------------|
| แบรนด์ | **Aplus1** — 1 โปรไฟล์ สู่ 100+ โอกาส |
| ประเภท | พอร์ตโฟลิโอ + ชุมชน + จับคู่งานเบา ๆ |
| ภาษา | ไทยเป็นหลัก |
| ระยะเวลา | Quick **60–90 นาที** (T1–T4) · Full **2.5–3.5 ชม.** (เช็คลิส A–W) |

---

## วิธีใช้เช็คลิส

1. อ่าน **ข้อควรระวัง production** ด้านล่าง
2. เลือก **Persona** ตามบทบาท — สมัครบัญชีใหม่ที่ `/auth`
3. ทำ **Moderated tasks (T1–T11)** ถ้ามี facilitator — หรือข้ามไปเช็คลิสตามหมวด
4. ไล่ **Feature checklist (A–W)** ทีละระบบ — tick `[ ]` เมื่อทดสอบแล้ว
5. ประเมิน **Design foundation** ข้ามฟีเจอร์
6. บันทึก feedback ตาม template ท้ายเอกสาร

### อุปกรณ์ที่แนะนำ

- Desktop Chrome (หลัก)
- Mobile Safari หรือ Chrome Android (**375×812**)
- iPad แนวตั้ง (**768×1024**) ถ้ามี
- Desktop **1280+** สำหรับ layout กว้าง

---

## ตัวอย่างหน้าจอ

ในแอปที่ [`/research`](https://aplus1.app/research) แต่ละหมวดเช็คลิส (A–W) ที่มีภาพอ้างอิงจะแสดง **ตัวอย่างหน้าจอ** ใต้บรรทัดบัญชีทดสอบ — กด thumbnail เพื่อขยายดูรายละเอียด

ไฟล์ภาพอยู่ที่ `public/research/screenshots/` และอัปเดตจาก production ด้วย:

```bash
cd Anthem-Code
E2E_BASE_URL=https://aplus1.app npm run docs:ux-review-screenshots
```

ถ้า production โหลดไม่ครบ (หรือ `/auth` ใช้งานไม่ได้) สคริปต์จะ fallback ไป `https://aplus1-demo.vercel.app` สำหรับหน้า public และใช้ demo login สำหรับ `/chat` + `/settings` (ตั้ง `E2E_DEMO_PASSWORD` ถ้ารหัสหมุนแล้ว)

---

## อ่านก่อนเริ่ม (production)

- สมัครบัญชีใหม่ที่ `/auth` — ยืนยันอีเมลก่อนใช้งาน (อีเมล+รหัสผ่าน หรือ Google)
- บัญชีบันทึกถาวร — ผลงาน/โพสต์ที่ลงอยู่ในระบบจริง
- ใส่ข้อมูล mock ได้ — ไม่จำเป็นต้องใช้ข้อมูลส่วนตัวละเอียด
- อย่าชำระเงิน / อัปเกรดจ่ายจริง / ถอนเงิน / KYC จริง — ดู flow ได้แต่ไม่ต้องจบ transaction
- งาน 2 คน (แชท, จ้าง/คอลแลป) — ประสานกับ reviewer อีกคนหรือใช้บัญชีที่ 2

### Demo (optional)

ถ้าทดสอบบน demo แทน production:

- บัญชี `*@demo.pixel100.com` บันทึกถาวร — ใช้ร่วมกัน **อย่าสมัครใหม่**
- อย่าใส่ข้อมูลส่วนตัวจริง · ไม่มีการชำระเงินจริง
- รหัสผ่าน demo ส่งผ่านช่องทางส่วนตัว — หมุนใหม่หลังจบรอบรีวิว

---

## Persona & บัญชีทดสอบ

| Persona | บัญชี | ใช้ทดสอบ |
|---------|--------|----------|
| **ครีเอเตอร์ใหม่** | สมัครบัญชีใหม่ (ยังไม่มีผลงาน) | Onboarding, Welcome PX, ลงผลงานแรก, โพสต์ Area แรก |
| **ครีเอเตอร์ที่มีผลงาน** | บัญชีที่ลงผลงาน 2–3 ชิ้น + โพสต์ Area | โปรไฟล์ public, engagement, คอลเลกชัน, แท็บ Area/Drill |
| **ผู้สำรวจ / จ้างงาน** | บัญชีที่ 2 หรือจับคู่กับ reviewer อีกคน | Jobs, คำขอจ้าง/คอลแลป, แชท, So1o quote handoff |

---

## Journey ผู้ใช้ใหม่ (New user UX)

ตอบโจทย์: *คนใหม่รู้ว่าต้องทำอะไรต่อไหม?*

| # | ขั้น | ที่ไหน | เกณฑ์ UX |
|---|------|--------|----------|
| 1 | Guest เปิดหน้าแรก | `/` | เข้าใจ value prop “ทุกคนคือ 1 PX” ภายใน 10 วิ — hero, แท็บฟีด, ตัวเลขชุมชน |
| 2 | Guest กด action ที่ต้อง login | FloatingNav, +1, จ้างงาน | Auth dialog ชัด ไม่หลง — รู้ว่าต้อง login ก่อนทำอะไร |
| 3 | สมัครบัญชีใหม่ | `/auth` (สมัครสมาชิก) | ฟอร์มไม่ซับซ้อน — consent ชัด, error ภาษาไทย, รหัสผ่าน ≥ 8 ตัว |
| 4 | ยืนยันอีเมล | inbox → ลิงก์ยืนยัน | รู้ว่าต้องยืนยันก่อนใช้งาน — resend ใช้ได้, ไม่หลง |
| 5 | หลัง login ครั้งแรก | `/portfolio` | Welcome checklist 8 ภารกิจชัด — รู้ next step ทันที |
| 6 | รับ Welcome PX | `/portfolio` (checklist) | เข้าใจว่า PX คืออะไร ใช้ทำอะไร — progress 0/500, ปุ่มรับ PX |
| 7 | เผยแพร่ผลงานแรก | `/portfolio/new` | Attestation ลิขสิทธิ์ก่อน publish ไม่รู้สึกกลัว/สับสน — ลิงก์ `/legal/ip` ช่วยได้ |

**เช็คลิส journey**

- [ ] Guest เข้าใจเว็บภายใน 10 วิ
- [ ] Auth prompt ชัดเมื่อ guest กด action
- [ ] สมัคร+ยืนยันอีเมล ไม่สับสน
- [ ] Checklist แสดงทันทีหลัง login
- [ ] PX gamification ช่วย ไม่รบกวน
- [ ] Publish ครั้งแรก + attestation ลื่น

---

## Design & UI foundation

เช็คลิสข้ามฟีเจอร์ — เน้น visual/UX

- [ ] **Brand & messaging** — คอนเซปต์ 1 PX สื่อสารได้; tagline ไม่ซ้ำ concept ในหน้าเดียว
- [ ] **Typography ไทย** — thai-display / thai-body อ่านง่าย บรรทัดยาวไม่แตกแปลก
- [ ] **Visual hierarchy** — การ์ดผลงาน, ปุ่มจ้าง/คอลแลป/สนับสนุน แยกชัด
- [ ] **Navigation** — FloatingNav pill + FAB, Home vs Area, profile dropdown prefs
- [ ] **Responsive** — safe-area, chat 3-panel + mobile partner slide-over, editor บน mobile, dark mode
- [ ] **States** — skeleton / empty / error ภาษาไทยเข้าใจใน 3 วิ (รวม community editor, chat search empty)
- [ ] **Microcopy** — Projects vs Area, จ้าง vs คอลแลป vs สมัครงาน ไม่สับสน
- [ ] **Display prefs** — ธีม + grid density + Area layout persist และใช้ได้ทุกหน้า
- [ ] **Trust & legal** — cookie banner, footer legal, `/legal/ip`, `/legal/community` อ่านง่าย
- [ ] **Accessibility** — focus ring, alt รูป, contrast ปุ่มสำคัญ (รวม dark mode)
- [ ] **Aplus1 vs So1o** — handoff ใบเสนอราคาเข้าใจไหม

---

## Moderated tasks (T1–T11)

### T1 — ค้นหาดีไซเนอร์จากฟีด · Guest

1. เปิดหน้าแรก `/`
2. สลับ Projects / Area / ดีไซเนอร์ / สตูดิโอ
3. เปิดโปรไฟล์และผลงาน 2–3 รายการ

**สำเร็จเมื่อ:** เข้าใจว่าฟีดช่วยค้นหาและประเมินครีเอเตอร์ได้เร็วแค่ไหน

**ถาม:** ภายใน 10 วิ เข้าใจว่าเว็บทำอะไรไหม? · Home vs Area สับสนไหม?

---

### T2 — สมัคร + Onboarding + Welcome PX · บัญชีที่เพิ่งสมัคร

1. สมัครที่ `/auth` และยืนยันอีเมล
2. ไป `/portfolio` ดู Welcome checklist
3. ทำ 2–3 ภารกิจและกดรับ PX

**สำเร็จเมื่อ:** รู้ว่าหลังสมัคร+ยืนยันอีเมล ทำอะไรต่อได้ทันที และเข้าใจ PX

**ถาม:** ยืนยันอีเมลชัดไหม — ติดตรงไหน? · PX คืออะไรในความเข้าใจคุณ?

---

### T3 — สร้างและเผยแพร่ผลงาน + attestation · บัญชีครีเอเตอร์

1. ไป `/portfolio/new`
2. กรอกข้อมูล + อัปโหลดรูป
3. ติ๊ก attestation แล้ว publish

**สำเร็จเมื่อ:** เผยแพร่ได้โดยเข้าใจข้อกำหนดลิขสิทธิ์

**ถาม:** Attestation อ่านเข้าใจไหม — กลัวหรือมั่นใจ? · Editor บน mobile เป็นอย่างไร?

---

### T4 — จ้างงาน vs ขอคอลแลป · 2 บัญชี — hirer ส่ง + creator รับ

1. เปิดผลงานจากฟีด
2. กดจ้างงาน — สังเกตฟอร์ม
3. กดขอคอลแลป — เปรียบเทียบ
4. ผู้รับดูใน portfolio/manage

**สำเร็จเมื่อ:** ไม่สับสนระหว่างจ้าง vs คอลแลป

**ถาม:** ความต่างจ้าง vs คอลแลปชัดไหม? · หลังส่งแล้วคาดหวังอะไร?

---

### T5 — สำรวจงานและสมัคร · ผู้สำรวจ/จ้างงาน

1. ไป `/jobs`
2. อ่านประกาศ 2–3 รายการ
3. ลองสมัครหรือโพสต์งาน

**สำเร็จเมื่อ:** เห็นภาพรวมตลาดงานครีเอทีฟไทย

**ถาม:** Jobs ต่างจากจ้างจากผลงานอย่างไร? · การ์ดงานอ่านเร็วพอไหม?

---

### T6 — แชทและการแจ้งเตือน · 2 บัญชีคุยกัน

1. เปิด `/chat` — filter, search, pin
2. ส่งข้อความ + reply ใน thread
3. เปิด `/notifications` ดูรายการ

**สำเร็จเมื่อ:** ติดตามการสนทนาและเหตุการณ์ใหม่ได้

**ถาม:** Inbox หาห้องที่ต้องการง่ายไหม? · Partner panel ช่วยไหม?

---

### T7 — ส่ง PX และคอลเลกชัน · 2 บัญชี (หรือดูตัวเอง)

1. เปิดผลงาน → ส่ง PX
2. บันทึกผลงานลง collection
3. เปิด `/collections` ดูรายการ

**สำเร็จเมื่อ:** สนับสนุนและเก็บผลงานที่ชอบได้

**ถาม:** PX รู้สึกเหมือนเงินจริงไหม — สับสนไหม? · Save collection หาได้ไหม?

---

### T8 — รายงานและ feedback · ทุก persona

1. รายงานคอมเมนต์หรือผลงาน
2. กด FeedbackFab ส่ง feedback
3. เปิด `/me/reports` ดูสถานะ

**สำเร็จเมื่อ:** รู้ช่องทางรายงานปัญหาและส่งความคิดเห็น

**ถาม:** หาปุ่มรายงานได้ไหม — ซ่อนเกินไปไหม? · FeedbackFab รบกวนการใช้งานไหม?

---

### T9 — Area discovery & โพสต์แรก · บัญชีครีเอเตอร์

1. เปิด Area tab — อ่านโพสต์ 2–3 รายการ
2. สร้างโพสต์สั้น `/community/new`
3. หาโพสต์ใน profile Area tab

**สำเร็จเมื่อ:** เข้าใจ Area และโพสต์ได้โดยไม่สับสนกับ Projects

**ถาม:** Area ต่างจาก Projects ชัดไหม? · Editor โพสต์ใช้ง่ายบน mobile ไหม?

---

### T10 — แชท hire end-to-end · 2 บัญชี — hire thread

1. เปิด hire thread จากคำขอจ้าง
2. Reply + แนบรูป + ดู partner panel
3. ลอง So1o quote handoff (ดู prefilled)

**สำเร็จเมื่อ:** แชท hire มี context ครบและ handoff So1o เข้าใจได้

**ถาม:** รู้ไหมว่ากำลังออกไป So1o? · Job meta ใน panel อ่านง่ายไหม?

---

### T11 — Display preferences · ทุก persona

1. เปลี่ยนธีม สว่าง/มืด
2. เปลี่ยน grid density + Area layout
3. ตรวจ feed, chat, settings สอดคล้องกัน

**สำเร็จเมื่อ:** การตั้งค่าการแสดงผลมีประโยชน์และจำค่าได้

**ถาม:** Dark mode อ่านง่ายไหม? · หา prefs ได้จากไหน — profile menu หรือ settings?

---

## Feature checklist (A–W)

### A — Discovery & Feed

**Paths:** `/`, `/?mode=community`, `/?mode=designers`, `/?mode=studios`, `/drill`, `/explore/:kind/:value`  
**บัญชี:** Guest หรือทุก persona

- [ ] Hero + tagline อ่านเข้าใจภายใน 10 วิ
- [ ] แท็บ Projects/Area/ดีไซเนอร์/สตูดิโอ สลับ smooth
- [ ] Area — แท็บติดตาม/สำรวจ, filter tag, empty state ไทย
- [ ] การ์ดผลงาน — รูป, ชื่อ, หมวด, engagement ชัด
- [ ] Design Drill (`/drill`) — วัตถุประสงค์ชัด vs portfolio ปกติ
- [ ] Feed mode จำค่า refresh · กด Home reset เป็น projects
- [ ] Explore / หมวดหมู่ — นำทางกลับฟีดได้

---

### B — โปรไฟล์ & ผลงาน public

**Paths:** `/u/:id`, `/@username`, `/project/:id`, `/similar/:id`, `/?preview=1`

- [ ] โปรไฟล์ — avatar, bio, skills, แท็บ section
- [ ] แท็บ Area — community post grid
- [ ] แท็บ Design Drill + คอลเลกชัน + เกี่ยวกับ
- [ ] Visitor preview — CTA แสดง preview toast
- [ ] ปุ่มติดตาม / แชร์ / รายงาน
- [ ] Project detail — gallery, tools, stats, side panel
- [ ] +1 + คอมเมนต์ (guest → auth prompt)
- [ ] Similar images

---

### C — Auth & Session

**Paths:** `/auth`, `/auth/callback` · **บัญชี:** สมัครบัญชีใหม่

- [ ] Auth dialog / หน้า /auth — CTA ชัด
- [ ] สมัคร — ฟอร์ม, validation, consent checkboxes
- [ ] ยืนยันอีเมล gate — resend + ออกจากระบบ
- [ ] Login ด้วย Google OAuth (ถ้าทดสอบ)
- [ ] Redirect กลับหน้าเดิมหลัง login (`?redirect=`)
- [ ] Logout แล้ว refresh ยัง logged out

---

### D — Onboarding & Welcome PX

**Paths:** `/portfolio` (Welcome checklist) · **บัญชี:** บัญชีที่เพิ่งสมัคร

- [ ] Checklist แสดงบน /portfolio หลัง login
- [ ] 8 ภารกิจ — ลิงก์ไปหน้าที่เกี่ยวข้อง
- [ ] ปุ่มรับ PX + progress bar
- [ ] Celebration เมื่อครบ (ไม่ annoying)
- [ ] Dismiss checklist ได้

---

### E — Portfolio manage

**Paths:** `/portfolio`, `/portfolio/manage`, `/portfolio/saved`

- [ ] Portfolio ของฉัน — grid ผลงาน + stats
- [ ] Manage — hiring requests tab
- [ ] Manage — collab requests tab
- [ ] Saved posts (`/portfolio/saved`)
- [ ] แชร์ลิงก์ @username
- [ ] ลิงก์ไป settings / earnings

---

### F — Project editor

**Paths:** `/portfolio/new`, `/portfolio/:id/edit`

- [ ] ฟอร์ม editor — title, category, description
- [ ] Gallery DnD + รูป/วิดีโอ
- [ ] Tool picker + license fields
- [ ] AI assist panel (optional)
- [ ] Attestation checkbox + link `/legal/ip`
- [ ] Publish vs Draft ชัด

---

### G — Jobs

**Paths:** `/jobs`, `/jobs/:id` · **บัญชี:** ผู้สำรวจ/จ้างงาน

- [ ] Jobs list — filter/tab ชัด
- [ ] Job detail — รายละเอียด + สมัคร
- [ ] โพสต์งาน — ฟอร์ม + validation
- [ ] รายงานงาน (ReportTrigger)
- [ ] Empty state เมื่อไม่มีงาน

---

### H — Hiring & Collab

**Paths:** ProjectSidePanel → `/portfolio/manage?focus=` · **บัญชี:** 2 บัญชี

- [ ] ปุ่มจ้างงานบน project detail
- [ ] ปุ่มขอคอลแลป — copy ต่างจากจ้าง
- [ ] ฟอร์ม + validation
- [ ] Toast/confirm หลังส่ง
- [ ] ผู้รับเห็นใน manage tab

---

### I — Chat v2

**Paths:** `/chat`, `/chat/:id`, `/chat?studio=:id` · **บัญชี:** 2 บัญชี

- [ ] Inbox — filter tabs, search, pin/unpin
- [ ] Badge unread บน FloatingNav
- [ ] Thread — ส่ง/รับ, quick-reply chips
- [ ] Reply + quote scroll, unsend 24h
- [ ] แนบรูป + ส่งการ์ดผลงาน
- [ ] Partner panel — โปรไฟล์, ผลงาน, job meta
- [ ] So1o quote / studio quote handoff
- [ ] Group + studio chat — แยกจาก 1:1
- [ ] Report user/message, profanity warning
- [ ] Empty inbox / search empty state

---

### J — Notifications

**Paths:** `/notifications`

- [ ] Notification list + icons
- [ ] Mark read
- [ ] Deep link ไป project/chat/job
- [ ] Empty state
- [ ] Badge count บน nav

---

### K — Collections & Inspire

**Paths:** `/collections`, `/collections/:id`, `/inspire/:boardId`

- [ ] Collections list
- [ ] Collection detail — grid
- [ ] Save popover จาก project
- [ ] Inspire board detail
- [ ] Empty collection state

---

### L — Gifting, PX, Earnings & Referrals

**Paths:** SupportButton, `/earnings`, `/referrals`

- [ ] SupportButton บน project
- [ ] DonationModal — จำนวน, ยอดคงเหลือ
- [ ] Success feedback หลังส่ง
- [ ] `/earnings` — balance breakdown
- [ ] Cashout flow — ดูได้ อย่าถอนจริง
- [ ] `/referrals` — copy/share link, signup reward PX

---

### M — Studio

**Paths:** `/s/:slug`, `/studio/new`, `/studio/new?invite=:userId`, `/studio/manage`, `/studio/invites`

- [ ] Studio public page `/s/:slug`
- [ ] สมาชิก + ผลงานร่วม
- [ ] `/studio/new` — สร้าง + slug live-check
- [ ] เชิญสมาชิก + prefill `?invite=`
- [ ] `/studio/manage` + `/studio/invites`
- [ ] Studio chat + combined quote

---

### N — Contracts

**Paths:** `/contracts`, `/contracts/new`

- [ ] Contracts list
- [ ] Contract editor
- [ ] Sign / status
- [ ] Empty state

---

### O — Settings & Verify

**Paths:** `/settings`, `/verify`

- [ ] Profile edit — avatar, bio, skills
- [ ] การแสดงผล — ธีม, grid, Area layout
- [ ] @username live validation
- [ ] Email notification toggles
- [ ] ลิงก์ `/me/reports`, `/me/feedback`, `/legal/community`
- [ ] `/verify` — identity flow (ดูอย่างเดียว)

---

### P — Upgrade & Ads

**Paths:** `/upgrade`, `/advertise`, `/ads/:id`

- [ ] `/upgrade` — plan comparison
- [ ] CTA upgrade ไม่ aggressive
- [ ] `/advertise` — ฟอร์มลงโฆษณา
- [ ] `/ads/:id` — รายละเอียด

---

### Q — Trust & Safety

**Paths:** ReportTrigger, `/me/reports`, FeedbackFab, `/me/feedback`

- [ ] ReportTrigger — project, profile, comment, chat, job
- [ ] Report dialog + evidence upload
- [ ] `/me/reports` — สถานะ open/resolved
- [ ] FeedbackFab — rating + comment
- [ ] `/me/feedback` — ดู admin reply

---

### R — Legal & Privacy

**Paths:** `/legal/privacy`, `/terms`, `/cookies`, `/rights`, `/legal/ip`, `/legal/community`

- [ ] `/legal/privacy`
- [ ] `/legal/terms`
- [ ] `/legal/cookies` + banner
- [ ] `/legal/rights` — PDPA
- [ ] `/legal/ip` — attestation text
- [ ] `/legal/community` — กฎชุมชน

---

### S — Assistant & Help

**Paths:** AnthemAssistantFab, `/research`

- [ ] AnthemAssistantFab — เปิด/ปิด
- [ ] คำตอบ assistant เป็นภาษาไทย
- [ ] `/research` — คู่มือครบ
- [ ] PDF checklist โหลดได้

---

### T — Errors & 404

**Paths:** `/error/*`, route ไม่มี

- [ ] 404 NotFound
- [ ] `/error/404`, `/500` pages
- [ ] ปุ่มกลับหน้าแรก
- [ ] Network error feedback

---

### U — Community & Area

**Paths:** `/?mode=community`, `/community`, `/community/:id`, `/community/new`, `/community/:id/edit`

- [ ] Area feed — infinite scroll, engagement actions
- [ ] Community post detail — like/comment/save/report
- [ ] `/community/new` — editor, media, crop/reorder
- [ ] Draft autosave + publish feedback
- [ ] Profanity hint + moderation ban banner
- [ ] โพสต์โผล่ใน profile Area tab

---

### V — Theme & Display preferences

**Paths:** Profile menu, `/settings` → การแสดงผล

- [ ] Theme สว่าง / มืด / ตามระบบ
- [ ] Theme transition smooth (reduce motion)
- [ ] Project grid density — desktop + mobile
- [ ] Area feed layout — ฟีด vs กริด
- [ ] ค่า persist หลัง refresh

---

### W — Navigation shell (FloatingNav)

**Paths:** Global mobile/tablet, ซ่อนใน `/chat/:id`

- [ ] FloatingNav pill + labels
- [ ] Home vs Area distinction
- [ ] + FAB → CreateContentDrawer
- [ ] Profile menu dropdown + quick prefs
- [ ] Chat unread badge บน nav
- [ ] Bottom nav ซ่อนใน chat thread

---

## แผนที่หน้า (grouped)

### Public

| หน้า | Path |
|------|------|
| ฟีดหลัก (Projects) | `/` |
| Area / ชุมชน | `/?mode=community` |
| Design Drill | `/drill` |
| งาน | `/jobs` |
| Community feed (legacy) | `/community` |
| รายละเอียดโพสต์ชุมชน | `/community/:id` |
| ลงโฆษณา | `/advertise` |
| อัปเกรด | `/upgrade` |
| คู่มือ UX | `/research` |
| ส่งผลการทดสอบ | `/research/feedback` |
| สตูดิโอตัวอย่าง | `/s/doi-studio` |
| รายละเอียดผลงาน | `/project/:id` |
| โปรไฟล์ public | `/u/:id` |

### Auth

| เข้าสู่ระบบ / สมัคร | `/auth` |
| OAuth callback | `/auth/callback` |

### Creator (login)

| พอร์ตโฟลิโอของฉัน | `/portfolio` |
| จัดการคำขอจ้าง/คอลแลป | `/portfolio/manage` |
| โพสต์ที่บันทึก | `/portfolio/saved` |
| สร้างผลงาน | `/portfolio/new` |
| โพสต์ชุมชน | `/community/new` |
| รายได้ / PX | `/earnings` |
| ชวนเพื่อนรับ PX | `/referrals` |
| ตั้งค่า | `/settings` |
| ยืนยันตัวตน | `/verify` |

### Community (login)

| แชท | `/chat` |
| การแจ้งเตือน | `/notifications` |
| คอลเลกชัน | `/collections` |
| สัญญา | `/contracts` |
| สร้างสตูดิโอ | `/studio/new` |

### Me

| รายงานของฉัน | `/me/reports` |
| Feedback ของฉัน | `/me/feedback` |

### Legal

| นโยบายความเป็นส่วนตัว | `/legal/privacy` |
| ข้อกำหนดการใช้งาน | `/legal/terms` |
| คุกกี้ | `/legal/cookies` |
| สิทธิข้อมูลส่วนบุคคล | `/legal/rights` |
| ลิขสิทธิ์ & attestation | `/legal/ip` |
| กฎชุมชน | `/legal/community` |

---

## Feedback template

บันทึกแต่ละประเด็น:

| ฟิลด์ | ตัวอย่าง |
|-------|---------|
| ชื่อ reviewer | … |
| Persona ที่เล่น | ครีเอเตอร์ใหม่ |
| Task / Section | T3 หรือ F |
| Severity | blocker / major / minor / suggestion |
| หน้า + viewport | `/portfolio/new` · 375px |
| Screenshot | แนบ |
| ข้อเสนอ / ความรู้สึก | … |

**คำถามเปิด**

- ภาษาไทยอ่านง่ายไหม — คำศัพท์ tech/ฟรีแลนซ์
- คอนเซปต์ "ทุกคนคือ 1 PX" สื่อสารได้หรือยัง
- สมัคร+ยืนยันอีเมล รู้ next step หลัง login ไหม
- Home vs Area สับสนไหม
- แชทใหม่ (3-panel, reply, partner panel) ใช้ลื่นไหม
- ธีม + grid prefs มีประโยชน์/สับสนไหม
- Mobile vs Desktop — จุดที่ใช้ยากที่สุด
- ความต่าง Aplus1 vs So1o — เข้าใจไหม

ส่งกลับทีมผ่าน https://aplus1.app/research/feedback หรือช่องทางที่กำหนด (Figma / Notion / Google Form)

---

## Out of scope

- การชำระเงิน / Stripe checkout จริง
- ถอนเงิน / KYC จริง (ดู flow ได้ อย่าส่งเอกสารจริง)
- KYC/AML admin flows
- Admin panel (`/admin`) — staff only
- So1o back-office (ยกเว้น handoff ใบเสนอราคา)
- Ops Hub

---

## ภาคผนวก — Admin (Optional / staff only)

ไม่บังคับ UX researcher ทั่วไป

- [ ] Admin nav ครบและอ่านง่าย
- [ ] Reports/feedback batch actions
- [ ] CSV export ใช้งานได้

---

## เอกสารที่เกี่ยวข้อง

- [`aplus1-ux-usability-checklist.pdf`](./aplus1-ux-usability-checklist.pdf) — เช็คลิส PDF (sync กับ `/research`) · [โหลดจาก production](https://aplus1.app/aplus1-ux-usability-checklist.pdf) · สร้างใหม่: `npm run docs:ux-checklist-pdf`
- [`ux-demo-guide.md`](./ux-demo-guide.md) — seed demo data (optional)
- [`demo-catalog.md`](./demo-catalog.md) — 50 บัญชี demo (optional)
- [`qa-checklist.md`](./qa-checklist.md) — QA engineering (คนละ audience)
