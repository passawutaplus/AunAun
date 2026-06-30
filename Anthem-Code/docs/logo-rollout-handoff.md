# Aplus1 Logo Rollout — ปรับโลโก้ทั้งเว็บ (Handoff)

เอกสารนี้ใช้เมื่อได้ไฟล์โลโก้จริงแล้ว และต้องการสั่ง:

> **「เอาโลโก้ใหม่ปรับเปลี่ยนทั้งเว็บ」**

Agent ให้ทำตามลำดับในเอกสารนี้ **ครบทุกขั้น** ไม่แก้แค่ header

เอกสารคู่กัน:
- [email-redesign-handoff.md](./email-redesign-handoff.md) — อีเมล transactional + asset ใน `public/email/`
- [brandConfig.ts](../src/lib/brandConfig.ts) — แหล่งความจริงชื่อแบรนด์

---

## สถานะ placeholder ปัจจุบัน

| จุด | ตอนนี้ใช้อะไร |
|-----|----------------|
| Header / Auth | `BrandLogo` = กล่อง gradient + ตัว `1` + ข้อความ Aplus1 |
| Favicon / PWA | ไฟล์ใน `public/icons/` (ต้องมีก่อน deploy — `npm run mobile:doctor`) |
| OG / แชร์ลิงก์ | URL ภายนอก Lovable/R2 ใน `index.html` + `src/lib/seo.ts` |
| อีเมล | placeholder `public/email/logo.png` จาก `generate-email-icons.mjs` |
| Capacitor | `capacitor.config.json` ยัง `com.pixel100.app` / `Pixel100` |
| E2E SEO | `e2e/smoke/seo.smoke.spec.ts` ยัง expect `Pixel100` |

**หมายเหตุ:** class `bg-gradient-brand` บนปุ่ม/UI คือ **สี accent** ไม่ใช่โลโก้ — **ไม่ต้องลบ** เว้นแต่ art direction ใหม่บอกให้เปลี่ยนสี

---

## ขั้นตอนที่ 0 — รับไฟล์จากผู้ใช้

### โฟลเดอร์วางไฟล์

```
Anthem-Code/brand-assets/incoming/
```

ผู้ใช้โยนไฟล์มาที่นี่ (gitignore ได้ถ้าไม่ต้องการ commit ต้นฉบับ)

### ชุดไฟล์ที่ต้องการ (ขั้นต่ำ)

| ไฟล์ | พื้นหลัง | หมายเหตุ |
|------|----------|----------|
| `logo-lockup-color.svg` หรือ `.png` | ใส | lockup แนวนอน — header, OG art |
| `logo-mark-color.svg` หรือ `.png` | ใส | mark อย่างเดียว — favicon, PWA |
| `logo-lockup-white.svg` หรือ `.png` | ใส | บนพื้นเข้ม / auth hero |
| `logo-lockup-black.svg` หรือ `.png` | ใส | PDF / ขาวดำ |
| `og-share-1200x630.png` | ตาม art | แชร์ Facebook, LINE, Twitter (ถ้าไม่มี ให้ export จาก lockup) |

### Variant ที่วางแผนรองรับในโค้ด

```ts
// แนะนำเพิ่มใน brandConfig.ts
export type BrandLogoVariant = "color" | "white" | "black" | "mark";

export const BRAND_LOGO = {
  lockupColor: "/brand/logo-lockup-color.png",
  lockupWhite: "/brand/logo-lockup-white.png",
  lockupBlack: "/brand/logo-lockup-black.png",
  markColor: "/brand/logo-mark-color.png",
  markWhite: "/brand/logo-mark-white.png",
  ogImage: "/brand/og-share-1200x630.png",
} as const;
```

---

## ขั้นตอนที่ 1 — Export ขนาดมาตรฐาน

สร้างหรือรันสคริปต์ (แนะนำ `scripts/generate-brand-assets.mjs`) จากไฟล์ต้นฉบับ → วางใน `public/`:

