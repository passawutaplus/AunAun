# SAMECOR pre-launch — owner-only security checklist

Source: pre-launch audit (2026-11-02, round 2 on 2026-11-03). Everything below needs the project owner's
Supabase / Vercel access; the dev branch `security-hardening` only prepared the pieces (SQL, scripts, docs).
Supabase project ref: `zkflkpbmbozrchqncpzi`. Do the steps in this order — each one is independent, but
rotating keys last avoids re-doing env edits.

Legend: ☐ to do · the "Check" line tells you how to confirm it worked.

---

## 1. Move the 26 KYC files out of the public bucket (SEC-02, PDPA)

The public `project-media` bucket still holds identity documents under `anthem/kyc/<user>/…`. A public
bucket serves any known path without RLS. The private `kyc-documents` bucket already exists (migration
`20261009110000_aplus1_kyc_private_bucket.sql` is applied) and the app already reads both locations.

☐ 1.1 Confirm the count before you start (Supabase → SQL Editor):

```sql
select count(*) from storage.objects where bucket_id = 'project-media' and name like 'anthem/kyc/%';
-- expected: 26
```

☐ 1.2 Dry run the move script (prints the plan only, changes nothing). Run it on your machine, from the
`Anthem-Code` folder, with the service-role key taken from the dashboard (never paste it into a file):

```bash
SUPABASE_URL=https://zkflkpbmbozrchqncpzi.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service_role> node scripts/migrate-kyc-to-private-bucket.mjs
```

☐ 1.3 Apply: copies each object into `kyc-documents/<user_id>/<doc_type>/<uuid>.<ext>`, verifies the copy's
size, then rewrites `shared.kyc_documents.storage_path`, `shared.kyc_requests.bank_book_path` and
`shared.payout_profiles.bank_book_path`. Old files are kept for now.

```bash
SUPABASE_URL=https://zkflkpbmbozrchqncpzi.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service_role> node scripts/migrate-kyc-to-private-bucket.mjs --apply
```

☐ 1.4 Spot-check one moved document in the admin KYC review page (it is served by a signed URL now).

☐ 1.5 Delete the public copies (safe to re-run; only deletes objects whose private copy and DB row exist):

```bash
SUPABASE_URL=https://zkflkpbmbozrchqncpzi.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service_role> node scripts/migrate-kyc-to-private-bucket.mjs --apply --delete-legacy
```

Check:

```sql
select count(*) from storage.objects where bucket_id = 'project-media' and name like 'anthem/kyc/%'; -- 0
select count(*) from storage.objects where bucket_id = 'kyc-documents';                              -- 26
select count(*) from shared.kyc_documents where storage_path like 'anthem/kyc/%';                     -- 0
```

If the script cannot run (no Node on the machine), the manual equivalent is Storage → `project-media` →
folder `anthem/kyc` → download each file, upload it to `kyc-documents/<user_id>/<doc_type>/`, then update
the three path columns above by hand. The script is much safer; prefer it.

---

## 2. Apply the bucket-limit migration (SEC-16)

File: `Solo-Code/supabase/migrations/20261105100000_project_bucket_limits.sql` (not applied by CI).
It sets `allowed_mime_types` on `project-media` (public) and `project-assets` (private) and keeps the
current size caps (60 MB / 25 MB). Existing objects are unaffected; only new uploads are checked.

☐ 2.1 Supabase → SQL Editor → paste the file's contents → Run.
      (or `supabase db push` from `Solo-Code` if you use the CLI; the file has a normal timestamp name.)

☐ 2.2 Also still pending from the cleanup PR: `20261103120000_admin_event_similar_search_path.sql`.

Check:

```sql
select id, public, file_size_limit, array_length(allowed_mime_types, 1) as mimes
from storage.buckets where id in ('project-media', 'project-assets');
-- project-media  → 62914560, 10 mimes
-- project-assets → 26214400, 23 mimes
```

Then upload one image and one PDF from the portfolio editor to make sure normal uploads still pass.

---

## 3. Enable leaked-password protection (SEC-09)

Supabase Security Advisor flags this as WARN. It makes sign-up / password change refuse passwords that
appear in the HaveIBeenPwned corpus. No code change needed.

☐ 3.1 Supabase Dashboard → **Authentication → Sign In / Providers → Email** (older UI: Authentication →
      Settings → Password security) → turn on **"Prevent use of leaked passwords"** → Save.
☐ 3.2 Optional, same page: minimum password length 8 and require letters + digits.

Check: Dashboard → **Advisors → Security** — the "Leaked password protection disabled" warning is gone.
Try to register with `password123` on the site; it must be refused.

---

## 4. Unpublish the test works in production (UX)

Four test works are live on the public feed: `fdfd`, `To day`, `ทผส้ดเ้หรเ้รกดนเ`, `ธกส.`.

☐ 4.1 Sign in as admin → `/admin/projects` → search each title → row menu (⋯) → **ตั้งเป็น Draft**
      (use **ลบผลงาน** only if they are throw-away — it is permanent).
☐ 4.2 Anything else with a nonsense title: same.

Check:

```sql
select id, title, status from anthem.projects
where status = 'Published' and (title in ('fdfd', 'To day', 'ทผส้ดเ้หรเ้รกดนเ', 'ธกส.') or length(title) < 3);
-- expected: 0 rows
```

---

## 5. Rotate the service_role JWT and the `sbp_` personal access token (SEC-01)

Why: both were present in the repository history / local env files at some point. Switching the web app
to `sb_publishable_…` did **not** invalidate the old service_role JWT; only a rotation does.

