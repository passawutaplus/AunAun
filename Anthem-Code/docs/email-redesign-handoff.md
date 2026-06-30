# Aplus1 Email Redesign — Handoff & Logo Asset Plan

เอกสารนี้รวมแผนปรับ transactional email ของ Aplus1 สถานะปัจจุบัน และ **checklist ทั้งหมดเมื่อได้โลโก้จริง** (หลายแบบ: สี / ขาวดำ / พื้นหลังใส)

เอกสารคู่กัน:
- **[logo-rollout-handoff.md](./logo-rollout-handoff.md)** — เมื่อได้โลโก้จริง ปรับทั้งเว็บ + PWA + OG + อีเมล
- [brandConfig.ts](../src/lib/brandConfig.ts) — แหล่งความจริงชื่อแบรนด์

---

## สถานะปัจจุบัน (มิ.ย. 2026)

| หัวข้อ | สถานะ |
|--------|--------|
| ส่งเมล production | **Resend** + `notify.aplus1.app` / `noreply@aplus1.app` |
| Template ครบ 15 ฉบับ | มีแล้ว (auth 6 + notification 9) |
| แบรนด์ในอีเมล | **ยังไม่เสร็จ** — header ยัง wordmark `1PX` + tagline เก่า |
| Preview ที่ generate | **เก่า** — `email-previews/` ยังขึ้น Pixel100 / 1PX |
| โลโก้ในอีเมล | placeholder จาก `scripts/generate-email-icons.mjs` → `public/email/logo.png` |

