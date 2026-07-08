# A+ Vault Demo Ready — Phase 3–5 Report (2026-07-08)

## Summary

A+ Vault is ready for **private alpha demo** with hosted web app, production capture API, and load-unpacked Chrome extension.

**Production:** https://aplus-vault.vercel.app  
**Demo guide:** https://aplus-vault.vercel.app/demo  
**Tester pack:** `docs/DEMO_PACK.md`

---

## Phase 3 — Production Capture API ✅

| Item | Status |
|------|--------|
| `GET /api/vault/health` | ✅ `storage: supabase` |
| `POST /api/vault/capture` | ✅ Bearer token required, scoped by token hash |
| `POST /api/vault/capture-file` | ✅ Multipart snapshot upload |
| `GET /api/vault/captures` | ✅ Bearer token required |
| Vercel env `SUPABASE_URL` | ✅ Set |
| Vercel env `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set |
| Supabase table `vault_extension_captures` | ✅ Applied |

**Web ↔ extension sync:**
- Profile generates **Extension sync token** (`ensureVaultApiToken`)
- Web polls `/api/vault/captures` with Bearer header every ~4.5s
- Extension POSTs to `/api/vault/capture` with same token

**Live smoke:** POST + GET with `vault-demo-smoke-test` token succeeded on production.

---

## Phase 4 — Supabase Live Sync ✅ (demo scope)

| Item | Status |
|------|--------|
| `supabase-config.js` mode `supabase-live` | ✅ |
| Auth redirect URLs for Vault | ✅ Patched via `scripts/setup-vault-auth.mjs` |
| Google OAuth | ✅ Should work (`https://*.vercel.app/**` + explicit vault URL) |
| RLS on vault tables | ✅ (from prior migration) |
| Export / clear / deletion request | ✅ Profile UI |

**Tester accounts:**
- Local demo: `creative@aplus.local` / `aplusvault`
- Real: email signup or Google OAuth

---

## Phase 5 — Extension Demo ✅

| Item | Status |
|------|--------|
| Default API base → `aplus-vault.vercel.app` | ✅ |
| Version 0.1.1, `PRIVACY.md` | ✅ |
| Extension privacy on web (`/legal#extension-privacy`) | ✅ |
| `demo.html` guide page | ✅ |
| `PUBLIC_RELEASE_CHECKLIST.md` updated | ✅ |
| Chrome Web Store listing | ❌ Not yet (load-unpacked only) |

---

## Verification commands

```powershell
cd f:\So1o\AunAun-fresh\Vault-Code
npm.cmd run check
npm.cmd run alpha:smoke
npm.cmd run build
node scripts/setup-vault-auth.mjs
```

---

## Gaps / improve later

1. **Chrome Web Store** — screenshots, listing, review (extension is unpacked-only for now)
2. **Large snapshot files** — may still fall back to `#vault-capture=` hash handoff
3. **Full account deletion** — support email placeholder; needs automated Supabase + storage purge
4. **Moodboard / project Supabase persistence** — partial; local-first still common
5. **AI Lite** — placeholder metadata only
6. **Public sharing** — moderation/takedown before external collections
7. **Production smoke script** — add `scripts/prod-smoke.mjs` for CI against live API (optional)

---

## Share with testers

1. Send https://aplus-vault.vercel.app/demo
2. Send `vault-extension/` folder (zip)
3. Instructions: login → Profile → copy token → extension popup → capture on Pinterest/Behance

Deployment: `dpl_9ec6zeSnUE7MK2k7qsFrvSvpLGWD` (plus any follow-up deploy after legal/demo polish).
