# A+ Vault / A Vaultory - Cursor Handoff

Last updated: 2026-07-08, Asia/Bangkok

This is the primary handoff file for continuing A+ Vault in Cursor.

## One-Line Product Definition

A+ Vault is a private creative reference vault for saving images, links, videos, notes, and browser captures, then reusing them inside collections, projects, and moodboards.

Trust promise:

```text
Your references are private by default.
You own your content.
We preserve source and context.
You can export or delete your data.
```

## Workspace

```text
f:\So1o\AunAun-fresh\Vault-Code
```

Main app:

```text
outputs/a-plus-vault/
```

Chrome extension:

```text
vault-extension/
```

Build output:

```text
dist/
```

Vercel project:

```text
project: aplus-vault
scope: passawutaplus-9338s-projects
production URL: https://aplus-vault.vercel.app
```

Supabase project id mentioned by founder:

```text
zkflkpbmbozrchqncpzi
```

Do not place Supabase service-role keys, storage secrets, or AI provider secrets in the web client or extension.

## Current Repo Shape

```text
package.json
build.mjs
vercel.json
outputs/a-plus-vault/
  index.html
  legal.html
  app.js
  styles.css
  local-server.cjs
  supabase-config.js
  supabase-schema.sql
  supabase-alpha-hardening.sql
  modules/
  assets/
  docs/
vault-extension/
  manifest.json
  background.js
  content.js
  popup.html
  popup.css
  popup.js
  icons/
  fonts/
scripts/
  qa.mjs
  alpha-smoke.mjs
dist/
```

The workspace contains a `.git` folder but earlier `git status` from this environment reported `fatal: not a git repository`. Verify Git state inside Cursor before relying on Git commands. If needed, compare against GitHub repo `passawutaplus/aplus_vault`.

## Current Working State

Recently completed:

- Pinterest-style Vault grid with object cards.
- Detail drawer with source, colors, keywords, collection/project assignment, pin/share actions.
- Collections overview and project/moodboard concepts.
- Moodboard workspace with reusable Vault objects and text objects.
- Extension popup with preview-before-save flow.
- Extension context menu capture for image, video, link, selection, page, and snapshot.
- Extension fallback for Vercel static demo using `#vault-capture=<encoded payload>`.
- Vercel `/vault` fallback fix in `build.mjs` and `vercel.json`.
- Legal Center at `outputs/a-plus-vault/legal.html`.
- Alpha compliance plan at `outputs/a-plus-vault/docs/legal-alpha-compliance-plan.md`.
- QA guards in `scripts/qa.mjs`.

## Important Recent Fixes

### Vercel `/vault` 404

Production showed `404: NOT_FOUND` for:

```text
https://aplus-vault.vercel.app/vault
```

Fixed locally by:

- `vercel.json`: `/vault` rewrites to `/vault.html`.
- `build.mjs`: emits `dist/vault.html`, `dist/vault/index.html`, and `dist/404.html`.

Important: this still needs a fresh Vercel production deploy to affect the live site.

### Extension Save Failing on Vercel API Base

The Vercel demo is currently static/localStorage-first and does not expose production capture API routes. Extension save now falls back to a web handoff URL:

```text
https://aplus-vault.vercel.app/vault#vault-capture=<encoded payload>
```

The web app imports the payload into Vault Library.

Limitation: large screenshots/file uploads still need the local capture server until production API routes exist.

### Legal / Privacy

Added:

- `legal.html`
- `docs/legal-alpha-compliance-plan.md`
- public legal footer
- Profile `Privacy & Legal` card
- `noindex,nofollow` on alpha app pages

This is an alpha product draft, not final legal advice.

## Commands

Run all checks:

```powershell
npm.cmd run check
npm.cmd run alpha:smoke
npm.cmd run build
```

Start local Vault server:

```powershell
cd f:\So1o\AunAun-fresh\Vault-Code
$env:VAULT_PORT="5177"
$env:VAULT_DATA_DIR=(Join-Path (Get-Location) "outputs\a-plus-vault\data")
node outputs/a-plus-vault/local-server.cjs
```

Open:

```text
http://127.0.0.1:5177/
```

PowerShell execution policy may block `npm`. Prefer:

```powershell
npm.cmd run check
```

instead of:

```powershell
npm run check
```

## Vercel Deploy

Build first:

```powershell
npm.cmd run build
```

Then deploy:

```powershell
$env:NO_UPDATE_NOTIFIER="1"
vercel.cmd deploy --prod --yes --scope passawutaplus-9338s-projects
```

If `vercel.cmd` is missing:

```powershell
npx.cmd vercel@latest deploy --prod --yes --scope passawutaplus-9338s-projects
```

Earlier in Codex, `npx.cmd vercel@latest` was blocked by network/cache permission. If that happens, deploy manually from the user's PowerShell where Vercel CLI is available.

After deploy, verify:

```text
https://aplus-vault.vercel.app/
https://aplus-vault.vercel.app/vault
https://aplus-vault.vercel.app/legal.html
```

## Chrome Extension Local Testing

1. Open Chrome:

```text
chrome://extensions
```

2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select:

```text
f:\So1o\AunAun-fresh\Vault-Code\vault-extension
```

5. Pin the extension.
6. In popup settings:

Local server mode:

```text
API Base: http://127.0.0.1:5177
Alpha API Token: any non-empty token for local alpha
```

Vercel demo mode:

```text
API Base: https://aplus-vault.vercel.app
Alpha API Token: any non-empty token for alpha UI
```

Vercel demo mode uses hash handoff, not production API.

After extension source edits, reload the unpacked extension in `chrome://extensions`.

## QA Checklist

Minimum before handing any build back:

```powershell
npm.cmd run check
npm.cmd run alpha:smoke
npm.cmd run build
```

Manual smoke:

- Home page loads.
- `/vault` does not 404 after deploy.
- `legal.html` loads.
- Login demo works: `creative@aplus.local` / `aplusvault`.
- Save image/link/note from web modal.
- Open detail drawer.
- Pin object.
- Share popup opens.
- Collection create/rename/delete still works.
- Moodboard list opens.
- Extension right-click image -> popup preview -> Keep in Vault.

## Known Limitations

- Production capture API is not implemented on Vercel yet.
- Vercel demo is localStorage/static-first.
- Extension snapshots and file uploads still need local server for reliable large payload handling.
- Supabase Auth/Storage is partially wired but needs real project configuration and testing.
- Google OAuth is placeholder unless `supabase-live` mode and redirects are configured.
- Public sharing is prototype-only. Do not treat it as production public UGC.
- Legal pages are alpha drafts, not lawyer-approved documents.
- No robust account deletion/export workflow yet.
- No production AI provider integration yet.

## Must-Not-Break Rules

- Private by default.
- No public discovery feed.
- No service-role or secret keys in client or extension.
- Extension captures only after explicit user action.
- Preserve source URL and capture context when possible.
- Saving a reference does not grant usage rights.
- Keep `noindex,nofollow` until public launch strategy is approved.
- Do not implement public collections/team features without report/takedown/moderation controls.

## Most Important Next Work

Read these next:

```text
docs/CURSOR_TASK_QUEUE_A_PLUS_VAULT.md
docs/CURSOR_ENV_AND_COMMANDS_A_PLUS_VAULT.md
docs/PHASE1_DEPLOY_REPORT_20260708.md
outputs/a-plus-vault/docs/legal-alpha-compliance-plan.md
outputs/a-plus-vault/docs/next-implementation-order.md
vault-extension/PUBLIC_RELEASE_CHECKLIST.md
```

