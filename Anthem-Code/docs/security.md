# Security — Threat model & posture

## Architecture

```text
Browser (React 18 + Vite)
  │
  ├─ Supabase JS client  ──►  Postgres + RLS (public, shared schemas)
  │                            └─ SECURITY DEFINER RPCs (admin_*, wallet_*, has_role)
  └─ supabase.functions.invoke ──►  Edge Functions (Deno, Solo-Code)
                                     ├─ generate-contract   (auth required)
                                     ├─ similar-images      (auth required)
                                     ├─ embed-project       (owner/admin only)
                                     ├─ job-match-dispatch  (internal, from DB trigger)
                                     ├─ notify-anthem*      (gift, follow, topup, cashout, …)
                                     ├─ notify-hire-request / notify-anthem-chat / notify-anthem-collab
                                     └─ line-connect / line-webhook / line-queue-process
```

## Trust boundaries

| From | To | Trust |
|---|---|---|
| Anonymous browser | Public tables (profiles, projects, studios, gifts catalog) | Read-only via RLS |
| Authenticated browser | Own wallet, own messages, own collections | RLS scoped to `auth.uid()` |
| Authenticated browser | Admin RPCs | Internal `has_role(_, 'admin')` check |
| Edge function (service role) | Any table | Trusted — all input validated with zod |
| DB trigger → pg_net | `job-match-dispatch` | Internal-only payload (`{ job_id }`) |

## AuthN / AuthZ

- Email/password + Google OAuth (Supabase Auth).
- HIBP leaked-password check **enabled**.
- Email verification **required** for email/password before access (`RequireAuth`); OAuth (e.g. Google) is treated as verified.
- Roles stored in `public.user_roles` (NOT on profiles) — admin check via `has_role()` SECURITY DEFINER.
- Admin gate (`AdminGuard`) waits for the role query to resolve before rendering — no localStorage trust.

## Sensitive data inventory

| Data | Table | Access |
|---|---|---|
| Email | `auth.users`, `profiles.email` | Owner + admin |
| Wallet balance, lifetime earned/spent | `wallets` | Owner + admin (was public — fixed) |
| Gift history | `gift_transactions` | Sender + recipient |
| Cashout bank info | `cashout_requests.bank_info` (jsonb) | Owner + admin |
| Private messages | `messages` | Conversation participants |
| User roles | `user_roles` | Owner + admin (insert/update: admin only) |

## RLS posture

- All sensitive tables RLS-enabled.
- Public-read tables: `profiles`, `studios`, `studio_members`, `project_comments`, `inspire_boards`, `inspire_items`, `image_shares`, `gifts` (catalog), `follows` — intentional.
- Write policies always scope to `auth.uid()` or `has_role()`.
- No `WITH CHECK (true)` on INSERT/UPDATE/DELETE for any user-mutable table.

## Edge function hardening

Every public-facing edge function:
1. CORS allowlist via `_shared/cors.ts` (not `*`)
2. CORS preflight handled
3. JWT validated via `supabase.auth.getClaims()` (where user-bound)
4. Input parsed + validated with **zod**
5. Errors returned generically (no stack traces / internal messages)
6. Service-role client used only after authorization passes

## HTTP security (1PX SPA)

- **Production:** HSTS + enforced CSP via `vercel.json` (Vercel) and `nginx.conf` (VPS fallback)
- **Local dev:** CSP Report-Only meta in `index.html` + `installCspReporter()` in `main.tsx`
- **Demo mode:** `VITE_DEMO_MODE=true` only on preview builds; Dockerfile defaults to `false`

## Mock payments (demo vs production)

- SQL: [`scripts/ecosystem/security-mock-payments.sql`](../../scripts/ecosystem/security-mock-payments.sql)
- Production: run `security-mock-payments-prod-revoke.sql` — disables mock RPCs
- Demo: run `security-mock-payments-demo-enable.sql`
- UI: mock ad pay button gated by `isDemoMode()` on `AdvertisePage`

## Accepted risks

