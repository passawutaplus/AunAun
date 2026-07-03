# Supabase Singapore migration

Updated: 2026-06-25 (cutover completed)

## Projects

| | Old (US) | New (Singapore) |
|---|---|---|
| Ref | `rvnzjiskqliexysicfmh` | `zkflkpbmbozrchqncpzi` |
| URL | https://rvnzjiskqliexysicfmh.supabase.co | https://zkflkpbmbozrchqncpzi.supabase.co |

## Cutover status

| Area | Status |
|------|--------|
| Critical DB (profiles, wallets, projects) | ✓ counts match US |
| auth.users | 43/51 on SG (API copy; remaining may be duplicate IDs from partial runs) |
| Storage | 16 objects (wht-certificates + project-media); buckets copied |
| Edge functions | 24 deployed |
| Auth redirect URLs | ✓ configured via API |
| Vercel production | ✓ Solo, Anthem (1px), Ops-Hub redeployed |
| Smoke | ✓ Solo (`solofreelancer.com`), ✓ Anthem (`aplus1-demo.vercel.app`) |

`pg_dump`/`pg_restore` was **not** used (CLI login role lacks auth schema; no DB password in env). Data copied via Management API + `finalize-sg-data.mjs`.

## Scripts (Solo-Code/scripts/)

| Script | Purpose |
|--------|---------|
| `migrate-singapore.mjs` | inventory, auth config, storage, deploy-functions |
| `finalize-sg-data.mjs` | type-aware data copy (`critical`, `auth`, `all`) |
| `fetch-service-keys.mjs` | pull US/SG service_role into local `.env` |
| `copy-storage-buckets.mjs` | copy `storage.buckets` rows US → SG |
| `stamp-local-migrations.mjs` | stamp migration history for deploy gate |
| `set-sg-edge-secrets.mjs` | edge secrets from `.env` |
| `deploy-production.mjs` (repo root) | Vercel prod deploy with access token |

## Manual follow-up (Dashboard)

1. **Rotate** Singapore secret keys (were shared in chat)
2. **OAuth providers** — copy Google/GitHub/LINE from US → SG Auth → Providers
3. **SMTP** — copy email settings from US → SG
4. **LINE webhook** → `https://zkflkpbmbozrchqncpzi.supabase.co/functions/v1/line-webhook`
5. **Stripe webhooks** — update if endpoints reference old project URL
6. Optional: `node scripts/finalize-sg-data.mjs all` for secondary table parity (rate-limited API)

## Production deploy

```bash
node scripts/deploy-production.mjs solo
node scripts/deploy-production.mjs 1px
node scripts/deploy-production.mjs ops
```

## Rollback

Revert Vercel env to `rvnzjiskqliexysicfmh` URLs/keys and redeploy. Keep US project 1–2 weeks read-only.

## Security

Rotate Singapore secret keys after migration. Never commit real keys.
