# Phase 02 — One save path, link import UI, own uploads

Improve the EXISTING "+ Keep" flow. Read `docs/CODEBASE.md` first: saving already runs through `api/vault/capture.js` (JSON), `capture-file.js` (files), `lib/vault-capture-core.mjs` (`buildVaultItem`), `lib/vault-capture-store.mjs`.

## 1. ONE server path
Web paste-link, upload, extension and (phase 11) batch/share-target all end in `buildVaultItem` → `writeCapture`. Do not add a second writer. After `writeCapture` call `enrichItem(objectId, auth)` from `lib/engine/enrich.mjs`: a **no-op stub now**, implemented in phase 05.E; it must never block or fail the save (fire-and-forget; ask how to run background work on Vercel: `waitUntil`, a follow-up client call, or Inngest). Card appears instantly; chips/palette fill in later.

## 2. Stop faking analysis
`analyzeLite` (server) and `analyze()` (app.js) invent colors from words and tags from keyword rules. Fake colors mislead and will conflict with phase 05. Keep keyword-rule tags only as `src: "rule"` low-confidence, drop invented colors (empty until 05 fills real ones), drop the "OCR placeholder" strings from user-visible UI.

## 3. Paste a link (web)
Input → loading → preview (image, title, domain, "open original") → Save, using phase 01 `/api/import-url`. imageUrl null → show an honest line "Saved as a link only (this site blocks previews)" + "Add an image" (upload as the card thumbnail; the user's file stays private). Enter submits, Esc closes. Thai messages mapped from error codes. Optional tags/note/collection only if the UI already has them; `#tag` typing in the tag field (quick tags) is allowed.

## 4. Own uploads
- Existing form accepts JPG/PNG/WebP ≤ 10 MB. Server (`capture-file`) re-validates type by content (`safeUploadType` exists), size, dimensions; strip EXIF GPS; ask before adding HEIC.
- Required checkbox: "I own the rights or have permission to store this image" + link to `/legal#terms`. Stored with the item (`rightsConfirmedAt`).
- Owner may download own uploads via an authenticated signed URL only. No download control for anyone else's images or feed images.
- Private by default.

## 5. Data (ask before migrating)
Items from the extension live in `vault_extension_captures.item` (jsonb). Prefer adding fields INSIDE `item` (no migration): `canonicalUrl, sourceDomain, faviconUrl, imageWidth, imageHeight, itemType (image|webpage|upload|highlight|video|note), importStatus (ok|partial|failed), licenseStatus ('unknown' default), visibility ('private'), creditText, pinned, rightsConfirmedAt, analysis{tagIds[], tags[], palette[], metrics, enrichLevel}`. Only if phase 00 shows web items also live in a SQL table, add matching columns there. Keep every existing field.

## 6. Images and feed
- Save the ORIGINAL image URL + source URL; do not re-host link images. Real aspect ratio from stored width/height (no layout shift); "from {domain}" linking to the original.
- Third-party images load with `referrerPolicy="no-referrer"` and `loading="lazy"` (also a privacy rule, phase 12). Broken or slow image never breaks the feed (placeholder on error).
- One seam `resolveImageUrl()` for a future proxy/storage; do not add wildcard remote hosts or a proxy without explaining consequences and asking.

Done when: web paste-link, upload and extension all create items through the same path; `enrichItem` is called (stub) after every save; no fake colors remain; link with no image saves with an honest notice; upload requires the rights checkbox and strips GPS; nothing existing broke (`npm run check` + `npm test`).
