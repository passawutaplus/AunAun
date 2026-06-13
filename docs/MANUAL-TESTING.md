# Manual QA — สิ่งที่ต้องลงมือทำเอง

Automated gate รันได้ด้วย:

```bash
./scripts/test-ecosystem-full.sh    # QA gate เต็ม (แนะนำ)
./scripts/test-ecosystem.sh         # แค่ unit + curl smoke
```

หรือแยกแอป:

```bash
cd Solo-Code && npm run test:gate
cd Anthem-Code && npm run test:gate
```

รายการด้านล่าง **ไม่มีใน automated gate** — ต้อง QA มือ / บัญชีจริง / อุปกรณ์จริง

---

## ทุก release (ทั้งสองแอป)

1. **Login / logout จริง** — email/password, Google OAuth, session หมดอายุกลางทาง
2. **Password reset** — `/auth/forgot` → อีเมล → `/reset-password`
3. **Email verification** — unverified user เห็น gate ถูกต้อง
4. **User A vs User B** — ไม่เห็น wallet / quotation / messages ของคนอื่น (RLS)
5. **Logout แล้ว Back** — ไม่เห็น data เก่า
6. **iPhone Safari จริง** — chat, upload, PWA, PDF (Solo)
7. **Lighthouse** — mobile ≥ 70, desktop ≥ 90 (`node scripts/performance/run-performance.mjs`)
8. **axe DevTools** — contrast, labels, focus

---

## Solo-Code — manual เฉพาะ

### Dashboard flows (สร้าง → refresh → ยังอยู่)

9. Pipeline → Quotation → Job Tracker end-to-end
10. Smart Brief → share `/brief/:token` → client เปิดได้
11. Quotation → PDF mockup → share `/track/:token`
12. Income, Tax sandbox, 50 ทวิ scan (AI)
13. **Stripe subscriptions** — Pro checkout (sandbox card 4242…)
14. **Stripe Pro+** — upgrade path จาก Pro (`pro_plus_monthly` / `yearly`)
15. **Stripe In-House** — per-seat checkout (min 2 seats) → org seat limit sync
16. Clients / Suppliers / Assets / Legal Desk
17. Planner: Content calendar, To Do, Feedback
18. Settings: profile, theme, **LINE link** (`/line-link`), LINE prefs matrix
19. Onboarding ครั้งแรก + Command menu (⌘K)

### Token / public pages

18. `/supplier/:token`, `/license/:token`, `/vision/:token`, `/planner/:token`
19. Invalid token → empty state สุภาพ

### Inhouse (shipped MVP)

20. Create org จาก `/pricing` → first workspace
21. Invite `/inhouse/invite/:token`, pending invites inbox
22. kanban, todos, chat, canvas, monitor — owner vs member vs viewer
23. Seat limit enforcement หลัง Stripe seat change

### Admin (ทุก tab ใน Mission Control)

22. overview, activity_feed, users, tickets, chat, early_access
23. feature_usage, activity, device, ai_usage, business, subscriptions, payments
24. announcements, banners, articles, ai_center, health, usage, supabase

### API / backend (curl หรือ Stripe dashboard)

25. Stripe checkout + webhook (`/api/public/payments/webhook`)
26. Cron: deadline reminders, payment reminders, daily trends (secret header)
27. LINE webhook + push — OA AI chat (`ทีมงาน`), test samples จาก Settings
28. LINE prefs: portal + anthem + inhouse kinds เปิด/ปิดแยกกลุ่ม
29. AI assistant stream + quota หมด

### อีเมล / notifications

30. `node scripts/send-test-emails.mjs` / preview transactional templates
31. Anthem `npm run email:preview` — ตรวจ notification templates

---

## Anthem-Code — manual เฉพาะ

### Core product

30. Portfolio: publish/draft, gallery/video upload, drag order
31. `/project/:id` published vs draft (guest เห็น/ไม่เห็น)
32. Jobs: โพสต์, apply, `/jobs/:id`
33. Hiring + Collab requests (portfolio manage tabs)
34. Chat: ส่งข้อความ, กลุ่ม, pin, upload (นอก demo E2E)
35. Wallet / Earnings / **PX top-up** (`px_*` lookup keys) → `?topup=success`
36. **Stripe Connect onboard** + cashout submit → admin transfer ที่ `/admin/gifts`
37. Gifts ส่งข้าม user (welcome_px / holding rules)
37. Ads: สร้าง campaign, `/ads/:id`
38. Contracts: `/contracts`, `/contracts/new`, generate PDF
39. Collections + Inspire boards
40. Studio: `/studio/new`, invites, manage, `/s/:slug` public
41. `/upgrade` + tier sync กับ So1o
42. Verification `/verify` + admin KYC/AML

### Report & Feedback (qa-checklist)

43. Flag ผลงาน / รายงานโปรไฟล์ → ReportDialog
44. Evidence upload 5 ไฟล์ ≤ 10MB
45. `/me/reports`, `/me/feedback`, admin reports/feedback + CSV

### UI global

46. Cookie consent accept/reject (ไม่บังปุ่ม login)
47. DemoModeBanner (`VITE_DEMO_MODE`)
48. FeedbackFab, AnthemAssistantFab, BottomNav mobile

### Admin (ทุกหน้า `/admin/*`)

49. overview, activity, analytics, users, projects, studios, jobs
50. hiring, collabs, chats, comments, collections, inspire, gifts
51. aml, kyc, ads, wallet, contracts, notifications, storage
52. audit, reports, feedback, system, applications

### Edge / integration / notifications

53. `generate-contract`, `embed-project`, `similar-images` (`/similar/:id`)
54. `job-match-dispatch` → email + LINE + in-app
55. Hire / gift / follow → ตรวจ email preview + LINE push
56. Settings → ปิด `notify_hire` → ส่ง hire อีกครั้ง → ไม่ควรได้ email
57. Seed QA data: `npm run db:qa-full` แล้วเดิน flow

---

## Ecosystem (ข้ามแอป)

58. ลิงก์ So1o → an1hem (`an1hem.app` / demo `1px-demo.vercel.app`) ทำงาน
59. Handoff quotation So1o ↔ Anthem (ecosystem_links)
60. Tier sync Pro/Pro+ ข้ามแอป (unified `profiles.subscription_tier`)
61. Ops Hub (`hq.solofreelancer.com`) — Inbox, Board, Issues, Hub Work, Cycles, Roadmap
62. `bash scripts/health-check.sh` ผ่านทุก URL production

---

## Security / ก่อน go-live

63. Pentest scope ตาม `Solo-Code/docs/pentest-scope.md` / `Anthem-Code/docs/pentest-scope.md`
64. Open redirect, XSS paste test (qa-checklist security smoke)
65. Network: ไม่มี `service_role` ใน response

---

## บัญชีที่ต้องเตรียมก่อน manual

- Solo: `Solo-Code/docs/test-accounts.md` (7 roles)
- Anthem: `Anthem-Code/docs/test-accounts.md` (7 roles)
- E2E env: `.env.local` ในแต่ละแอป (`E2E_USER_*`, `E2E_ADMIN_*`)

Chat demo Anthem ใช้ default demo account ได้ (`npm run e2e:puppeteer:chat`)
