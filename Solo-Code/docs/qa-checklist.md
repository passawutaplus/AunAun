# QA Checklist

ใช้ checklist นี้ก่อน release ทุกครั้ง

## Browsers / OS

- [ ] Chrome (Win + macOS)
- [ ] Safari (macOS + iOS)
- [ ] Firefox
- [ ] Edge
- [ ] Android Chrome

## Viewports

- [ ] 375×667 (iPhone SE)
- [ ] 390×844 (iPhone 14)
- [ ] 768×1024 (iPad)
- [ ] 1280×800 (laptop)
- [ ] 1920×1080 (desktop)

## Dialog / Sheet — ปุ่มปิดไม่ทับปุ่มอื่น

- [ ] **พรีวิว PDF ใบเสนอราคา** — ปุ่ม X อยู่หลัง «บันทึก PDF» ไม่ทับกัน
- [ ] **พรีวิว PDF บรีฟ** — เหมือนกัน
- [ ] **Track ใบเสนอราคาเต็ม** — ปุ่มพิมพ์ + ปิด ไม่ซ้อน X ซ้ำ
- [ ] Dialog p-0 อื่นๆ (Supplier, WHT scan, Color Lab) — หัวข้อไม่ถูก X บัง

## Landing หน้าแรก

- [ ] Nav: logo · theme toggle · เมนูมือถือ (sheet) · ลิงก์เข้าสู่ระบบ / แดชบอร์ด
- [ ] Hero: ข้อความหลัก · progress Early Access · CTA ไป `/auth` หรือ `/dashboard`
- [ ] Fair Price calculator แสดงบนหน้า (ไม่ซ่อนใน accordion)
- [ ] ลิงก์ใบเสนอราคาฟรี / an1hem Showcase ทำงาน
- [ ] AI Mentor chat โหลดและส่งข้อความได้ (แขก/ล็อกอิน)
- [ ] Blog insights + footer minimal
- [ ] หน้า `/pricing` แผนราคาตรงกับ `src/data/plans.ts` (แยกจาก landing)

## PDF / พิมพ์ (ทุกจุดที่ส่งออก)

- [ ] **ใบเสนอราคา (แดชบอร์ด)** — Mockup dialog → บันทึก PDF → เนื้อหาครบ (ใบเสนอ + บรีฟ/ไทม์ไลน์ถ้าเลือก) หลายหน้าไม่ซ้ำ/ไม่ขาด
- [ ] **Smart Brief (แดชบอร์ด)** — พรีวิว PDF → บันทึก PDF → หน้าปก + เนื้อหา
- [ ] **บรีฟลูกค้า** `/brief/:token` → ดาวน์โหลด/พิมพ์ PDF
- [ ] **ติดตามงาน** `/track/:token` → ดู PDF ใบเสนอราคาฉบับเต็ม → พิมพ์
- [ ] **Tax Sandbox** — ส่งออก PDF (รายงานยาวหลายหน้าไม่ถูกตัด)
- [ ] **iOS Safari** — เลือก «บันทึกเป็น PDF» ในกล่องพิมพ์ (มี toast แนะนำ)
- [ ] **Android Chrome** — เลือกเป้าหมาย PDF / Save as PDF
- [ ] โลโก้บนใบเสนอราคาแสดงใน PDF (ถ้าไม่ขึ้น ตรวจ CORS ที่ storage)

## Universal cross-platform (PWA)

- [ ] ติดตั้ง PWA แล้วเปิดจากไอคอน (standalone) — safe-area ไม่ double-pad กับ browser chrome
- [ ] iPhone: ติดตั้งผ่าน Safari เท่านั้น (Chrome iOS ไม่รองรับ Add to Home Screen)
- [ ] แก้ใบเสนอราคาบนมือถือ: แถบ "บันทึก PDF" อยู่เหนือ BottomNav ไม่ถูกบัง
- [ ] Touch targets ≥ 44×44
- [ ] Important actions visible without hover (touch devices ไม่มี hover)
- [ ] `env(safe-area-inset-*)` ทำงานบน iPhone notch / Dynamic Island
- [ ] Keyboard shortcuts ใช้ได้ทั้ง `metaKey` (mac) และ `ctrlKey` (win)
- [ ] Dark mode + Light mode (system + manual toggle)
- [ ] Glassmorphism ดูถูกบน Safari (`-webkit-backdrop-filter` pair)
- [ ] Icons คม (SVG) บนทุก DPR

