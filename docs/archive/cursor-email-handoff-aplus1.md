# Cursor Handoff: Aplus1 Email System

## Context

โปรเจกต์เปลี่ยนแบรนด์เป็น **Aplus1 / aplus1.app** แล้ว ห้ามใช้ชื่อเก่า `Pixel100`, `1PX`, `1px-demo`, `pixel100.com`, หรือข้อความแนว “ทุกคนคือ 1 PX” ในอีเมลที่ผู้ใช้เห็น

โฟลเดอร์ที่ควรทำต่อ:

`C:\Users\PC\Downloads\AunAun-main (1)\AunAun-main\Anthem-Code`

หมายเหตุ: โฟลเดอร์ `C:\Users\PC\Downloads\Anthem-Code-main (2)\Anthem-Code-main` ยังเป็นเวอร์ชันเก่า Pixel100 ไม่ควรใช้เป็นตัวหลัก เว้นแต่ต้องการเทียบ reference

## Goal

ทำระบบอีเมล transactional ให้ครบและสวยในโทน Aplus1:

- สะอาด อ่านง่าย ดู premium creative social app
- mobile-first 560-600px email layout
- ใช้ภาษาไทยเป็นหลัก
- accent สี coral orange `#FF4F18`
- พื้นหลังนอกการ์ดเป็น warm paper `#F5F1EC`
- มี visual motif แบบ pixel/grid เล็ก ๆ ได้ แต่ห้ามกลับไปใช้คำว่า 1PX เป็นแบรนด์
- ห้ามใส่ referral/app-store/social clutter แบบ template สำเร็จรูป

## Current Email Coverage

มี template แล้ว 15 ฉบับ ถือว่าครอบคลุมแกนหลัก:

Auth:

- signup / confirm email
- invite
- magic link
- password recovery
- email change
- reauthentication OTP

Notifications:

- hire request
- chat message
- job match
- collab request
- gift received
- new follower
- job application
- top-up success
- cashout status

สิ่งที่ควรเพิ่มภายหลังถ้าจะ production จริง:

- security alert: login from new device, password changed, email changed complete
- payout/cashout failed with reason and next step
- moderation/report outcome
- weekly digest หรือ missed notifications digest เฉพาะกรณีผู้ใช้เปิดรับ
- invoice/receipt ถ้ามีการจ่ายเงินจริงผ่าน Stripe

## Required Source Fixes

Search and remove visible old brand strings:

```text
Pixel100
1PX
1px-demo
pixel100.com
support@pixel100.com
privacy@pixel100.com
ชุมชนครีเอทีฟ — ทุกคนคือ 1 PX
```

Allowed to keep internal compatibility names only if they are not visible to users:

```text
ANTHEM_*
BRAND_ECOSYSTEM_KEY = "anthem"
an1hem-theme
an1hem_onboarding
```

Reason: existing storage/session keys should not be renamed casually.

## Brand Source

Use `src/lib/brandConfig.ts` as the source of truth:

```ts
BRAND_NAME = "Aplus1"
BRAND_DOMAIN = "aplus1.app"
APLUS1_PRODUCTION_URL = "https://aplus1.app"
APLUS1_DEMO_URL = "https://aplus1-demo.vercel.app"
BRAND_SUPPORT_EMAIL = "support@aplus1.app"
BRAND_PRIVACY_EMAIL = "privacy@aplus1.app"
BRAND_TAGLINE = "โปรไฟล์เดียว เชื่อมต่อทุกโอกาสของครีเอทีฟ"
```

## Design System

Update `src/lib/email-templates/_brand.ts`:

```ts
export const brand = {
  orange: '#FF4F18',
  orangeLight: '#FF7A45',
  orangeFade: '#FFF4EF',
  orangeMuted: '#FFE4D6',
  ink: '#141517',
  body: '#4A4A4A',
  mute: '#9CA3AF',
  border: '#E8E6E3',
  surface: '#F8F7F4',
  paper: '#F5F1EC',
  white: '#FFFFFF',
  mint: '#18B884',
  charcoal: '#222326',
  success: '#059669',
  warning: '#DC2626',
} as const
```

Recommended email shell:

