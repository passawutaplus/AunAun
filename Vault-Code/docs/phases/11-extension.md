# Phase 11 — Extension upgrade (needs 02, 05.E)

Code: `Vault-Code/vault-extension/` (MV3, v0.1.4; background.js, content.js, popup.*). Server: `api/vault/*`. Design reference: the owner's design canvas "Vault extension popup" (boards 01–13). If you cannot open it, follow the state list below. **Reuse the existing look**: 352 px glass popup, tokens from `popup.css` (ink `#151719`, text `#2f3133`, line `#e5e8eb`, success `#2c8f68`, danger `#cc3931`). Coral `#ff4f43` stays decorative; any coral fill carrying white text uses `#d9362a` (contrast ≥ 4.5:1). Fonts stay bundled (no remote font CDN: privacy, phase 12).
Work in sub-steps; after each: run tests, update `manifest.json` version, STOP for `continue` only at the end of the phase unless a decision is needed.

## A. Quick keep vs Full keep (checkbox)
- Setting `quickKeep` (boolean, default false) in `chrome.storage.local`; checkbox "Quick keep — skip this form next time" on Home and in the full panel.
- ON: menu click / popup "Keep this page" saves immediately into the last-used collection (default "My Vault"), then shows the compact result card: thumbnail, "Kept in {collection}", **Undo**, **Edit details**, auto-close timer bar, "Turn off quick keep".
- OFF: opens the full panel (preview, other images on page, title, collection chips, note, optional `#tags`, "Stay on this page", Ctrl+Enter).
- Undo = delete by object id (add `DELETE /api/vault/captures/:id`, owner only; ask). Edit details opens the full panel pre-filled and updates the same item (no duplicate).

## B. Honest states
Saving (progress, cancel, "you can leave this page"), saved (palette + tags filling, Undo, Open in Vault), **already kept** (thumbnail, date, collection; Open existing / Add to another collection / Keep as separate copy; uses `findDuplicateCapture`), **link-only** notice when no image was found (login wall; offer "Add an image"), offline queue (E), connect (F), snapshot overlay (exists; add size badge + Enter/Esc hints).

## C. Credit and license metadata at capture
Content script gathers (no network): `rel=license`, JSON-LD `license`/`creator`/`author`/`copyrightHolder`, `og:site_name`, `meta[name=author]`, page URL, image URL. Stored in `item.captureContext.credit` as data. Never infer or display a license as granted: label "Source and credit saved". Used by the viewer "Open original" and share dialogs.

## D. Keep All (+Keep All)
- Entry points: context menu "+ Keep all images on page (n)", Home button with count, optional hover button (G).
- Content script collects candidates: `<img>`/`<picture>`/srcset (largest), CSS backgrounds, video posters; normalize URL (strip size/query params for comparison); drop tiny/icon/sprite/data/tracking images below KEEP_ALL_MIN_EDGE (default 400 px, shown as "small — off"), dedupe, cap KEEP_ALL_MAX (60). Never reads cross-origin pixels.
- Picker overlay (shadow DOM, on the page): grid, tick per image (`aria-pressed`), Select all / None, size/“already kept” badges, destination collection (default NEW collection auto-named from the page title, editable), primary "Keep n images". Esc closes.
- Save through ONE batch call: `POST /api/vault/capture-batch` (≤ BATCH_MAX items per request, one auth, one rate-limit unit, per-item result `kept|duplicate|failed`); chunk and show progress; "Kept n · k skipped (already kept)", **Undo all**, Open collection. Save URLs + source + credit only; enrichment (05.E) fetches thumbnails server-side with the safe fetcher. Extension never downloads page images in bulk.
- Rights wording in the picker: "Images stay private to you. They belong to their owners." (links to `/legal#terms`).

## E. Offline / retry queue
On network or 5xx failure store the capture in a `chrome.storage.local` queue (cap 50 items; snapshots stored as thumbnails only, else skip with a message), show "Waiting to send · n" with remove and "Retry now"; retry with backoff on popup open and via `chrome.alarms` (ask before adding that permission). Never retry 4xx; never duplicate (use `objectId` idempotency: `writeCapture` already merges).

## F. Connect without pasting a token
Primary path: web page `/vault/connect` (logged-in) hands the signed token to the extension through `externally_connectable` (matches only the Vault origins) or a one-time `postMessage` relay in the existing content-script origin allowlist; popup shows "Connected · {name}" and a Disconnect. Token paste stays under "Advanced". Add token rotate/revoke in Profile (token already derives from user id + secret: define revocation, e.g. per-user `token_version` in the HMAC; ask before changing the token format). Show a clear "Session expired, reconnect" state.

## G. Permissions diet and optional on-page features
- Default install asks for the minimum: `activeTab`, `contextMenus`, `storage`, `scripting`, host permissions only for Vault origins; drop `tabs` if `chrome.tabs.create/query` for Vault origins can be done under host permission or `activeTab` (verify).
- Smart capture needs a content script on pages for the right-click DOM probe: make it an opt-in ("Smart image detection on all sites") using `optional_host_permissions` requested at first use; without it, use `info.srcUrl` + `chrome.scripting.executeScript` injected on click.
- Hover buttons ("Keep" and "Keep all n" on image hover) are OFF by default, enabled only with the same opt-in, built in a closed shadow DOM, no layout shift, honor `prefers-reduced-motion`.
- Remove broad `http://*/*` `matches` from `content_scripts` when the opt-in is off. Update `PRIVACY.md` to match exactly.

## H. Mymind-inspired extras (small)
Text highlight save: selection → keep with a link back using a text fragment (`#:~:text=`), shown as a quote card · tags and note typed at save time (`#tag` chips, optional) · color: hex codes typed into a note become color chips · login-wall pages keep a screenshot-style thumbnail with the honest notice · keyboard shortcut for Quick keep via `commands` (ask).

## I. Mobile and other browsers
- Android/Chrome: add `share_target` to the web manifest so the system share sheet sends an image/link to `/vault/share` (logged-in) which uses the same save path. iOS Safari: document the Shortcuts route only; no native app now.
- One MV3 package serves Chrome, Edge, Brave, Opera (Web Store listing). Firefox later (separate manifest tweaks). Safari needs a macOS wrapper: out of scope.
- Add an install block in the existing Extension tab: browser-detected primary button, other browsers list, 3 steps, link to privacy.

## J. Tests, release
Unit tests (node --test, extension logic factored into pure modules where possible): candidate ranking, Keep All filter/dedupe/URL normalize, payload builders, queue add/retry/cap, credit extraction on HTML fixtures, quickKeep decision. API tests: batch partial failure, auth, rate limit, duplicate. Version in manifest = release notes + `PUBLIC_RELEASE_CHECKLIST.md` updated; store assets and privacy text finished in phase 12.

Done when: Quick/Full keep checkbox works; Undo works; credit saved; Keep All saves a chosen set into one new collection with progress/undo; offline queue retries; connect needs no manual token; default install requests fewer permissions; extension tests pass; `npm run check` and `npm test` pass.
