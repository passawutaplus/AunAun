---
name: extension
description: Work on the Chrome extension (+ Keep in Vault): popup, context menu, content/background scripts, capture API, token sync. Use for extension, capture, popup requests.
---
# Extension (`vault-extension/`, v0.2.9)
- MV3: `manifest.json`, `popup.html/js/css`, `content.js`, `background.js`. API: `api/vault/capture`, `capture-file`, `captures`, `health` (Bearer token from Profile).
- Principles: save in one action; stay on the current page; never redirect after save; save now, organize later; friendly actionable errors.
- `scripts/qa.mjs` guards popup copy/structure (e.g. no "Keep current page", no manual keyword inputs, default collection "Vault Library", icon-only dismiss, header "Open Vault", duplicate hint). Respect them; update guards only when intentionally changing the UI.
- Keep `PRIVACY.md` and manifest permissions minimal and accurate. Bump version on release.
- Test with `npm run alpha:smoke`; manual: load unpacked, save image/link/text/snapshot.
