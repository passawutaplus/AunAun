# A+ Vault Phase 1 Deploy Report

Date: 2026-07-08 (Asia/Bangkok)  
Machine: `f:\So1o\AunAun-fresh\Vault-Code`

## What was done

1. Imported transfer package into monorepo as `Vault-Code/`.
2. Added `Vault-Code/.gitignore` for `dist/`, `outputs/a-plus-vault/data/`, `.vercel/`.
3. Moved handoff docs to `Vault-Code/docs/`.
4. Ran local verification:
   - `npm.cmd run check` — passed
   - `npm.cmd run alpha:smoke` — passed (image, link, text, video, snapshot)
   - `npm.cmd run build` — passed
   - Local server smoke: `http://127.0.0.1:5177/` `/vault` `legal.html` — all 200
5. Linked and deployed to Vercel production.

## Production deploy

| Field | Value |
|-------|-------|
| Project | `aplus-vault` |
| Scope | `passawutaplus-9338s-projects` |
| Production URL | https://aplus-vault.vercel.app |
| Deployment ID | `dpl_GHsnkKqX2QcwU4m1LnFjkfKfmnE5` |
| Inspect | https://vercel.com/passawutaplus-9338s-projects/aplus-vault/GHsnkKqX2QcwU4m1LnFjkfKfmnE5 |

## Live route verification

| URL | Result |
|-----|--------|
| https://aplus-vault.vercel.app/ | 200 |
| https://aplus-vault.vercel.app/vault | 200 (no longer 404) |
| https://aplus-vault.vercel.app/legal | 200 |
| https://aplus-vault.vercel.app/legal.html | 308 → use `/legal` (`cleanUrls` in `vercel.json`) |

## Extension Vercel demo mode

Code verified in repo (manual Chrome test still recommended on this machine):

- `vault-extension/background.js` — `saveViaWebHandoff()` opens `/vault#vault-capture=<encoded payload>`
- `outputs/a-plus-vault/app.js` — `importHashCapture()` imports payload on boot

**Manual test steps:**

1. `chrome://extensions` → Load unpacked → `Vault-Code/vault-extension/`
2. Popup: `API Base = https://aplus-vault.vercel.app`, token = any non-empty
3. Right-click image → `+ Keep in Vault` → preview → Keep
4. Expect new tab or handoff to `/vault#vault-capture=...` and object in Vault Library

**Limitation:** snapshots and large file uploads still need local server until Phase 3 capture API.

## Next: Phase 2 checklist (Export & Delete)

From `docs/CURSOR_TASK_QUEUE_A_PLUS_VAULT.md`:

- [ ] Add **Export my data** in Profile (JSON: items, collections, projects, boards, settings, capture metadata)
- [ ] Add **Clear local Vault data** with in-app confirmation dialog (no `alert`/`confirm`)
- [ ] Add **Delete account / request deletion** placeholder for Supabase mode
- [ ] Add QA guards for export/delete controls
- [ ] Keep legal/data-rights links visible

Acceptance:

- User can download local JSON export
- User can clear local data without native browser dialogs
- Legal page links to data rights remain visible

## Redeploy command (from `Vault-Code/`)

```powershell
npm.cmd run build
$env:NO_UPDATE_NOTIFIER="1"
npx.cmd vercel@latest deploy --prod --yes --scope passawutaplus-9338s-projects
```
