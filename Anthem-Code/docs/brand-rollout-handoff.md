# Aplus1 Brand Rollout — Web + Email + PWA

Updated: 2026-07-03

เอกสารรวมสำหรับ rollout แบรนด์ Aplus1 เมื่อได้ไฟล์โลโก้จริง — **ครบทุกจุด** (เว็บ, favicon, OG, PWA, Capacitor, อีเมล, vendor Solo)

แหล่งความจริงชื่อแบรนด์: [brandConfig.ts](../src/lib/brandConfig.ts)

---

## สถานะปัจจุบัน

| จุด | ตอนนี้ |
|-----|--------|
| Header / Auth | `BrandLogo` = gradient box + ตัว `1` + ข้อความ Aplus1 |
| Favicon / PWA | `public/icons/` (ตรวจ `npm run mobile:doctor`) |
| OG / แชร์ | `index.html` + `src/lib/seo.ts` |
| อีเมล production | Resend + `notify.aplus1.app` / `noreply@aplus1.app` |
| Template อีเมล | 15 ฉบับ — header ยัง wordmark `1PX` / Pixel100 ใน preview |
| โลโก้อีเมล | placeholder `public/email/logo.png` จาก `generate-email-icons.mjs` |
| Capacitor | `com.pixel100.app` / `Pixel100` — ต้องเปลี่ยน |

**รอโลโก้จริงก่อน** แล้วทำตามลำดับด้านล่าง

> `bg-gradient-brand` บนปุ่ม/UI คือ **สี accent** ไม่ใช่โลโก้ — ไม่ต้องลบ เว้น art direction สั่งเปลี่ยน

---

## ขั้นที่ 0 — รับไฟล์

วางใน `Anthem-Code/brand-assets/incoming/`:

| ไฟล์ | พื้นหลัง | ใช้ที่ |
|------|----------|--------|
| `logo-lockup-color.svg/png` | ใส | header, OG art |
| `logo-mark-color.svg/png` | ใส | favicon, PWA |
| `logo-lockup-white.svg/png` | ใส | auth hero / พื้นเข้ม |
| `logo-lockup-black.svg/png` | ใส | PDF / ขาวดำ |
| `og-share-1200x630.png` | art | Facebook, LINE, Twitter |

---

## ขั้นที่ 1 — Export ไป `public/`

สร้าง `scripts/generate-brand-assets.mjs` หรือ copy manual:

| Output | ขนาด |
|--------|------|
| `public/brand/logo-lockup-*.png` | ~400px กว้าง |
| `public/brand/logo-mark-*.png` | 128×128 |
| `public/brand/og-share-1200x630.png` | 1200×630 |
| `public/favicon.ico` | 16/32/48 |
| `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | PWA |
| `public/icons/apple-touch-icon.png` | 180×180 |
| `public/email/logo.png` | 64–128px กว้าง |
| `public/email/logo-white.png` | optional |

```bash
cd Anthem-Code && npm run mobile:doctor
```

เพิ่มใน `brandConfig.ts`:

```ts
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

## ขั้นที่ 2 — Web (`BrandLogo.tsx` ก่อน)

### `src/components/brand/BrandLogo.tsx`

แก้ไฟล์เดียว → header ทั้งเว็บเปลี่ยน

- ลบ gradient box + `{BRAND_MARK}` เป็นตัวอักษร
- ใช้ `<img src={resolveLogoSrc(variant, markOnly)} alt={BRAND_NAME} />`
- Props: `variant` (color/white/black), `markOnly`, `showWordmark`

อัปเดตอัตโนมัติ: `FeedHeader`, `AuthPage`, `AuthDialog`, `HttpErrorPage`

### SEO / PWA / Mobile

| ไฟล์ | แก้ |
|------|-----|
| `index.html` | favicon, og:image, twitter:image → production absolute URL |
| `src/lib/seo.ts` | `DEFAULT_OG_IMAGE` → `/brand/og-share-1200x630.png` |
| `public/manifest.webmanifest` | name, icons, theme_color |
| `capacitor.config.json` | `appId` → `com.aplus1.app`, `appName` → `Aplus1` |
| `e2e/smoke/seo.smoke.spec.ts` | `Pixel100` → `Aplus1` |