**รอโลโก้จริงก่อน** แล้วค่อยทำ Phase ด้านล่าง + ส่วน [เมื่อได้โลโก้แล้ว](#เมื่อได้โลโก้แล้ว--checklist-ทั้งหมด)

---

## เป้าหมายดีไซน์

- สะอาด อ่านง่าย premium creative social app
- mobile-first ความกว้างการ์ด **560–600px**
- ภาษาไทยเป็นหลัก
- accent coral `#FF4F18`
- พื้นนอกการ์ด warm paper `#F5F1EC`
- motif pixel/grid เล็ก ๆ ได้ — **ห้าม** ใช้คำว่า 1PX เป็นแบรนด์
- **ห้าม** referral / app store / social clutter (ไม่ทำแบบ template Stripo สำเร็จรูป)

### Mockup อ้างอิง

| แบบ | ใช้ / ไม่ใช้ |
|-----|-------------|
| Signup แบบ hero + การ์ดข้อมูล + value box (โทน Pixel100 เดิม) | **เอาโครงสร้าง** → rebrand เป็น Aplus1 |
| Template มี Invite friends / App Store / Social icons | **ไม่ใช้** |

---

## แหล่งความจริงแบรนด์

`src/lib/brandConfig.ts`:

| ค่า | ใช้ในอีเมล |
|-----|------------|
| `BRAND_NAME` = Aplus1 | wordmark, alt text, subject |
| `BRAND_DOMAIN` = aplus1.app | footer link |
| `BRAND_TAGLINE` | tagline ใต้โลโก้ใน header |
| `BRAND_SUPPORT_EMAIL` = support@aplus1.app | footer |
| `APLUS1_PRODUCTION_URL` | ลิงก์ CTA / asset URL |

Design tokens เป้าหมาย: `src/lib/email-templates/_brand.ts` (ดู handoff OneDrive สำหรับค่า `paper`, `mint`, `charcoal`)

---

## Template ที่มี (15 ฉบับ)

### Auth

| ไฟล์ | หมายเหตุหลัง redesign |
|------|----------------------|
| `signup.tsx` | ทำ rich ที่สุด — hero + การ์ดอีเมล + highlight box |
| `invite.tsx` | transactional สั้น |
| `magic-link.tsx` | transactional สั้น |
| `recovery.tsx` | transactional สั้น |
| `email-change.tsx` | transactional + ข้อมูล old/new email |
| `reauthentication.tsx` | OTP ใหญ่ชัด |

### Notification

| ไฟล์ | หมายเหตุ |
|------|----------|
| `hire-request.tsx` | มี `EmailCard` ดีอยู่แล้ว |
| `chat-message.tsx` | |
| `job-match.tsx` | |
| `collab-request.tsx` | |
| `gift-received.tsx` | เช็คคำว่า px → เครดิต |
| `follow.tsx` | |
| `job-application.tsx` | |
| `topup-success.tsx` | **ต้องแก้ copy** — ห้าม 24 ชม. AML; Pixel → เครดิต |
| `cashout-status.tsx` | px → เครดิต ในข้อความ user-facing |

### Shell ร่วม

| ไฟล์ | บทบาท |
|------|--------|
| `layout.tsx` | Header, footer, การ์ด, ปุ่ม — **แก้ก่อนทุกฉบับ** |
| `_brand.ts` | สี / spacing / typography |
| `icons.tsx` | `logoUrl()`, ไอคอน flat, `EmailOfficialPartnership` |
| `brandMeta.ts` | SITE_URL, CONTACT_EMAIL (re-export จาก brandConfig) |

---

## แผนทำงาน (ก่อนมีโลโก้จริง)

### Phase A — Shell (กระทบทุกฉบับ)

1. `_brand.ts` — เพิ่ม `paper`, ปรับ `surface`, `main.backgroundColor`
2. `layout.tsx` — wordmark **Aplus1**, tagline จาก `BRAND_TAGLINE`, พื้น paper, การ์ดขาว radius 14px
3. ลบข้อความ `1PX` / `ทุกคนคือ 1 PX` ออกจาก header

### Phase B — Copy cleanup

4. `topup-success.tsx` — ตามตารางใน handoff OneDrive
5. `cashout-status.tsx`, `gift-received.tsx` — เครดิตแทน Pixel/px ที่ user เห็น
6. `scripts/preview-emails.ts` — ชื่อ Aplus1 Email Previews
7. `npm run email:preview` + ค้นหา `Pixel100|1PX|pixel100`

### Phase C — Signup premium

8. component ใหม่ใน layout: `EmailHeroImage`, `EmailHighlightBox`, `EmailAccountCard`
9. ปรับ `signup.tsx` ตาม wireframe mockup (ไม่มี referral/app store)
10. asset hero: `public/email/hero-signup.png` (รอ art หรือใช้ชั่วคราว)

### Phase D — Sync production

11. `cd Solo-Code && node scripts/vendor-anthem-email-templates.mjs`
12. อัปเดต `Solo-Code/supabase/functions/_shared/anthem-email-html.ts` (mirror HTML — ตอนนี้ alt ยัง `Pixel100`)
13. Redeploy So1o (auth webhook) + Edge `notify-*`

---

## เมื่อได้โลโก้แล้ว — Checklist ทั้งหมด

### 1. ไฟล์ asset ที่ควรส่งมา (แนะนำ)

จัดโฟลเดอร์เดียว เช่น `brand-assets/aplus1-logo/`:

| ชื่อไฟล์แนะนำ | รูปแบบ | พื้นหลัง | ใช้ที่ |
|--------------|--------|----------|--------|
| `logo-lockup-color.png` | PNG | ใส | header อีเมล (พื้นขาว / coral fade) |
| `logo-lockup-color.svg` | SVG | ใส | source หลัก / scale |
| `logo-lockup-white.png` | PNG | ใส | footer มืด / dark mode email (ถ้ามี) |
| `logo-lockup-black.png` | PNG | ใส | พิมพ์ / PDF / เอกสารขาวดำ |
| `logo-mark-color.png` | PNG | ใส | ช่องเล็ก 32×32 header, partnership box |
| `logo-mark-white.png` | PNG | ใส | mark บนพื้น coral/solid |
| `logo-wordmark-color.svg` | SVG | ใส | กรณีแยก mark + ตัวหนังสือ |
| `favicon-32.png` | PNG | ใสหรือ solid | favicon |
| `icon-192.png` / `icon-512.png` | PNG | ตาม PWA spec | manifest / install |
| `apple-touch-icon.png` | PNG | ไม่โปร่ง (Apple แนะนำ) | iOS home screen |
| `og-image-1200x630.png` | PNG/JPG | ตาม art direction | แชร์ลิงก์ social |

**ขนาดส่งขั้นต่ำสำหรับอีเมล**

- Lockup แนวนอน: กว้างอย่างน้อย **400px** (@2x)
- Mark เดี่ยว: **64×64** และ **128×128**
- ส่ง **SVG ต้นฉบับ** ถ้ามี — จะ export PNG หลายขนาดใน repo

**ห้าม**

- JPG สำหรับโลโก้ที่ต้องใสบน gradient
- โลโก้ที่มีขอบขาวล้อม (halos) บนพื้น paper `#F5F1EC`

---

### 2. วางไฟล์ใน repo (Aplus1 / Anthem-Code)

| ปลายทาง | ไฟล์ | variant ที่ใช้ |
|---------|------|----------------|
| `public/email/logo.png` | โลโก้หลักในอีเมล | **color lockup** หรือ **mark** 32px |
| `public/email/logo-white.png` | (ใหม่) | white — footer / dark |
| `public/email/logo-mark.png` | (ใหม่) | mark only — header แคบ |
| `public/email/hero-signup.png` | (ใหม่) | illustration signup ถ้ามี |
| `public/email/icons/*.png` | คงเดิมหรือ refresh | flat icons — ไม่จำเป็นต้องมีโลโก้ |
| `public/icons/icon-192.png` | PWA | color mark บนพื้น brand หรือใส |
| `public/icons/icon-512.png` | PWA | เดียวกัน |
| `public/icons/icon-maskable-512.png` | Android | safe zone 80% |
| `public/icons/apple-touch-icon.png` | iOS | 180×180 แนะนำ |
| `public/favicon.ico` | browser tab | จาก mark |

---

### 3. โค้ดที่ต้องแก้ — อีเมล (ละเอียด)

| ไฟล์ | สิ่งที่เปลี่ยน |
|------|----------------|
| `src/lib/email-templates/icons.tsx` | ฟังก์ชัน `logoUrl(variant?)` — เลือก color / white / mark; อัปเดต `EmailOfficialPartnership` ให้ใช้ mark จริงแทน placeholder |
| `src/lib/email-templates/layout.tsx` | `<Img src={logoUrl('color')}>` — ปรับ width/height ตาม aspect ratio จริง; `alt={BRAND_NAME}`; อาจเลิก text wordmark HTML ถ้า lockup รวมตัวหนังสือแล้ว |
| `scripts/generate-email-icons.mjs` | ลบหรือปิดการ generate `logo.png` จาก SVG ชั่วคราว → คัดลอกจาก brand assets แทน; อัปเดต comment 1PX → Aplus1 |
| `scripts/preview-emails.ts` | ไม่บังคับเปลี่ยน logic — แต่ regenerate หลังวางโลโก้ |
| `email-previews/*.html` | regenerate ทั้งชุด `npm run email:preview` |
| `email-previews/index.html` | regenerate พร้อมกัน |

**ถ้า lockup กว้าง** — ปรับใน `layout.tsx`:

```ts
// ตัวอย่างแนวทาง (ยังไม่ implement)
const headerLogo = {
  width: 120,  // ตาม asset จริง
  height: 32,
  objectFit: 'contain' as const,
}
```

**Dark mode ในอีเมล (optional รอบ 2)**

- บาง client รองรับ `@media (prefers-color-scheme: dark)` — ใส่ `logo-white.png` สลับ
- หรือใช้ mark สีเดียวที่อ่านได้ทั้งสองโหมด

---

### 4. โค้ดที่ต้องแก้ — แอป Aplus1 (เกี่ยวข้องแบรนด์)

| ไฟล์ | สิ่งที่เปลี่ยน |
|------|----------------|
| `src/components/brand/BrandLogo.tsx` | แทน gradient box + ตัว `1` ด้วย `<img>` จาก asset; รองรับ `variant="light"|"dark"` |
| `src/lib/brandConfig.ts` | อาจเพิ่ม `BRAND_LOGO_URL` / paths หลาย variant (ไม่บังคับ rename `BRAND_MARK` — เป็น internal key) |
| `index.html` | `favicon`, `apple-touch-icon`, `og:image` |
| `public/manifest.webmanifest` | `icons[]` paths |
| `src/components/SeoHead.tsx` | default og:image ชี้ asset ใหม่ |
| `src/pages/AuthPage.tsx`, `AuthDialog.tsx` | ใช้ `BrandLogo` — ได้โลโก้ใหม่อัตโนมัติถ้าแก้ component เดียว |

---

### 5. โค้ดที่ต้องแก้ — Solo / Edge (ส่งอีเมลจริง)

| ไฟล์ | สิ่งที่เปลี่ยน |
|------|----------------|
| `Solo-Code/scripts/vendor-anthem-email-templates.mjs` | รัน build หลังแก้ Anthem templates |
| `Solo-Code/src/lib/email/anthem-vendor/templates/icons.tsx` | vendored copy ของ `logoUrl` |
| `Solo-Code/src/lib/email/anthem-vendor/templates/layout.tsx` | vendored layout |
| `Solo-Code/supabase/functions/_shared/anthem-email-html.ts` | บรรทัด `logoUrl` + **alt ยังเป็น Pixel100** → `Aplus1`; ถ้าเปลี่ยน path โลโก้ต้อง sync |
| Deploy | So1o production + `supabase functions deploy notify-*` |

**URL โลโก้ในอีเมลต้องโหลดได้สาธารณะ**

- Production: `https://aplus1.app/email/logo.png`
- Demo: `https://aplus1-demo.vercel.app/email/logo.png`
- หลัง deploy Aplus1 (`aplus1-prod`) — ไฟล์ใน `public/email/` ต้องอยู่บน CDN/Vercel

---

### 6. การเลือก variant ต่อบริบท (แนะนำ)

| บริบท | Variant |
|--------|---------|
| Header อีเมล — พื้น white → coral fade | **color lockup** หรือ mark + text HTML |
| `EmailOfficialPartnership` box — พื้น `#F2F4F7` | **mark color** 28–32px |
| Footer — พื้นขาว | **color lockup** เล็ก หรือ mark + ชื่อข้อความ |
| Footer — พื้นเข้ม (ถ้าทำในอนาคต) | **white lockup** |
| Favicon / PWA | **mark** บนพื้น `#FF4F18` หรือ maskable |
| OG / แชร์ Facebook-LINE | **lockup + tagline** ใน artboard 1200×630 |
| เอกสาร PDF / ขาวดำ | **black lockup** |

---

### 7. QA หลังใส่โลโก้จริง

**Preview local**

```powershell
cd Anthem-Code
npm run email:icons      # ถ้ายัง generate icons
npm run email:preview
# เปิด email-previews/index.html
```

**ตรวจด้วยตา**

- [ ] Header ไม่มี 1PX / Pixel100
- [ ] โลโก้คม ไม่เบลอ (ส่ง @2x)
- [ ] พื้น paper `#F5F1EC` ไม่มี halo ขาวรอบโลโก้
- [ ] Gmail mobile + desktop
- [ ] Outlook (ถ้า audience ใช้)
- [ ] ลิงก์รูป `https://aplus1.app/email/logo.png` เปิดได้ 200

**ค้นหาข้อความเก่า**

```powershell
rg -n "Pixel100|1PX|1px-demo|pixel100|support@pixel100" Anthem-Code/src Anthem-Code/email-previews Solo-Code/src/lib/email/anthem-vendor Solo-Code/supabase/functions/_shared/anthem-email-html.ts
```

**ทดสอบส่งจริง**

```powershell
cd Solo-Code
node scripts/send-test-aplus1-resend.mjs your@email.com
```

แล้วทดสอบ signup / recovery บน `aplus1.app`

---

### 8. ลำดับงานแนะนำเมื่อได้ไฟล์โลโก้

1. วาง assets ใน `public/email/` + `public/icons/`
2. อัปเดต `icons.tsx` + `layout.tsx` (+ `BrandLogo.tsx` ถ้าทำพร้อมกัน)
3. Phase A–B จากด้านบน (shell + copy) ถ้ายังไม่ทำ
4. `npm run email:preview`
5. `vendor-anthem-email-templates.mjs` + แก้ `anthem-email-html.ts`
6. Deploy Aplus1 (`aplus1-prod`) → assets ขึ้น production
7. Deploy So1o + Edge notify
8. ส่งทดสอบ 3 ฉบับ: signup, recovery, hire-request

---

## สิ่งที่เพิ่มภายหลัง (นอก scope โลโก้)

- security alert emails (login ใหม่, เปลี่ยนรหัสผ่าน)
- cashout failed + เหตุผล
- moderation / report outcome
- weekly digest (opt-in)
- invoice/receipt Stripe

---

## คำสั่ง Cursor เมื่อพร้อมทำต่อ

ดู **[logo-rollout-handoff.md](./logo-rollout-handoff.md)** สำหรับ rollout ทั้งเว็บเมื่อได้ไฟล์โลโก้

```text
อ่าน Anthem-Code/docs/email-redesign-handoff.md และโลโก้ใน public/email/

ทำ Phase A–C: ปรับ layout/_brand/signup ตาม handoff, ใส่โลโก้ variant ที่เหมาะ, แก้ topup copy, regenerate email:preview, vendor ไป Solo, sync anthem-email-html.ts, ค้นหา Pixel100/1PX ให้หมด
```

---

*อัปเดต: มิ.ย. 2026 — Resend live, รอโลโก้จริงสำหรับ asset swap*