### 5a. Where the server-side key is used (update all of these in step 5.3)

| Consumer | Variable | Where to set |
|---|---|---|
| Vercel serverless `Anthem-Code/api/*` (charges, webhooks, push, cron) | `SUPABASE_SERVICE_ROLE_KEY` | Vercel → project `aplus1-prod` (and `aplus1-demo`) → Settings → Environment Variables |
| Supabase Edge Functions | auto-injected (`SUPABASE_SECRET_KEYS` / legacy `SUPABASE_SERVICE_ROLE_KEY`) | nothing to do — Supabase injects the current key on next invoke |
| Local scripts (seeders, KYC move, migrations) | `SUPABASE_SERVICE_ROLE_KEY` in your shell / `.env.local` | your machine only |
| LINE admin bot / cron callers | `LINE_SAMECOR_ADMIN_*`, cron bearer | unchanged (not Supabase keys) |

Do step 1 (KYC move) **before** rotating, so you only hand the script one key.

### 5b. Steps

☐ 5.1 Supabase Dashboard → **Settings → API Keys**. If the project is still on legacy JWT keys, click
      **"Create new API keys"** (the new `sb_publishable_…` / `sb_secret_…` system); the web app already
      uses the publishable key. Create a **secret key** named `vercel-api`.
☐ 5.2 (Legacy section) → **JWT keys → Rotate**. Supabase keeps the old signing key valid for the
      grace period it shows; user sessions are not logged out, but the old `service_role` and `anon`
      JWTs stop working once the old key is revoked. Note the new `service_role` JWT only if some
      consumer cannot take an `sb_secret_` key yet (the `api/` code reads one env var and accepts either).
☐ 5.3 Vercel → both SAMECOR projects → replace `SUPABASE_SERVICE_ROLE_KEY` with the new secret key
      (Production + Preview) → **Redeploy** the latest production deployment (owner-only; mind the free
      plan's 100 builds/day).
☐ 5.4 Edge functions: Supabase → Edge Functions → **Secrets**. If any secret named `SUPABASE_SERVICE_ROLE_KEY`
      was added by hand, delete it so the auto-injected key wins.
☐ 5.5 Revoke the old key: Settings → API Keys → legacy keys → **Disable / Revoke** (after 5.3 is live).
☐ 5.6 Personal access token: <https://supabase.com/dashboard/account/tokens> → find the token used for
      CLI / migration scripts (`sbp_…`) → **Revoke** → **Generate new token** → store it only in your
      shell (`SUPABASE_ACCESS_TOKEN`) or the password manager. GitHub Actions does not use it today
      (no `SUPABASE_ACCESS_TOKEN` secret in any workflow), so nothing to update there.

Check:

```bash
# old key must now be refused (401/403):
curl -s -o /dev/null -w "%{http_code}\n" "https://zkflkpbmbozrchqncpzi.supabase.co/rest/v1/profiles?select=id&limit=1" -H "apikey: <OLD_service_role>" -H "Authorization: Bearer <OLD_service_role>"
```

And on the live site: create a PromptPay test charge (`/api/object-charge`) or open the admin dashboard —
both go through the service key and must still work.

---

## 6. Leftovers the owner should also look at (lower priority)

| Item | What | Where |
|---|---|---|
| SEC-11 | `docs/payso-submission/INTERNAL_readiness_and_gaps.md` is still tracked; `.env.vps.example` holds JWT-shaped values — confirm they are placeholders or purge them from history | repo |
| SEC-16b | 12 So1o public buckets (`announcement-banners`, `article-images`, `auth-banners`, `brand-logos`, `brief-references`, `dashboard-banners`, `job-tracker`, `myport-images`, `persona-avatars`, `quotation-banners`, `screenshots`, `supplier-covers`) have no size/MIME cap; all have 0 objects. Cap them like `20261028100000_cap_open_image_buckets.sql` when So1o goes live | Supabase |
| Sentry | GitHub Actions has no `SENTRY_AUTH_TOKEN`; releases/sourcemaps are not uploaded. Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=samecor`, `SENTRY_PROJECT` as repo secrets and a `@sentry/vite-plugin` step once you want readable stack traces | GitHub → Settings → Secrets |
| `npm audit` | 37 (Anthem) / 56 (Solo) advisories incl. high+critical in transitive dev deps; the CI step stays non-blocking until they are triaged | repo |
| Events | `anthem.events` has 0 rows in prod — Exhibition launches empty unless seeded | Supabase |

---

## Code-side fixes shipped in the `security-hardening` PR (for reference)

- `api/object-charge.js`: charge mode derived from the Omise key (no client/env override), buyer ownership
  checked **before** `mark_as_paid` / sync (SEC-12/13).
- `api/push-collage.js`: cover images fetched only from Supabase Storage / Unsplash / `PUSH_COLLAGE_COVER_HOSTS`,
  no redirects, no IP literals (SEC-14).
- Six edge functions no longer answer `Access-Control-Allow-Origin: *`; they use the shared origin allow-list.
- `event-extract` SSRF guard resolves DNS and blocks private / loopback / link-local / metadata / IPv6 ranges
  on the start URL and every redirect hop (max 4).
- Flex-grid text module sanitises stored HTML before it reaches `innerHTML`; collab-plan PDF window opens
  with `opener = null`.
- CI: Anthem-Code lint is blocking; Solo-Code lint blocks on files changed in the push/PR (the package still has pre-existing prettier debt); `npm audit` left non-blocking (fails today).
