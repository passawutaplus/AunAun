# Next Implementation Order

## 1. Stabilize Local Alpha

- Keep the current visual grid, detail drawer, collections, projects, moodboards, and extension popup stable.
- Add small smoke checks whenever a UI flow changes.
- Avoid adding more product surface until save/sync is reliable.

## 2. Supabase Auth

- Direct email/password Auth adapter has been added.
- Session restore has been added.
- Google OAuth is ready behind `mode: 'supabase-live'`.
- Next: configure real Supabase Auth redirect URLs and test with a real private alpha user.

## 3. Supabase Storage

- Private bucket support has been wired through the adapter.
- Image data URLs can upload to `vault-assets`.
- Signed URL loading has been added.
- Next: move file uploads through server routes before public use.

## 4. Item API

The static app now talks to Supabase REST directly for alpha sync. Server routes are still recommended before production:

- `POST /api/vault/items`
- `GET /api/vault/items`
- `PATCH /api/vault/items/:id`
- `DELETE /api/vault/items/:id`

Then map the extension endpoints to the same item creation flow.

## 5. Collections, Projects, Moodboards

Implement after item CRUD:

- collection create/rename/delete
- item-to-collection joins
- project create/rename/delete
- board create/rename/delete
- board object create/update/delete

## 6. AI Lite

Server-side analysis should run after an item is created:

- URL metadata
- dominant colors
- OCR placeholder upgraded to real OCR
- keyword/style/category tags
- summary

## 7. Extension Production Pass

- Add authenticated API base configuration.
- Keep the preview popup before every save.
- Save image/video/link/text/snapshot as typed objects.
- Keep failed-save messages friendly and actionable.
- Keep recent captures local to the extension.

## 8. Private Alpha QA

Use 5-10 testers with these checks:

- save image, video, link, text, and snapshot from the extension
- newest saved object appears below pinned objects
- collection picker defaults to Vault Library
- detail share popup creates a single-object page link
- moodboard can reuse Vault objects by reference
- mobile grid and detail sheet stay usable