- body background: `brand.paper`
- main card: white, 14px radius, subtle border, soft shadow
- header: white to coral fade, 1px orange-muted bottom border
- wordmark: `Aplus1` with `1` in orange
- tagline: `โปรไฟล์เดียว เชื่อมต่อทุกโอกาสของครีเอทีฟ`
- optional small right-side pixel cluster using `brand.ink`, `brand.orange`, `brand.mint`, `brand.orangeMuted`

## Important Copy Fix

In `src/lib/email-templates/topup-success.tsx`, change the misleading AML copy.

Current bad message:

```text
ยอดที่เติมอาจมีช่วงพัก 24 ชม. ก่อนใช้ส่งของขวัญ (AML)
```

Replace with:

```text
เครดิตพร้อมใช้สำหรับส่งของขวัญและสนับสนุนครีเอเตอร์ทันที
```

Also change visible “Pixel” wording:

```text
เติม Pixel สำเร็จ -> เติมเครดิตสำเร็จ
ยอด px เข้ากระเป๋าแล้ว -> ยอดเครดิตเข้ากระเป๋าแล้ว
การเติม Pixel ของคุณบน Aplus1 สำเร็จแล้ว -> การเติมเครดิตของคุณบน Aplus1 สำเร็จแล้ว
เปิดกระเป๋า Pixel -> เปิดกระเป๋า
subject: เติม Pixel สำเร็จ -> เติมเครดิตสำเร็จ
```

## Layout Import Note

During Codex work, `layout.tsx` in Downloads was locked for overwrite. A new file may already exist:

```text
src/lib/email-templates/layout-aplus1.tsx
```

Cursor can either:

1. Replace `layout.tsx` with the improved Aplus1 layout, then keep imports as `from './layout'`
2. Or keep `layout-aplus1.tsx` and update all email template imports to `from './layout-aplus1'`

Prefer option 1 if Cursor can write the locked file, because it keeps the codebase cleaner.

Templates that must use the Aplus1 layout:

```text
signup.tsx
invite.tsx
magic-link.tsx
recovery.tsx
email-change.tsx
reauthentication.tsx
hire-request.tsx
chat-message.tsx
job-match.tsx
collab-request.tsx
gift-received.tsx
follow.tsx
job-application.tsx
topup-success.tsx
cashout-status.tsx
```

## Preview Script Fix

Update `scripts/preview-emails.ts`:

```text
Pixel100 Email Previews -> Aplus1 Email Previews
CI Pixel100 -> Aplus1 transactional email system
```

Then regenerate previews:

```powershell
npm run email:preview
```

After regeneration, search:

```powershell
rg -n "Pixel100|1PX|1px-demo|pixel100|support@pixel100|privacy@pixel100" src scripts email-previews public
```

There should be no user-visible old brand strings.

## Visual QA

Open these generated previews first:

```text
email-previews/auth-signup.html
email-previews/auth-recovery.html
email-previews/notify-hire-request.html
email-previews/notify-chat-message.html
email-previews/notify-topup-success.html
email-previews/notify-cashout-status.html
```

Check:

- header says Aplus1, not 1PX
- footer domain is aplus1.app
- support email is support@aplus1.app
- CTA is visible and not too wide on mobile
- card spacing feels airy
- no generic referral/app-store/social sections
- top-up copy no longer mentions 24-hour hold
- all subjects use `[Aplus1]`

## Suggested Cursor Prompt

```text
Please finish the Aplus1 transactional email redesign in this repo.

Use src/lib/brandConfig.ts as source of truth. Remove all user-visible Pixel100/1PX/1px-demo/pixel100.com strings from email templates, generated previews, and preview index. Keep internal ANTHEM_* compatibility names only if not visible.

Apply the Aplus1 email design system: warm paper outer background, white card, coral #FF4F18 accent, Aplus1 wordmark, Thai tagline "โปรไฟล์เดียว เชื่อมต่อทุกโอกาสของครีเอทีฟ", clean mobile-first transactional layout, no referral/app-store/social clutter.

Ensure all auth and notification templates use the improved Aplus1 layout. Fix top-up copy so it says credits are ready to use immediately, not held for 24 hours. Regenerate email previews with npm run email:preview, then search for old brand strings and run typecheck/build if available.
```