| Output | ขนาด | ที่มา |
|--------|------|------|
| `public/brand/logo-lockup-color.png` | ความกว้าง ~400px @1x | lockup color |
| `public/brand/logo-lockup-white.png` | เดียวกัน | lockup white |
| `public/brand/logo-lockup-black.png` | เดียวกัน | lockup black |
| `public/brand/logo-mark-color.png` | 128×128 | mark color |
| `public/brand/logo-mark-white.png` | 128×128 | mark white |
| `public/brand/og-share-1200x630.png` | 1200×630 | artboard แชร์ |
| `public/favicon.ico` | 16/32/48 multi | mark |
| `public/icons/icon-192.png` | 192×192 | mark (+ padding ถ้า maskable) |
| `public/icons/icon-512.png` | 512×512 | mark |
| `public/icons/icon-maskable-512.png` | 512×512 safe zone 80% | Android install |
| `public/icons/apple-touch-icon.png` | 180×180 | iOS (พื้นไม่โปร่งแนะนำ) |
| `public/email/logo.png` | 64–128px กว้าง | lockup หรือ mark สำหรับอีเมล |
| `public/email/logo-white.png` | (optional) | footer มืด / dark email |

หลัง generate:

```powershell
cd Anthem-Code
npm run mobile:doctor
```

---

## ขั้นตอนที่ 2 — แก้ component กลาง (จุดสำคัญ)

### `src/components/brand/BrandLogo.tsx`

เป้าหมาย: **แก้ไฟล์เดียว → header ทั้งเว็บเปลี่ยน**

| Prop | ค่า | ใช้เมื่อ |
|------|-----|---------|
| `variant` | `color` (default) | header สว่าง |
| `variant` | `white` | พื้น gradient เข้ม (Auth hero) |
| `variant` | `black` | (แทบไม่ใช้บนเว็บ) |
| `markOnly` | `true` | ช่องแคบ mobile |
| `showWordmark` | `false` | แสดงแค่รูป lockup รวมคำอยู่แล้ว |

**ลบ:** กล่อง `bg-gradient-brand` + `{BRAND_MARK}` เป็นตัวอักษร

**ใช้แทน:**

```tsx
<img
  src={resolveLogoSrc(variant, markOnly)}
  alt={BRAND_NAME}
  className={cn(size === "sm" ? "h-8" : "h-9", "w-auto object-contain")}
  width={...}
  height={...}
/>
```

ถ้า lockup SVG มีคำว่า Aplus1 อยู่แล้ว → `showWordmark={false}` เป็นค่า default

### `src/lib/brandConfig.ts`

- เพิ่ม `BRAND_LOGO` paths (ด้านบน)
- **อย่าเปลี่ยน** `BRAND_STORAGE_*`, `BRAND_ECOSYSTEM_KEY` (internal session keys)
- `BRAND_MARK` อาจ deprecate หรือเก็บไว้เฉพาะ fallback

---

## ขั้นตอนที่ 3 — จุดที่ใช้ `BrandLogo` (อัปเดตอัตโนมัติหลังแก้ component)

| ไฟล์ | บริบท | variant แนะนำ |
|------|--------|----------------|
| `src/components/FeedHeader.tsx` | header หลัก | `color` |
| `src/pages/AuthPage.tsx` | desktop + mobile auth | desktop `color`, hero panel อาจ `white` |
| `src/components/AuthDialog.tsx` | modal login | `color` |
| `src/components/HttpErrorPage.tsx` | 404/500 | `color` |

**ตรวจหลัง deploy:** ทุกหน้าที่มี header — ไม่มีกล่องส้มเล็ก ๆ ตัว `1` เหลือ

---

## ขั้นตอนที่ 4 — HTML, SEO, แชร์ลิงก์

| ไฟล์ | แก้อะไร |
|------|---------|
| `index.html` | เพิ่ม `<link rel="icon" href="/favicon.ico">`; อัปเดต `og:image`, `twitter:image` → `/brand/og-share-1200x630.png` (absolute URL production) |
| `src/lib/seo.ts` | `DEFAULT_OG_IMAGE` → `absoluteUrl("/brand/og-share-1200x630.png")` หรือ path ใน `BRAND_LOGO` |
| `src/components/SeoHead.tsx` | ใช้ค่า default จาก `seo.ts` — มักไม่ต้องแก้ถ้าแก้ `DEFAULT_OG_IMAGE` แล้ว |
| `public/manifest.webmanifest` | ตรวจ `name`, `short_name`, `icons[]`, `theme_color` / `background_color` ให้เข้ากับโลโก้ใหม่ |
| `docs/seo-deploy.md` | อัปเดต domain เป็น `aplus1.app` (ยังเขียน 1px.app ในบางจุด) |

---

