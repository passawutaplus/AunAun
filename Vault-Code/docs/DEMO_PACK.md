# A+ Vault Demo Pack

Private alpha demo for testers — web app + Chrome extension capture sync.

**Demo URL (share with testers):** https://aplus-vault-demo.vercel.app  
**Production (staff):** https://aplus-vault.vercel.app

## Live URLs (demo)

| Page | URL |
|------|-----|
| Home | https://aplus-vault-demo.vercel.app/ |
| Vault workspace | https://aplus-vault-demo.vercel.app/vault |
| Demo guide | https://aplus-vault-demo.vercel.app/demo |
| Legal / privacy | https://aplus-vault-demo.vercel.app/legal |
| API health | https://aplus-vault-demo.vercel.app/api/vault/health |

Health should return `"storage": "supabase"` when production env is configured.

## Quick start (5 minutes)

### 1. Open the web app

Go to https://aplus-vault-demo.vercel.app/vault

**Option A — instant local demo (browser only):**
- Email: `creative@aplus.local`
- Password: `aplusvault`

**Option B — real account:**
- Create account with your email + password
- Or **Continue with Google** (Supabase OAuth)

### 2. Install the Chrome extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `vault-extension/` folder from the project

### 3. Connect extension to your Vault

1. Log into the web app
2. Open **Profile**
3. Copy **Extension sync token**
4. Open the extension popup
5. Set **API Base** to `https://aplus-vault-demo.vercel.app` (demo) or `https://aplus-vault.vercel.app` (production)
6. Paste token into **Alpha API Token**
7. Save settings

### 4. Try a capture

1. Visit Pinterest, Behance, or any image-heavy site
2. Right-click an image → **+ Keep in Vault**
3. Confirm in the popup preview
4. Open Vault Library — the object should appear near the top

## Deploy commands

```bash
cd Vault-Code
npm run deploy:demo          # → aplus-vault-demo.vercel.app
npm run deploy:production    # → aplus-vault.vercel.app
```

From monorepo root:

```bash
./scripts/deploy-vercel.sh demo vault
./scripts/deploy-vercel.sh production vault
```

## Privacy

References are private by default. Read the [Privacy Notice](https://aplus-vault-demo.vercel.app/legal#privacy) and [Data Rights](https://aplus-vault-demo.vercel.app/legal#data-rights) pages.

Extension privacy summary: [Chrome Extension Privacy](https://aplus-vault-demo.vercel.app/legal#extension-privacy)
