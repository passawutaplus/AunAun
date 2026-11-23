# Notes for App Review

Version 1.1.0. Paste the block below into App Store Connect → App Review Information → Notes. The demo account's email and password go
in the Sign-in fields there (the owner types the password; it is never written in this repo).

**Demo account (not for pasting):** `tester@samecor.com`. Email confirmed, profile complete with a published project,
password sign-in, not an admin. Before submitting, give it at least one chat conversation so the reviewer can try chat. During review, do not approve a delete request from this account in admin → privacy requests. A reviewer
may test deletion, and approving it would hide the demo account.

---

SAMECOR is a gallery and community for Thai creators. Creators post their projects, people browse work by category,
follow creators and chat with them. The interface is in Thai; Thai labels are given in brackets below. The app is free and has no purchases. Browsing works without an account; posting,
following and chat need one (demo account above).

Native features in this build:
- Push notifications (APNs) for new chat messages, followers and activity on your work. Turn on in Settings (ตั้งค่า) → Notifications (การแจ้งเตือน);
  tapping a notification opens the related page.
- Sign in with Apple (native Apple sheet), plus Google, LINE and Facebook sign-in in an ASWebAuthenticationSession sheet.
  All are on the sign-in screen (เข้าสู่ระบบ) as a row of logo buttons; Apple is first. Accounts can be linked in Settings (ตั้งค่า) →
  Account (บัญชี) → Linked accounts (บัญชีที่เชื่อมไว้). The demo account uses email and password.
- Universal links: samecor.com links to projects, profiles and events open in the app.
- Native share sheet, print sheet and file saving (Save to Files / Save Image) for exports, PDFs and images.
- Rating requests use SKStoreReviewController only (no custom rating prompt), after a positive moment such as publishing the first project.
- Camera and video capture for posting work, swipe-back navigation, pull to refresh, light and dark appearance that follows the page.

User-generated content (1.2):
- Report: every project, comment, profile and chat message has Report (รายงาน) in its "…" menu. Reports reach our moderation team
  immediately (admin alerts) and are handled within 24 hours.
- Block: from the same menus, or "block too" inside the report dialog. Unblock in Settings (ตั้งค่า) → Chat (แชท).
- Filtering: posts, comments and community text go through a profanity and spam filter before they are shown.
- Terms (accepted at sign-up) forbid objectionable content and abusive users: https://samecor.com/legal/terms
- Contact: support@samecor.com

Account deletion (5.1.1(v)): Settings (ตั้งค่า) → My data (ข้อมูลของฉัน) → Delete account (ขอลบบัญชี) → confirm with the account password. The team processes the request within 7 business days (the screen says so):
the profile and work are hidden at once, the account is permanently deleted 30 days later, and the user can cancel
until then (the dates appear on the same screen). A public page also explains it: https://samecor.com/legal/delete-account
For accounts that use Sign in with Apple, the permanent deletion also revokes the app's Apple tokens through Apple's
REST API (appleid.apple.com/auth/revoke), so SAMECOR disappears from the user's "Sign in with Apple" apps.

Payments: the app sells no digital goods, subscriptions or in-app content, and has no external purchase links.
Creators can send a client a quote or invoice in chat for freelance work (design, illustration, photography) that is
done and paid outside the app, between the two people (guideline 3.1.3(e), goods and services consumed outside the app).
SAMECOR does not take a cut and processes no payment.

Privacy policy: https://samecor.com/legal/privacy
