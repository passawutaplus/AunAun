# Manual QA Checklist

Run this checklist before every release and when onboarding external QA.

## Browsers

- [ ] Chrome (latest, desktop)
- [ ] Safari (latest, macOS)
- [ ] Safari (latest, iOS)
- [ ] Firefox (latest, desktop)
- [ ] Edge (latest, desktop)
- [ ] Chrome (latest, Android)

## Viewports

- [ ] 360 × 640 (mobile S)
- [ ] 414 × 896 (mobile L)
- [ ] 768 × 1024 (tablet)
- [ ] 1024 × 768 (laptop)
- [ ] 1440 × 900 (desktop)
- [ ] Notch / safe-area on iPhone

## Auth states

For each major page (`/`, `/portfolio`, `/jobs`, `/chat`, `/admin`):
- [ ] Guest sees correct CTA / sign-in dialog
- [ ] Unverified user sees email-verify gate
- [ ] Verified user sees full UI
- [ ] Admin sees admin nav
- [ ] Session expiry → redirected to `/auth?redirect=…`

## States per list/page

- [ ] Loading skeleton
- [ ] Empty state
- [ ] Error state (network down — use DevTools offline)
- [ ] Long content (overflow, wrapping)
- [ ] Very short content
- [ ] RTL? (n/a for Thai but verify long-word wrap)

## Accessibility

- [ ] Tab order is logical, no traps
- [ ] All interactive elements focusable + visible focus ring
- [ ] All images have meaningful `alt` or `alt=""` if decorative
- [ ] Landmarks: `<main>`, `<nav>`, `<header>`, `<footer>` present
- [ ] Color contrast ≥ 4.5:1 (use axe DevTools)
- [ ] Forms have labels (not just placeholders)
- [ ] Errors announced (aria-live or sonner toast)

## Forms

For every form: register, login, password reset, project editor, job post, ad apply, gift, cashout, profile edit:
- [ ] Required fields enforced
- [ ] Max length enforced
- [ ] Invalid input shows inline error
- [ ] Submit disabled while in-flight
- [ ] Success toast on submit
- [ ] Error toast on failure (no console-only failures)

## Security smoke

- [ ] Open DevTools → Network: no service-role key in any response
- [ ] Try to fetch another user's `/wallets` row → blocked (RLS)
- [ ] Try to mutate another user's project → blocked
- [ ] Try `?redirect=//evil.com` on auth → redirects to `/`
- [ ] Logout clears session, refresh stays logged-out

## Performance

- [ ] Lighthouse mobile ≥ 70
- [ ] Lighthouse desktop ≥ 90
- [ ] LCP < 2.5s on Fast 3G throttling
- [ ] No layout shift (CLS < 0.1)
- [ ] Largest image ≤ 200KB or lazy-loaded

## Report & Feedback

- [ ] กดปุ่ม Flag ในการ์ดผลงาน (ProjectSidePanel) → เปิด ReportDialog ได้
- [ ] กดปุ่ม "รายงาน" ในหน้าโปรไฟล์คนอื่น → เปิด ReportDialog ได้
- [ ] รายงานซ้ำที่ target เดิม (status=open) → ขึ้น error/บล็อกโดย unique partial index
- [ ] อัปโหลดหลักฐานหลายไฟล์ (รูป/วิดีโอ ≤ 10MB × 5) → URL ถูกเก็บใน `evidence_files`
- [ ] FeedbackFab (มุมขวาล่าง) ปรากฏทุกหน้า ยกเว้น `/auth`, `/admin`
- [ ] หน้า `/me/reports` แสดงรายการของผู้ใช้ปัจจุบัน แท็บ open/reviewing/resolved/dismissed
- [ ] หน้า `/me/feedback` แสดง rating + status + admin reply ที่ผู้ใช้ส่ง
- [ ] ProfileMenuCard และ SettingsPage มีลิงก์ไปยัง /me/reports และ /me/feedback
- [ ] Admin → AdminReportsPage จัดการ status, batch actions, ดูหลักฐานได้
- [ ] Admin → AdminFeedbackPage มีกราฟแนวโน้ม, ตัวกรองช่วงเวลา, ส่งออก CSV
- [ ] Admin ได้รับ in-app notification เมื่อมี report/feedback ใหม่ (ลิงก์ไปหน้าที่เกี่ยวข้อง)

## Notifications (email + LINE + in-app)

- [ ] Settings → email toggles (`notify_email`, `notify_hire`, `notify_job_match`) ทำงาน
- [ ] Settings → LINE section แสดงเมื่อ Pro+ · test samples ส่งได้
- [ ] Hire request → recipient ได้ email + LINE + in-app (ถ้าเปิด prefs)
- [ ] Gift / follow → ตรวจ `npm run email:preview` templates ตรงกับที่ส่ง
- [ ] ปิด `notify_hire` → ส่ง hire อีกครั้ง → ไม่ได้ email
- [ ] `/notifications` แสดง in-app rows + mark read

## Microcopy (ดู [microcopy-style-guide.md](../../docs/microcopy-style-guide.md))

- [ ] `/research` — warning อ่านครั้งเดียวเข้าใจ ไม่ซ้ำ tagline + concept
- [ ] Demo banner ไม่ซ้ำกับ ResearchPage warning
- [ ] Error page อ่านเข้าใจใน 3 วินาที (title + desc ไม่ทับกัน)
- [ ] อีเมล auth ใช้ footer มาตรฐานจาก `src/lib/copyConstants.ts`
