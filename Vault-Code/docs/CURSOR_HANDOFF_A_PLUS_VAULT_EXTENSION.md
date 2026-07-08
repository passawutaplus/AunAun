# Cursor Handoff: A+ Vault + Chrome Extension

## Current State

This workspace now contains:

```text
outputs/a-plus-vault/
  index.html
  app.js
  styles.css
  local-server.cjs
  data/vault-captures.json       created at runtime

vault-extension/
  manifest.json
  background.js
  popup.html
  popup.js
  popup.css
  content.js
  icons/
```

The web app is still a local-first alpha using `localStorage`.
The extension does not write to Supabase yet.

## Run Locally

From the workspace root:

```powershell
node .\outputs\a-plus-vault\local-server.cjs
```

Open:

```text
http://127.0.0.1:5177/
```

Load extension:

```text
chrome://extensions/
Developer mode -> Load unpacked -> vault-extension/
```

In the popup:

```text
Alpha API Token: any non-empty test token
API Base: http://127.0.0.1:5177
```

## Capture Flow

```text
Chrome right-click / popup
-> background.js or popup.js builds payload
-> context menu stores pendingCapture and opens popup.html
-> user confirms title/note/collection
-> POST http://127.0.0.1:5177/api/vault/capture
-> local-server.cjs validates Bearer token
-> local-server.cjs maps payload into a Vault item
-> stores record in outputs/a-plus-vault/data/vault-captures.json
-> app.js polls GET /api/vault/captures
-> unseen captures are imported into localStorage
-> item appears in Vault Library grid
```

Fallback mode:

If `/api/vault/capture` is not active yet, pressing `Keep in Vault` opens:

```text
http://127.0.0.1:5177/#vault-capture=<encoded payload>
```

`app.js` imports that payload during boot through:

```text
importHashCapture()
itemFromCapturePayload()
```

This makes the extension usable immediately against the current static server, while still preserving the confirmation popup before any web navigation.

## Type Mapping

Extension payload types:

```text
image -> Vault image
video -> Vault video
link  -> Vault link
page  -> Vault link
text  -> Vault note
```

All captures default to:

```text
collectionIds = ["inbox"]
projectIds = []
status = "ready"
```

## Important Files To Continue In Cursor

- `outputs/a-plus-vault/local-server.cjs`
  Local bridge server and `/api/vault/capture` endpoint.

- `outputs/a-plus-vault/app.js`
  Frontend import logic:
  - `syncExtensionCaptures`
  - `normalizeCapturedItem`
  - `importHashCapture`
  - `itemFromCapturePayload`

- `vault-extension/background.js`
  Context menu capture logic and popup window launch.

- `vault-extension/popup.js`
  Popup token/API settings, pending capture confirmation UI, and save flow.

## Security Notes

Do not put these in the extension:

- Supabase service role key
- AI API keys
- privileged database write logic

The extension should remain a capture surface only.

Production version should move `/api/vault/capture` into a real backend route that:

- authenticates user from bearer token or session
- validates URLs
- rate limits captures
- stores files in private storage
- writes to Supabase with RLS-safe user ownership

## Next Recommended Tasks

1. Replace local alpha token with real auth/session.
2. Move `local-server.cjs` capture logic into production API.
3. Add a web capture confirmation route for v0.1.1:

```text
/vault/capture
```

for optional Project/Collection/Note.

4. Add v0.2 snapshot:

```text
+ Snapshot to Vault
visible viewport only
crop selected rectangle
save as image object
```

5. Add automated checks for:

- missing token returns 401
- image/video/link/text/page payload creates expected Vault item type
- frontend imports new captures once, without duplicates

## Development Refresh

The web app calls `startDevAutoRefresh()` on boot and polls `app.js` plus `styles.css`.
When either file changes, an already-open Vault page reloads itself.

Chrome does not auto-reload unpacked extension source files. After editing files in `vault-extension/`, reload the extension manually from:

```text
chrome://extensions/
Developer mode -> A+ Vault Capture -> Reload
```