## ขั้นตอนที่ 5 — PWA / Mobile / Offline

| ไฟล์ | แก้อะไร |
|------|---------|
| `public/icons/*` | แทนด้วย export จาก mark (ขั้นตอนที่ 1) |
| `public/offline.html` | รูป `/icons/icon-192.png` — ได้โลโก้ใหม่อัตโนมัติ |
| `public/sw.js` | มักไม่ต้องแก้ (cache path เดิม) |
| `capacitor.config.json` | `appId` → `com.aplus1.app`, `appName` → `Aplus1` |
| `scripts/mobile-doctor.mjs` | เพิ่ม check `public/favicon.ico`, `public/brand/*` ถ้าต้องการ |

---

## ขั้นตอนที่ 6 — อีเมล (ทำคู่กับเว็บ)

ทำตาม [email-redesign-handoff.md](./email-redesign-handoff.md) Phase A–D:

1. วาง `public/email/logo.png` (+ white variant ถ้ามี)
2. แก้ `src/lib/email-templates/layout.tsx` + `icons.tsx`
3. `npm run email:preview`
4. `cd ../Solo-Code && node scripts/vendor-anthem-email-templates.mjs`
5. แก้ `Solo-Code/supabase/functions/_shared/anthem-email-html.ts` (alt ยัง `Pixel100`)
6. Deploy Aplus1 + So1o + Edge notify

---

## ขั้นตอนที่ 7 — สคริปต์ / PDF / เอกสาร (แบรนด์เก่าที่ user เห็น)

| ไฟล์ | แก้ |
|------|-----|
| `scripts/generate-email-icons.mjs` | หยุด generate logo placeholder 1PX — คัดลอกจาก `brand-assets` |
| `scripts/generate-ux-checklist-pdf.ts` | ลบ "1PX", "Pixel100" จาก PDF |
| `docs/ux-research-review.md` | อัปเดตเป็น Aplus1 (ถ้ายังอ้าง Pixel100) |
| `src/lib/lineNotificationKinds.vendored.ts` | label "Pixel100 showcase" → "Aplus1" (รัน vendor sync ถ้าต้องการ) |

**ไม่ต้องแก้ในรอบโลโก้ (ยกเว้นผู้ใช้สั่ง):**
- `*@demo.pixel100.com` — บัญชี demo จริง
- `an1hem-theme` / storage keys

---

## ขั้นตอนที่ 8 — ทดสอบอัปเดต

| ไฟล์ | แก้ |
|------|-----|
| `e2e/smoke/seo.smoke.spec.ts` | `Pixel100` → `Aplus1` ใน title/OG/JSON-LD |
| `src/lib/__tests__/brandConfig.test.ts` | ถ้าเพิ่ม `BRAND_LOGO` — test paths |
| (optional) snapshot tests ของ `BrandLogo` | ถ้ามี |

รัน:

```powershell
cd Anthem-Code
npm run typecheck
npm run test
npm run e2e:seo
npm run mobile:doctor
npm run smoke:public
```

---

## ขั้นตอนที่ 9 — Deploy

```bash
# จาก repo root
./scripts/deploy-vercel.sh production 1px
```

ลำดับ:
1. Deploy **aplus1-prod** ก่อน — ให้ `https://aplus1.app/brand/*` และ `/icons/*` โหลดได้
2. ทดสอบ OG: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) ใส่ `https://aplus1.app`
3. ถ้าแก้อีเมล — deploy So1o + Edge ตาม email handoff

---

## ตารางไฟล์ทั้งหมด (checklist)

### ต้องแตะเมื่อ rollout โลโก้

- [ ] `brand-assets/incoming/*` → process → `public/brand/*`, `public/icons/*`, `public/email/*`
- [ ] `src/lib/brandConfig.ts`
- [ ] `src/components/brand/BrandLogo.tsx`
- [ ] `index.html`
- [ ] `src/lib/seo.ts`
- [ ] `public/manifest.webmanifest`
- [ ] `public/favicon.ico`
- [ ] `public/offline.html` (verify only)
- [ ] `capacitor.config.json`
- [ ] `scripts/generate-brand-assets.mjs` (สร้างใหม่) หรือ copy manual
- [ ] `scripts/generate-email-icons.mjs`
- [ ] `src/lib/email-templates/layout.tsx`
- [ ] `src/lib/email-templates/icons.tsx`
- [ ] `email-previews/*` (regenerate)
- [ ] `Solo-Code` vendor + `anthem-email-html.ts`
- [ ] `e2e/smoke/seo.smoke.spec.ts`
- [ ] `scripts/generate-ux-checklist-pdf.ts` (ถ้า PDF ยังมี 1PX)