## Auth states (ทุกหน้า)

- [ ] Guest (logged out) — redirect ไป `/auth` หรือเห็น public content
- [ ] Unverified email — เห็น apply gate
- [ ] Logged in (tester approved) — เห็น dashboard เต็ม
- [ ] Admin — เห็น admin panel
- [ ] Session expired ระหว่างใช้งาน — graceful re-auth

## States per screen

- [ ] Loading state (skeleton or spinner)
- [ ] Empty state (ภาษาไทย, ใจดี, มี CTA)
- [ ] Error state (มี retry)
- [ ] Success state (toast + UI update)

## Accessibility (smoke)

- [ ] Tab order makes sense
- [ ] All form inputs have visible label
- [ ] Color contrast WCAG AA (text ≥ 4.5:1)
- [ ] `alt` on all images
- [ ] Focus ring visible

## Security smoke

- [ ] ลอง paste `javascript:alert(1)` ใน URL field → ถูก block
- [ ] ลอง paste `<script>alert(1)</script>` ใน text input → render เป็น text ไม่ exec
- [ ] ลอง `?redirect=//evil.com` → ไม่ redirect ออกนอก domain
- [ ] DevTools Network → ไม่มี `service_role` ใน response
- [ ] DevTools Console → ไม่มี error / warning ที่ leak data
- [ ] Logout แล้ว Back button → ไม่เห็น dashboard ของ user ก่อนหน้า

## Performance smoke

- [ ] หน้าแรกโหลด < 3 วินาที บน Fast 3G
- [ ] ไม่มี layout shift หลัก (CLS < 0.1)
- [ ] Image lazy load below the fold
- [ ] Click → response < 200ms (INP)

## Onboarding & ทัวร์แนะนำ

- [ ] ผู้ใช้ใหม่หลังสำร็จ onboarding — ขึ้น welcome «เริ่มทัวร์»
- [ ] ทัวร์พาไปครบ ~20 หน้า (Dashboard, Finance, Planner, Data, Labs, Settings)
- [ ] ปุ่ม «สอนใช้งาน» ใน header Dashboard + Labs
- [ ] ปุ่ม «วิธีใช้» แต่ละหน้า + «สอนใช้งานทั้งระบบ (เริ่มจากหน้านี้)»
- [ ] ตั้งค่า → «สอนใช้งานทุกหน้าอีกครั้ง»

## So1o Labs & Back-office

- [ ] **Creative Labs** — ส่งสี/ฟอนต์เข้าบรีฟ · Export ASE/tokens · ลิงก์ไฟล์งานใน Brief
- [ ] **Doc Lab** — wizard 3 ขั้น · watermark · ส่งชุดส่งลูกค้า (หลายไฟล์ได้)
- [ ] **Client Pack** — pre-flight checklist · ZIP มี quotation.pdf
- [ ] **ภาษี** — 50ทวิ thumbnail · ชุดนักบัญชี ZIP size estimate · แยกจาก Doc Lab

## Data integrity

- [ ] สร้าง record ใหม่ → refresh page → ยังอยู่
- [ ] Edit → refresh → เห็น value ใหม่
- [ ] Delete → refresh → หายจริง
- [ ] Logout → login → เห็น data เดิม
- [ ] 2 tabs พร้อมกัน → real-time sync ถูกต้อง

## Localization

- [ ] ภาษาไทยทุกหน้า user-facing
- [ ] วันที่/เวลาแสดงผล locale `th-TH`
- [ ] เงินบาทมี `฿` หรือ `บาท`
- [ ] ไม่มี English placeholder หลงเข้ามา

## Microcopy (ดู [microcopy-style-guide.md](../../docs/microcopy-style-guide.md))

- [ ] ไม่มี disclaimer ซ้ำในหน้าเดียว (เช่น tax alert + guide tip)
- [ ] Demo banner ไม่ซ้ำกับ /research warning
- [ ] Error page อ่านเข้าใจใน 3 วินาที (title + desc ไม่ทับกัน)
- [ ] AI disclaimer ตรงกับ `src/lib/copyConstants.ts`
- [ ] อีเมล auth ใช้ footer มาตรฐานจาก `copyConstants`
