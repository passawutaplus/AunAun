# A+ Vault Demo Pack

Private alpha demo for testers — web app + Chrome extension capture sync.

## Live URLs

| Page | URL |
|------|-----|
| Home | https://aplus-vault.vercel.app/ |
| Vault workspace | https://aplus-vault.vercel.app/vault |
| Demo guide | https://aplus-vault.vercel.app/demo |
| Legal / privacy | https://aplus-vault.vercel.app/legal |
| API health | https://aplus-vault.vercel.app/api/vault/health |

Health should return `"storage": "supabase"` when production env is configured.

## Quick start (5 minutes)

### 1. Open the web app

Go to https://aplus-vault.vercel.app/vault

**Option A — instant local demo (browser only):**
- Email: `creative@aplus.local`
- Password: `aplusvault`

**Option B — real account:**
- Create account with your email + password
- Or **Continue with Google** (Supabase OAuth)

### 2. Install the Chrome extension

1. Get the `Vault-Code/vault-extension/` folder (zip or repo clone)
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. **Load unpacked** → select `vault-extension/`

### 3. Connect extension to your Vault

1. Log into the web app
2. Open **Profile**
3. Copy **Extension sync token**
4. Open extension popup
5. **API Base:** `https://aplus-vault.vercel.app` (default)
6. Paste token into **Alpha API Token**
7. Save settings

### 4. Try a capture

1. Visit Pinterest, Behance, or any image site
2. Right-click an image → **+ Keep in Vault**
3. Confirm in popup preview
4. Open Vault Library — object appears near the top (sync polls every ~4.5s)

## What works in this demo

- Private reference library (images, links, notes, video metadata)
- Browser extension capture → production API → web import queue
- Bearer token scoping (your captures are isolated by token)
- Export my data / clear local data / deletion request flow (Profile)
- Supabase live mode for signup, login, Google OAuth, cloud sync
- Legal center with extension privacy disclosure

## Known limits (alpha)

- **Chrome Web Store:** extension is load-unpacked only — not published yet
- **Large snapshots:** very large snapshot files may fall back to `#vault-capture=` hash handoff
- **AI Lite:** keyword/color metadata is placeholder — not production AI
- **Public sharing / moodboard export:** not ready for external users
- **Email:** deletion requests go to support placeholder until full account purge is automated

## For developers

```powershell
cd f:\So1o\AunAun-fresh\Vault-Code
npm.cmd run test:gate
npm.cmd run smoke:public
npm.cmd run deploy:demo
node scripts/setup-vault-auth.mjs   # patch Supabase redirect URLs
```

From monorepo root:

```bash
./scripts/deploy-vercel.sh demo vault
```

Local API (extension dev):

```powershell
node outputs/a-plus-vault/local-server.cjs
# API at http://127.0.0.1:5177
```

## Support

- Privacy: privacy@aplusvault.app
- Extension privacy: https://aplus-vault.vercel.app/legal#extension-privacy
