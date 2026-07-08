# A+ Vault Cursor Task Queue

This is the recommended implementation order after the current Codex handoff.

## Phase 0 - Do Not Skip

1. Open `CURSOR_START_HERE_A_PLUS_VAULT.md`.
2. Run:

```powershell
npm.cmd run check
npm.cmd run alpha:smoke
npm.cmd run build
```

3. Verify live deploy routes after redeploy:

```text
https://aplus-vault.vercel.app/
https://aplus-vault.vercel.app/vault
https://aplus-vault.vercel.app/legal.html
```

## Phase 1 - Fix Live Deployment

Goal: make the Vercel demo usable from another computer and from the extension.

Tasks:

- Deploy latest build to Vercel.
- Confirm `/vault` no longer returns `404: NOT_FOUND`.
- Confirm `/legal.html` loads.
- Confirm extension Open Vault opens `/vault`.
- Confirm extension right-click image save imports into Vault Library with image preview.

Acceptance:

- Live `/vault` loads the app shell.
- Extension can save at least one image from Pinterest or another image-heavy site in Vercel demo mode.

## Phase 2 - Export and Delete Data

Goal: satisfy alpha privacy/data-control baseline.

Tasks:

- Add `Export my data` in Profile.
- Export JSON containing items, collections, projects, boards, settings, and capture metadata.
- Add `Clear local Vault data` with app dialog confirmation.
- Add `Delete account / request deletion` placeholder for Supabase mode.
- Add QA guards for export/delete controls.

Acceptance:

- User can download local JSON.
- User can clear local data without browser alert/confirm.
- Legal page links to data rights remain visible.

## Phase 3 - Production Capture API

Goal: stop relying on hash handoff for production and make extension public-ready.

Needed server routes:

```text
GET /api/vault/health
POST /api/vault/capture
POST /api/vault/capture-file
GET /api/vault/captures
```

Preferred implementation:

- Vercel serverless functions or Supabase Edge Functions.
- Authenticated user only.
- Store files in private Supabase Storage bucket.
- Store metadata in Supabase tables.
- Return object ID and object URL.

Acceptance:

- Extension saves image/link/video/text/snapshot through hosted API.
- No service-role key in extension.
- Large snapshot/file upload works without URL hash fallback.

## Phase 4 - Supabase Live Sync Hardening

Tasks:

- Apply schema and hardening SQL.
- Confirm RLS policies.
- Configure Supabase Auth redirect URLs for:
  - local dev
  - Vercel production
  - future custom domain
- Test email/password with a real private alpha user.
- Test Google OAuth only after redirect config is correct.
- Test private storage upload and signed URL reading.

Acceptance:

- Logged-in users see only their own items.
- Object CRUD syncs without breaking local demo mode.
- Storage assets are not public by default.

## Phase 5 - Extension Public-Readiness

Tasks:

- Decide production API base.
- Update default API Base in:
  - `vault-extension/background.js`
  - `vault-extension/popup.js`
- Minimize host permissions.
- Add Chrome Web Store privacy disclosure.
- Capture store screenshots:
  - right-click capture
  - popup preview
  - saved object in Vault
- Package `vault-extension/` only.

Acceptance:

- Extension can be shared as unlisted/private test without local server.
- Privacy policy URL exists and matches behavior.

## Phase 6 - Moodboard and Project Real CRUD

Tasks:

- Project create/rename/delete.
- Project contains any number of collections and moodboards.
- Moodboard list page supports create/rename/delete.
- Board objects persist through Supabase.
- Drag/drop object placement persists.
- Export moodboard image/PDF later.

Acceptance:

- A project can gather collections and moodboards.
- A moodboard can reuse central Vault objects without duplicating data.

## Phase 7 - AI Lite

Tasks:

- Server-side URL metadata extraction.
- Real OCR path.
- Color extraction server-side for remote images/files.
- Keyword/style/category suggestions.
- AI settings:
  - generate tags
  - OCR
  - external AI processing allowed
  - exclude item/project from AI

Acceptance:

- AI disclosure and settings exist before any third-party AI provider receives user content.

## Phase 8 - Public Sharing Later

Do not build public collections before these controls exist:

- share scope: private / anyone with link / public
- unpublish/revoke link
- report content
- copyright takedown
- privacy report
- moderation log
- repeat-infringer workflow
- search indexing off by default