### ได้โลโก้ใหม่โดยอัตโนมัติ (ผ่าน BrandLogo)

- [ ] `src/components/FeedHeader.tsx`
- [ ] `src/pages/AuthPage.tsx`
- [ ] `src/components/AuthDialog.tsx`
- [ ] `src/components/HttpErrorPage.tsx`

### ไม่ใช่โลโก้ — ไม่แตะในรอบนี้

- [ ] ปุ่ม `bg-gradient-brand` ทั่วแอป
- [ ] `UserAvatar` fallback gradient
- [ ] `NotificationsPanel` icon กล่องส้ม
- [ ] Studio upload `logoUrl` (โลโก้สตูดิโอของ user)
- [ ] `BriefcaseIcon` และ icons อื่นใน `src/components/icons/`

---

## QA หลัง rollout

### Visual

- [ ] Header desktop + mobile — คม ไม่เบลอ
- [ ] Auth page — โลโก้บนพื้น gradient อ่านได้ (ใช้ white variant ถ้าจำเป็น)
- [ ] Dark mode (ถ้าเปิด) — contrast โอเค
- [ ] Tab browser — favicon ถูกต้อง
- [ ] Add to Home Screen (Android/iOS) — icon ไม่โดนตัด

### SEO / Share

- [ ] View source / DevTools — `og:image` ชี้ `aplus1.app/brand/og-share-1200x630.png`
- [ ] แชร์ลิงก์ใน LINE — ภาพ preview ใหม่
- [ ] JSON-LD ชื่อ `Aplus1`

### Email

- [ ] ส่งทดสอบ Resend — header อีเมลเป็นโลโก้ใหม่
- [ ] Gmail / Outlook mobile

### Regression

- [ ] `npm run e2e:seo` ผ่าน
- [ ] `npm run mobile:doctor` ผ่าน
- [ ] ไม่มี `1PX` / `Pixel100` ใน UI ที่ user เห็น (ยกเว้น demo email domain)

ค้นหา:

```powershell
rg -n "Pixel100|1PX|pixel100\.com" Anthem-Code/src Anthem-Code/public Anthem-Code/index.html Anthem-Code/email-previews
```

---

## คำสั่ง Cursor (copy-paste เมื่อได้ไฟล์โลโก้แล้ว)

```text
อ่าน Anthem-Code/docs/logo-rollout-handoff.md และ Anthem-Code/docs/email-redesign-handoff.md

ไฟล์โลโก้อยู่ใน Anthem-Code/brand-assets/incoming/

ทำ logo rollout ทั้งเว็บตาม handoff:
1) generate/export ไป public/brand, public/icons, public/email, favicon
2) เพิ่ม BRAND_LOGO ใน brandConfig.ts
3) แก้ BrandLogo.tsx ให้ใช้รูปจริง รองรับ variant color/white/black/mark
4) อัปเดต index.html, seo.ts DEFAULT_OG_IMAGE, manifest, capacitor.config.json
5) ทำ email layout + vendor ไป Solo + anthem-email-html.ts
6) แก้ e2e seo tests และ generate-ux-checklist-pdf ถ้ายังมีแบรนด์เก่า
7) npm run email:preview, typecheck, test, e2e:seo, mobile:doctor
8) รายงาน checklist ที่ยังค้างก่อน deploy
```

---

## สรุปสั้น

| ทำอะไรก่อน | ทำไม |
|------------|------|
| วางไฟล์ใน `brand-assets/incoming/` | จุดรับมาตรฐาน |
| Export → `public/brand` + `public/icons` | static assets ทั้งเว็บ |
| แก้ `BrandLogo.tsx` | กระทบ header ทุกหน้า |
| แก้ `seo.ts` + `index.html` | แชร์ลิงก์ / favicon |
| ทำ email handoff | เมลที่ส่งจริงใช้รูปเดียวกัน |
| Deploy aplus1-prod | URL รูปต้อง live บน production |

---

*อัปเดต: มิ.ย. 2026 — รอไฟล์โลโก้จากทีมดีไซน์*