- `SECURITY DEFINER` RPCs callable by authenticated users (admin_*, wallet ops) — each function performs its own `has_role()` / ownership check internally. Linter warnings 0028/0029 are by design.
- `pgvector` extension installed in `public` schema (Supabase default; moving requires extension re-create).
- `job-match-dispatch` is invoked by a DB trigger via `pg_net` without a JWT (DB is the trusted caller). Input is a single validated UUID.
- Mock payment RPCs (`topup_wallet_mock`, `mock_pay_ad_application`) gated by `payment_settings` flags — **revoked on production** via SQL script; demo enables explicitly.

## CI / supply chain

- GitHub Actions: lint, unit tests, npm audit (high), Playwright security smoke
- Dependabot weekly for npm (monorepo root `.github/dependabot.yml`)
- `scripts/check-build-env.mjs` blocks `VITE_DEMO_MODE=true` on production deploy target

## Hardening shipped in app layer (2026-07)

- Omise webhook: HMAC required (fail closed if `OMISE_WEBHOOK_SECRET` missing).
- `/api/hire-charge`: requires Supabase JWT; prefers quote/order amounts from DB when `SUPABASE_SERVICE_ROLE_KEY` is set.
- Hire delivery / chat attachment `href`: `safeHttpUrl` only.
- OAuth email gate: trusted provider allowlist (`google` only).
- `signOutApp` clears sensitive reauth session flag.
- Reset password: recovery event only + global sign-out after success.

## DB P0 applied (2026-07-22) — `scripts/ecosystem/security-p0-hardening.sql`

- Dropped `auto_grant_admin` email bootstrap.
- `force_purge_user`: service_role only + real admin actor (no spoofable authz).
- `available_*_px`: bind to `auth.uid()` / admin / service_role; revoke anon.
- `profiles`: authenticated SELECT locked to curated columns; own PII via `get_my_profile_sensitive()`.
- `hire_orders`: money/paid-status guard trigger; `confirm_hire_order_payment` for mock/webhook path.
- `send_gift`: welcome portion credits recipient `welcome_px` (not cashoutable `earned_px`).

## Known gaps (open for reviewer)

- Community posts, comments, and chat messages have database-enforced per-user rate limits.
- Edge Functions still require gateway-level rate limits and abuse monitoring before a large public launch.
- Stripe promo ↔ credit binding; referral multi-account farm caps; Phase A shared DB + `mock_topup_enabled`.
- Red-team prompt pack: [`red-team-prompt-pack.md`](./red-team-prompt-pack.md)

## Production checklist

See So1o [`production-security-checklist.md`](../../Solo-Code/docs/production-security-checklist.md) (shared ecosystem).

## Report & Feedback

- **`user_reports` / `app_feedback`**: RLS — เจ้าของอ่านได้เฉพาะของตัวเอง, admin อ่าน/เขียนได้ทั้งหมดผ่าน `has_role(uid, 'admin')`
- **Rate limit / Anti-spam**: ใช้ SECURITY DEFINER RPC `create_report` และ `submit_feedback` ที่ตรวจ window-based count ก่อน insert (ลด surface สำหรับ flood/spam จาก client โดยตรง)
- **Unique partial index** บน `user_reports(reporter_id, target_type, target_id) WHERE status='open'` — ป้องกัน duplicate report ที่ยังเปิดอยู่
- **Storage `report-evidence`** (private bucket): policy อนุญาตให้ authenticated upload เฉพาะ path ของตัวเอง (`auth.uid()::text = (storage.foldername(name))[1]`); read/delete จำกัดเฉพาะ owner + admin
- **Evidence URL validation**: ฝั่ง client validate `safeHttpUrl()` ก่อนส่ง; ฝั่ง server schema ยอมเฉพาะ http(s)
- **Admin notification trigger**: AFTER INSERT บน `user_reports` / `app_feedback` เรียก `shared.push_notification` ให้ admins — ไม่เปิดเผยรายละเอียดรายงานในข้อความ (ใช้ deep link ไปหน้า admin เท่านั้น)
