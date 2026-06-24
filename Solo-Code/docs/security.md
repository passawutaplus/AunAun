# Security

## App description

So1o is a freelancer management SaaS for Thai designers. Users sign up to manage projects, quotations, clients, invoices, finance, and AI-assisted creative work. Some pages are public (landing, blog, pricing). Some endpoints expose user data via opaque UUID tokens for collaboration with non-registered clients.

## Trust model

| Actor | Trust | Allowed |
|---|---|---|
| **Anonymous visitor** | Untrusted | Read landing / blog / pricing. Submit signup. Access UUID-token pages (`/track/$token`, `/brief/$token`, `/sign/$token`, etc.) |
| **Authenticated user (tester not approved)** | Low | Read own profile + `/apply` page only |
| **Authenticated user (tester approved)** | Medium | Full app — own data only (enforced by RLS) |
| **Admin** | High | Full app + admin panel + admin server fns |
| **Service role (server-side only)** | Highest | Bypasses RLS — used by `supabaseAdmin` in vetted server code |

## Trust boundaries

1. **Browser → PostgREST (Supabase Data API)** — guarded by RLS. Publishable key only.
2. **Browser → TanStack Server Function** — bearer token attached automatically; server fn validates with `requireSupabaseAuth`.
3. **External service → `/api/public/*` server route** — guarded by signature verification (webhooks) or Bearer `CRON_SECRET` (cron).
4. **TanStack Server → `supabaseAdmin`** — service role; bypasses RLS. Only after a trust check.

## Sensitive data inventory

| Data | Where | Protection |
|---|---|---|
| Email, hashed password | `auth.users` (Supabase managed) | Supabase Auth defaults |
| Profile (name, avatar) | `public.profiles` | RLS self-write |
| Financial records | `public.finance_*`, `client_invoices` | RLS self-scoped |
| Quotations, jobs | `public.quotations`, `dashboard_jobs` | RLS self-scoped |
| Public-token data | accessible via UUID token | opaque token, read-only payload via RPC whitelist |
| Client signatures | `quotations.client_*`, Storage `brand-logos/{quotationId}/client-sign-*` | anon sign via `sign_quotation_by_token` SECURITY DEFINER; no direct anon UPDATE on quotations |
| Admin audit | `public.admin_audit_log` | admin-only |
| AI quota / rate | `public.feature_usage` | per-user write |

## What must never happen

- ❌ A user reading or writing another user's `profiles`, `finance_*`, `quotations`, `clients`, `client_invoices`, `dashboard_jobs`, `planner_*`, `suppliers`, or notes
- ❌ A non-admin reading `hq_agents`, `admin_audit_log`, or any `*_admin` table
- ❌ A non-admin assigning roles via `user_roles`
- ❌ `service_role` key appearing in any client bundle (verify with `grep -r "service_role" dist/`)
- ❌ A server fn returning raw exceptions / DB error messages to the client (use `generic_error`)
- ❌ A webhook endpoint processing payload before signature verification
- ❌ An edge function skipping JWT validation when env vars are missing (must 500, not skip)
- ❌ A redirect param accepting `//evil.com` or `javascript:` or `data:` (use `safeHref` / `safeRelativePath`)
- ❌ Raw `user_input` interpolated into `dangerouslySetInnerHTML`

## Intentional public surfaces (NOT vulnerabilities)

- `dashboard_daily_trends` — editorial content
- `articles` (published=true)
- `announcement_*` (active=true)
- `auth_banners`, `dashboard_banners`
- `/track/$token`, `/brief/$token`, `/sign/$token`, `/planner/$token`, `/supplier/$token`, `/vision/$token` — opaque UUID tokens; treat as bearer-equivalent
- `/sign/$token` — client draws signature or uploads wet-signed doc; writes via `sign_quotation_by_token` RPC only (idempotent)
- `/api/public/payments/webhook` — Stripe webhook (signature verified)

## Defense in depth

| Layer | Mechanism |
|---|---|
| Network | Vercel edge (TLS + DDoS) + Supabase TLS — ดู [`../../docs/firewall.md`](../../docs/firewall.md) |
| HTTP | `src/start.ts` security headers middleware (CSP, HSTS, X-Content-Type-Options, Permissions-Policy, Referrer-Policy, COOP, CORP) |
| App | Zod input validation on every form + server fn |
| DB | RLS on every user-data table; `has_role` SECURITY DEFINER for admin checks |
| Code | ESLint `no-restricted-imports` guard prevents components bypassing feature hooks |
| Build | `service_role` grep guard before publish |
| Runtime | CSP Report-Only listener → identify violations before tightening; `/api/public/csp-report` stores violations |

## Known accepted risks

- **Local-first sketches:** Some UI scratchpads (`dashboard_notes` local cache, palette drafts) persist in `localStorage`. Data is per-device; loss on browser clear is acceptable.
- **Realtime fanout cost:** Channels are per-user-uuid; subscription cost grows linearly with active users. Acceptable at current scale.
- **Cron migration:** `authorizeCronBearer` accepts `CRON_SECRET` or legacy service role key until schedulers are updated.

## Production checklist

See [`production-security-checklist.md`](./production-security-checklist.md)

## Out of scope for pentest

ดู [`pentest-scope.md`](./pentest-scope.md)
