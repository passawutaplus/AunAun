# A+ Vault Environment and Commands

Use this file when setting up the project on a new computer or inside Cursor.

## Required Software

- Windows PowerShell
- Node.js 20+ recommended. Current tested machine used Node 24.
- Google Chrome for extension testing.
- Vercel CLI if deploying from this machine.
- Supabase access if continuing live sync work.

No `node_modules` directory is required for the current app because the project uses plain Node scripts and static browser code.

## Project Folder

Recommended folder in this monorepo:

```text
f:\So1o\AunAun-fresh\Vault-Code
```

Open Cursor at the folder root containing:

```text
package.json
build.mjs
vercel.json
outputs/
vault-extension/
scripts/
```

## Common Commands

Run from project root:

```powershell
npm.cmd run check
npm.cmd run alpha:smoke
npm.cmd run build
```

Use `npm.cmd`, not `npm`, if PowerShell blocks script execution.

## Local Web Server

```powershell
$env:VAULT_PORT="5177"
$env:VAULT_DATA_DIR=(Join-Path (Get-Location) "outputs\a-plus-vault\data")
node outputs/a-plus-vault/local-server.cjs
```

Open:

```text
http://127.0.0.1:5177/
```

## Chrome Extension

Load unpacked:

```text
chrome://extensions -> Developer mode -> Load unpacked -> vault-extension/
```

Local alpha settings:

```text
API Base: http://127.0.0.1:5177
Alpha API Token: any non-empty alpha token
```

Vercel static demo settings:

```text
API Base: https://aplus-vault.vercel.app
Alpha API Token: any non-empty alpha token
```

When using Vercel static demo, extension saves normal image/link/video/text captures by opening:

```text
/vault#vault-capture=<encoded payload>
```

Large snapshots and file uploads still need the local server until production API routes are built.

## Vercel

Current project link:

```text
project: aplus-vault
scope/team: passawutaplus-9338s-projects
production: https://aplus-vault.vercel.app
```

Deploy:

```powershell
npm.cmd run build
$env:NO_UPDATE_NOTIFIER="1"
vercel.cmd deploy --prod --yes --scope passawutaplus-9338s-projects
```

Fallback if `vercel.cmd` is not installed:

```powershell
npx.cmd vercel@latest deploy --prod --yes --scope passawutaplus-9338s-projects
```

If the project is not linked:

```powershell
vercel.cmd link --yes --project aplus-vault --scope passawutaplus-9338s-projects
```

## Supabase

Current browser config file:

```text
outputs/a-plus-vault/supabase-config.js
```

Current project ref:

```text
zkflkpbmbozrchqncpzi
```

Current bucket name:

```text
vault-assets
```

The checked-in key is a publishable/anon-style client key. Never add a service-role key to this project, Vercel static output, or extension.

Important SQL files:

```text
outputs/a-plus-vault/supabase-schema.sql
outputs/a-plus-vault/supabase-alpha-hardening.sql
```

## Debug Notes

- If `https://aplus-vault.vercel.app/vault` returns 404, deploy the latest build. The local build emits `dist/vault.html`, `dist/vault/index.html`, and `dist/404.html`.
- If extension popup says "Couldn't save this object" while API Base is Vercel, reload the extension and confirm the latest `background.js` includes `saveViaWebHandoff`.
- If extension captures only links without images, inspect `content.js` DOM candidate extraction and `background.js` candidate ranking.
- If web app turns white, check browser console and run `npm.cmd run check`.

