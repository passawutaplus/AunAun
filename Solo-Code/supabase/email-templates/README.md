# Supabase Auth email templates

Paste each file into Supabase Dashboard → Authentication → Emails → Templates, with its subject:

| Supabase template | File | Subject |
|---|---|---|
| Reset password | `recovery.html` | ตั้งรหัสผ่านใหม่สำหรับบัญชี SAMECOR |
| Confirm sign up | `confirmation.html` | ยืนยันอีเมลเพื่อเริ่มใช้ SAMECOR |
| Magic link or OTP | `magic_link.html` | ลิงก์เข้าสู่ระบบ SAMECOR |

The HTML is generated from the shared email layout in `functions/_shared/anthem-email-html.ts`
(`renderAuthEmailTemplate`), so auth and notification emails always look the same. Don't edit the HTML
files by hand — change the layout, then regenerate:

```bash
cd Anthem-Code && npx tsx ../Solo-Code/supabase/email-templates/build.mts
```

Links use `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=…`, so they point at samecor.com
(`/reset-password`, `/auth/callback`) instead of supabase.co and work across devices. `RedirectTo` must be
listed in Authentication → URL Configuration → Redirect URLs.

Images load from `https://samecor.com/email/…` (logo, flat icons) — deploy the web app before pasting.
