# A+ Vault Progress Report — 2026-07-08

## Completed in this session

### Phase 2 — Export & Delete data
- **Export my data** — downloads JSON (items, collections, projects, settings, capture metadata)
- **Clear local Vault data** — in-app confirm dialog, no native `alert`/`confirm`
- **Delete account / request deletion** — Supabase placeholder with support email; local mode routes to clear flow
- QA guards added in `scripts/qa.mjs`

### Phase 3 — Production Capture API
- Vercel serverless routes:
  - `GET /api/vault/health`
  - `POST /api/vault/capture`
  - `POST /api/vault/capture-file`
  - `GET /api/vault/captures`
- Shared libs: `lib/vault-capture-core.mjs`, `lib/vault-capture-store.mjs`, `lib/vault-api-shared.mjs`
- Supabase table `vault_extension_captures` applied (migration `vault_extension_captures_queue`)
- SQL mirror: `outputs/a-plus-vault/supabase-extension-captures.sql`

### Phase 5 — Extension public-readiness (partial)
- Default `API Base` → `https://aplus-vault.vercel.app` in `background.js` and `popup.js`
- Hash handoff remains fallback when API storage is unavailable

### Phase 6 — Project CRUD (partial)
- Project **rename** and **delete** on project index cards
- Moodboard create/rename/delete already existed

### Deploy
- Production: https://aplus-vault.vercel.app
- Deployment: `dpl_66tz2VrYRvPEu7dXx3vUi4FUVM7i`

## Required manual step — Vercel env

Hosted capture API needs **server-only** env on project `aplus-vault`:

```text
SUPABASE_URL=https://zkflkpbmbozrchqncpzi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from Solo-Code .env — never commit>
```

Set via Vercel dashboard or:

```powershell
cd f:\So1o\AunAun-fresh\Vault-Code
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add SUPABASE_URL production
```

Until set, `/api/vault/health` returns `storage: unconfigured` and extension falls back to `#vault-capture=` handoff.

## Verification

```powershell
cd f:\So1o\AunAun-fresh\Vault-Code
npm.cmd run check
npm.cmd run alpha:smoke
npm.cmd run build
```

Live:
- https://aplus-vault.vercel.app/
- https://aplus-vault.vercel.app/vault
- https://aplus-vault.vercel.app/legal
- https://aplus-vault.vercel.app/api/vault/health

Extension: reload unpacked from `Vault-Code/vault-extension/`, set alpha token, test right-click capture.

## Still open (later phases)

| Phase | Status |
|-------|--------|
| 4 Supabase live sync hardening | Auth redirect URLs, real user QA, OAuth |
| 5 Extension store listing | Privacy disclosure, screenshots, minimized permissions |
| 6 Moodboard/project | Supabase persistence for boards; moodboard export |
| 7 AI Lite | Server-side metadata, OCR, color extraction |
| 8 Public sharing | Report/takedown/moderation before public collections |

Next recommended: set Vercel `SUPABASE_SERVICE_ROLE_KEY`, then test extension save through API (no hash handoff).
