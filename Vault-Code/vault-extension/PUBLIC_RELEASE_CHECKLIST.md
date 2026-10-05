# A+ Vault Capture Extension Public Release Checklist

## Current Status (2026-07-08)

The extension is **demo-ready** for private alpha testers via load-unpacked install.

Production capture API is live at:

```text
https://aplus-vault.vercel.app/api/vault/*
```

Extension defaults already point to this host in `background.js` and `popup.js`.

## Demo sharing (now)

Share with testers:

1. Demo guide: https://aplus-vault.vercel.app/demo
2. Full pack: `Vault-Code/docs/DEMO_PACK.md`
3. Extension folder: `Vault-Code/vault-extension/` (load unpacked)
4. Web app: https://aplus-vault.vercel.app/vault

Tester flow: log in → Profile → copy Extension sync token → paste in extension popup → capture.

## v0.2.0 release notes (2026-10-04)

New: Quick keep (+ Undo, Edit details), Keep all images (picker + batch API), credit/source saved at capture, offline retry queue, automatic pairing shown as "Connected" with Disconnect, optional smart detection + hover buttons, Alt+Shift+K shortcut.
Permissions: dropped `tabs`; added `alarms`; content script runs only on Vault origins unless the user opts in to all sites (`optional_host_permissions`).
New API: `POST /api/vault/capture-batch` (<= 20 items), `DELETE /api/vault/captures/:id` (Undo).
Before the Web Store: finish the legal/privacy pages (phase 12), update screenshots to the new popup, test in real Chrome (load unpacked) on 3 sites: a blog with lazy images, a gallery, a login-walled page; check Undo, offline retry (disable network), Keep all with 40+ images.

## Before Chrome Web Store (public / unlisted)

1. Confirm production API on all routes:
   - `GET /api/vault/health` → `storage: supabase`
   - `POST /api/vault/capture` (Bearer token required)
   - `POST /api/vault/capture-file`
   - `GET /api/vault/captures` (Bearer token required)

2. Confirm auth:
   - User can sign up / log in / Google OAuth on production URL
   - Extension never stores service role key
   - Token storage is local to browser profile only

3. Prepare store assets:
   - Extension name, short + detailed description
   - Screenshots: right-click capture, popup preview, Vault result
   - Privacy policy URL: https://aplus-vault.vercel.app/legal#extension-privacy
   - Support/contact URL

4. Package extension folder:
   - `manifest.json`, `background.js`, `content.js`
   - `popup.html`, `popup.css`, `popup.js`, `icons/`

5. Run QA before upload:

```powershell
cd Vault-Code
npm.cmd run check
npm.cmd run alpha:smoke
npm.cmd run build
```

## Still not for public store yet

- No Chrome Web Store listing or review submission
- No automated account deletion across all Supabase storage rows
- No public collections / sharing moderation workflow
- AI processing is alpha placeholder only
