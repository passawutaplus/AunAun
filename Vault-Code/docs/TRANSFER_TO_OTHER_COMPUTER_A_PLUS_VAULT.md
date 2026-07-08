# Transfer A+ Vault to Another Computer

Use this checklist when moving the project to another Windows computer.

## Best Option

Use GitHub if all latest local changes are pushed:

```powershell
git clone https://github.com/passawutaplus/aplus_vault.git
cd aplus_vault
npm.cmd run check
npm.cmd run alpha:smoke
npm.cmd run build
```

If latest local changes are not pushed, use a zip transfer package from this workspace.

Create a zip package:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\create-transfer-package.ps1
```

The zip is created in:

```text
work\a-plus-vault-transfer-YYYYMMDD-HHMMSS.zip
```

## Files and Folders to Bring

Required:

```text
package.json
build.mjs
vercel.json
README.md
CURSOR_START_HERE_A_PLUS_VAULT.md
CURSOR_ENV_AND_COMMANDS_A_PLUS_VAULT.md
CURSOR_TASK_QUEUE_A_PLUS_VAULT.md
TRANSFER_TO_OTHER_COMPUTER_A_PLUS_VAULT.md
outputs/
scripts/
vault-extension/
start-a-plus-vault-local.cmd
start-a-plus-vault-local.ps1
```

Useful if deploying to the same Vercel project:

```text
.vercel/project.json
.vercel/README.txt
```

Useful if you want the already-built static output:

```text
dist/
```

Not required because it can be regenerated:

```text
dist/
```

Run:

```powershell
npm.cmd run build
```

to regenerate it.

## Files to Be Careful With

These may contain local captures, URLs, previews, or user content:

```text
outputs/a-plus-vault/data/vault-captures.json
dist/data/
```

Do not send them to another person unless you intentionally want to transfer saved test captures.

If moving only to your own second computer, it is okay to include them, but they are not required for development.

## Files Not Needed

Do not include:

```text
node_modules/
*.log
*.zip
.agents/
.codex/
```

The current project does not require `node_modules` for checks/build.

## Extension Settings Do Not Transfer Automatically

Chrome extension settings live in Chrome profile storage, not in the folder.

On the new computer:

1. Open:

```text
chrome://extensions
```

2. Enable Developer mode.
3. Load unpacked:

```text
vault-extension/
```

4. Open popup settings and set:

Local mode:

```text
API Base: http://127.0.0.1:5177
Alpha API Token: any non-empty token
```

Vercel demo mode:

```text
API Base: https://aplus-vault.vercel.app
Alpha API Token: any non-empty token
```

## Browser LocalStorage Does Not Transfer Automatically

The web demo stores some data in browser localStorage. If you open the project on another computer, the Vault Library may be empty unless:

- you use Supabase live sync, or
- you implement/export/import JSON, or
- you manually migrate browser localStorage.

Recommended next product task: add `Export my data` and `Import data` in Profile.

## New Computer Setup

1. Install Node.js.
2. Open project folder in Cursor.
3. Run:

```powershell
npm.cmd run check
npm.cmd run alpha:smoke
npm.cmd run build
```

4. Start local server:

```powershell
$env:VAULT_PORT="5177"
$env:VAULT_DATA_DIR=(Join-Path (Get-Location) "outputs\a-plus-vault\data")
node outputs/a-plus-vault/local-server.cjs
```

5. Open:

```text
http://127.0.0.1:5177/
```

## Vercel on the New Computer

If `.vercel/project.json` is included, deploy should already know the project.

If not:

```powershell
vercel.cmd login
vercel.cmd link --yes --project aplus-vault --scope passawutaplus-9338s-projects
```

Deploy:

```powershell
npm.cmd run build
vercel.cmd deploy --prod --yes --scope passawutaplus-9338s-projects
```

## Quick Verification

After transfer, verify:

```text
http://127.0.0.1:5177/
http://127.0.0.1:5177/vault
http://127.0.0.1:5177/legal.html
```

After deploy, verify:

```text
https://aplus-vault.vercel.app/
https://aplus-vault.vercel.app/vault
https://aplus-vault.vercel.app/legal.html
```
