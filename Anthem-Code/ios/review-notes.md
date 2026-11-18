# Notes for App Review

Paste the block below into App Store Connect → App Review Information → Notes. The demo account's email and password go
in the Sign-in fields there (the owner types the password; it is never written in this repo).

**Demo account:** `tester@samecor.com`. It is the account used for Play testing: email confirmed, profile complete,
password sign-in. During review, do not approve a delete request from this account in admin → privacy requests. A reviewer
may test deletion, and approving it would hide the demo account.

---

SAMECOR is a gallery and community for Thai creators. Creators post their projects, people browse work by category,
follow creators and chat with them. The interface is in Thai; Thai labels are given in brackets below. The app is free and has no purchases. Browsing works without an account; posting,
following and chat need one (demo account above).

Native features in this build:
- Push notifications (APNs) for new chat messages, followers and activity on your work. Turn on in Settings (ตั้งค่า) → Notifications (การแจ้งเตือน);
  tapping a notification opens the related page.
- Native share sheet, print sheet and file saving (Save to Files / Save Image) for exports, PDFs and images.
- Camera and video capture for posting work, swipe-back navigation, pull to refresh, light and dark appearance that follows the page.

User-generated content (1.2):
- Report: every project, comment, profile and chat message has Report (รายงาน) in its "…" menu. Reports reach our moderation team
  immediately (admin alerts) and are handled within 24 hours.
- Block: from the same menus, or "block too" inside the report dialog. Unblock in Settings (ตั้งค่า) → Chat (แชท).
- Terms (accepted at sign-up) forbid objectionable content and abusive users: https://samecor.com/legal/terms
- Contact: support@samecor.com

Account deletion (5.1.1(v)): Settings (ตั้งค่า) → My data (ข้อมูลของฉัน) → Delete account (ขอลบบัญชี) → confirm with the account password. The account is
hidden as soon as the request is approved and permanently deleted after 30 days; the screen shows the dates. A public
page also explains it: https://samecor.com/legal/delete-account

Payments: none. The app sells no digital goods or subscriptions and shows no prices or external purchase links.

Privacy policy: https://samecor.com/legal/privacy
