# A+ Vault Capture Extension

This folder is a local Manifest V3 Chrome Extension for the A+ Vault alpha.

## Core Flow

- Right-click image, video, link, selected URL/text, or page -> `+ Keep in Vault`.
- Right-click page -> `[  ] Snapshot to Vault` to drag-select part of the visible viewport.
- Click the extension icon to open the Mini Vault Panel.
- Right-click and snapshot captures open a preview panel first, so title, collection, and note can be edited before keeping.
- Every successful capture is saved to the central Vault Library and appears in the recent list.
- If no collection is selected, the local backend assigns `Vault Library`.
- Smart Capture inspects the DOM under the right-click point and tries to keep the best visual preview from images, picture/srcset, CSS backgrounds, video posters, or page metadata.

## Mini Vault Panel

The popup includes:

- `Snapshot current view`
- `Upload file` with drag-and-drop onto the popup
- `Stay on this page after saving`
- `Recently kept` image strip, trimmed to the latest 5 captures
- `Open Vault` in the header
- Alpha token/API base settings

`stayOnPageAfterSave` defaults to `true`. When disabled, the extension opens the saved object URL or Vault in a new tab. It never redirects the current active tab.

The popup checks the local Vault API health endpoint on open. If `http://127.0.0.1:5177` is not running, it shows a clear offline message before the user tries to save.

Manual upload is available in the Mini Vault Panel via Upload file / drag-and-drop, in addition to the web app. Extension captures keep title, collection, note, source, and preview data; Vault AI Lite fills searchable keywords/category after save.

## Font Setup

The popup CSS already bundles and prefers:

```text
fonts/Agrandir-Wide-Light.woff2 -> Agrandir Wide -> Agrandir -> IBM Plex Sans Thai -> IBM Plex Sans -> system fonts
```

Chrome can use the bundled `Agrandir-Wide-Light.woff2` inside the popup. If the file is removed or unavailable, the popup falls back to IBM so Thai text remains readable.

The bundled font path is:

```text
vault-extension/fonts/Agrandir-Wide-Light.woff2
```

## Snapshot Scope

Snapshot v0.1 is intentionally small:

- Visible viewport only
- Drag rectangle crop
- Esc cancels
- No full-page screenshot
- No scrolling/stitching
- No OCR or AI inside the extension

## Local Setup

1. Start the A+ Vault local server:

```powershell
node .\outputs\a-plus-vault\local-server.cjs
```

Or double-click:

```text
start-a-plus-vault-local.cmd
```

2. Open:

```text
http://127.0.0.1:5177/
```

3. Load unpacked extension:

```text
chrome://extensions/
Developer mode -> Load unpacked -> select vault-extension/
```

4. Pin the extension.

5. Open the extension popup and set:

```text
Alpha API Token: any non-empty local alpha token
API Base: http://127.0.0.1:5177
```

## Files

```text
manifest.json     Manifest V3 config
background.js     Context menus, smart capture ranking, save calls, snapshot/upload capture, recent capture storage
content.js        DOM inspector, snapshot overlay, crop logic, and page toast
popup.html        Mini Vault Panel markup
popup.js          Popup actions, recent list, stay-on-page setting
popup.css         Compact A+ styling
icons/            Extension icons
```

## API Contract

JSON captures:

```text
POST /api/vault/capture
Authorization: Bearer <token>
```

Snapshot file captures:

```text
POST /api/vault/capture-file
Authorization: Bearer <token>
FormData:
- file: cropped PNG
- payload: JSON metadata
```

The local server stores captures in:

```text
outputs/a-plus-vault/data/vault-captures.json
```

The web app polls:

```text
GET /api/vault/captures
```

The extension popup checks:

```text
GET /api/vault/health
```

## Vercel Demo Fallback

The Vercel demo is a static/localStorage-first web app, so it does not expose
the production capture API yet. If `API Base` is set to:

```text
https://aplus-vault.vercel.app
```

the extension falls back to a web handoff URL:

```text
/vault#vault-capture=<encoded payload>
```

That opens the Vault web app and imports normal image/link/video/text captures
into `Vault Library`. Large snapshots and file uploads still need the local
server until the production capture API is deployed.

## Dev Note

Web UI changes can auto-refresh during local development. Extension source changes still require pressing `Reload` on the unpacked extension in `chrome://extensions/`.

## Public Release Note

The extension can be packaged for public or unlisted Chrome Web Store distribution later, but the current alpha still defaults to the local API base `http://127.0.0.1:5177`. Before public release, point the extension to a production capture API, verify auth, add the store description/screenshots/privacy text, then package the `vault-extension/` folder as the upload artifact.

See `PUBLIC_RELEASE_CHECKLIST.md` for the release sequence.
