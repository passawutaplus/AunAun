# Security

## Reporting a vulnerability
Email **passawut.a.plus@gmail.com** with steps to reproduce. Please don't open a public issue
for security problems, and don't access data that isn't yours. We aim to reply within 3 working days.
Machine-readable contact: `/.well-known/security.txt`.

## What is in place
- **Headers (vercel.json)**: strict CSP (`script-src 'self'`, no inline scripts, `object-src 'none'`,
  `frame-ancestors 'none'`), HSTS, `nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP.
- **Data access**: user data sits behind Supabase Row Level Security (see the `supabase-*.sql` migrations); the browser only
  holds the publishable key. Service-role and AI keys live only in Vercel env vars (never in the client or the extension).
- **Capture API** (`api/vault/*`): signed `vxt1.` extension tokens (HMAC) or Supabase JWTs, per-token and per-IP rate limits,
  body-size caps, upstream error text is logged server-side and never returned to the client.
- **Discover API**: query allowlist (columns, filters, limits) in front of the public catalog.
- **Extension (MV3)**: host access limited to the Vault origins; page ↔ extension messages are posted to `location.origin` only.
- **Service worker**: caches same-origin static files only; never API, auth or cross-origin requests.
- **Public pages**: share/discover pages keep `noindex` and always show source and credit.

## Rules for contributors
- Never commit `.env*`, service-role keys, AI keys or tokens. Run `node scripts/qa.mjs` (it scans for secrets).
- No inline `<script>` / `on*=` attributes; add a file and reference it (CSP would block it anyway).
- Escape every dynamic string with `esc` / `escA` (`modules/utils.js`) before putting it in `innerHTML`.
- New third-party origin? Add it to the CSP in `vercel.json` deliberately, and say why in the PR.
- Run `npm audit --omit=dev` before a release.

## Known follow-ups (shared Supabase project, outside the Vault tables)
Supabase's security advisor flags items in the shared Aplus database that the Vault code does not own. Review them with the
owners of those schemas before changing anything:
- `public.profiles_public` is a `SECURITY DEFINER` view (ERROR level).
- Many `SECURITY DEFINER` functions in `anthem`/`public` are executable by `anon`/`authenticated` through `/rest/v1/rpc/*`;
  confirm each one checks the caller, or revoke `EXECUTE` from `anon`.
- Four functions have a mutable `search_path`; `vector` and `pg_trgm` live in `public`.
- Auth: enable *Leaked password protection* in the Supabase dashboard (Authentication → Policies).