---

## ขั้นที่ 3 — Email

### เป้าหมายดีไซน์

- mobile-first 560–600px, ภาษาไทย, accent `#FF4F18`, paper `#F5F1EC`
- **ห้าม** 1PX / Pixel100 / referral clutter / app store icons

### Shell ก่อน (Phase A)

1. `_brand.ts` — paper, surface, backgroundColor
2. `layout.tsx` — wordmark Aplus1, tagline จาก `BRAND_TAGLINE`, ลบ 1PX
3. `icons.tsx` — `logoUrl(variant?)` ชี้ `public/email/logo*.png`

### Copy (Phase B)

- `topup-success.tsx` — ห้าม 24h AML hold copy เก่า
- `cashout-status.tsx`, `gift-received.tsx` — เครดิตแทน Pixel/px

### Signup premium (Phase C)

- `EmailHeroImage`, `EmailHighlightBox`, `EmailAccountCard` + ปรับ `signup.tsx`

### Sync production (Phase D)

```bash
cd Anthem-Code && npm run email:preview
cd ../Solo-Code && node scripts/vendor-anthem-email-templates.mjs
# แก้ supabase/functions/_shared/anthem-email-html.ts (alt ยัง Pixel100)
# Deploy aplus1-prod → So1o → Edge notify-*
```

Template ครบ 15 ฉบับ: auth 6 + notification 9 — ดู `src/lib/email-templates/`

---

## ขั้นที่ 4 — สคริปต์ / เอกสาร

| ไฟล์ | แก้ |
|------|-----|
| `scripts/generate-email-icons.mjs` | คัดลอกจาก brand assets แทน generate 1PX |
| `scripts/generate-ux-checklist-pdf.ts` | ลบ 1PX / Pixel100 |
| `Solo-Code` vendor + `anthem-email-html.ts` | sync หลังแก้ templates |

**ไม่ต้องแก้ในรอบโลโก้:** `*@demo.pixel100.com`, internal storage keys

---

## ขั้นที่ 5 — ทดสอบ & Deploy

```bash
cd Anthem-Code
npm run typecheck && npm run test
npm run e2e:seo && npm run mobile:doctor
npm run smoke:public
npm run email:preview
```

ค้นหาแบรนด์เก่า:

```powershell
rg -n "Pixel100|1PX|pixel100\.com" Anthem-Code/src Anthem-Code/public Anthem-Code/index.html Anthem-Code/email-previews Solo-Code/src/lib/email/anthem-vendor Solo-Code/supabase/functions/_shared/anthem-email-html.ts
```

Deploy:

```bash
./scripts/deploy-vercel.sh production 1px   # aplus1-prod ก่อน — assets live
# แล้ว So1o + Edge ถ้าแก้อีเมล
```

QA: header desktop/mobile, favicon, OG แชร์ LINE, Gmail/Outlook email, `https://aplus1.app/email/logo.png` → 200

---

## Checklist รวม

- [ ] `brand-assets/incoming/*` → `public/brand`, `public/icons`, `public/email`
- [ ] `brandConfig.ts` + `BrandLogo.tsx`
- [ ] `index.html`, `seo.ts`, `manifest.webmanifest`, `capacitor.config.json`
- [ ] `email-templates/layout.tsx` + `icons.tsx` + regenerate previews
- [ ] Solo vendor + `anthem-email-html.ts`
- [ ] `e2e:seo`, `mobile:doctor`, Resend test send

---

## คำสั่ง Cursor

```text
อ่าน Anthem-Code/docs/brand-rollout-handoff.md
ไฟล์โลโก้ใน Anthem-Code/brand-assets/incoming/

ทำ rollout ครบ: export assets → BrandLogo + BRAND_LOGO → SEO/PWA/Capacitor → email layout + vendor Solo → sync anthem-email-html.ts → test + rg หา Pixel100/1PX → รายงาน checklist ก่อน deploy
```
