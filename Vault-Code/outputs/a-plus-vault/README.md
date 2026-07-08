# A+ Vault MVP

A+ Vault is a standalone private creative reference vault for the Aplus concept: You Create, We Connect.

Open index.html in a browser to try the web-only MVP. For extension capture, run `local-server.cjs` and open `http://127.0.0.1:5177/` so the extension and web app share the same API base.

## Code Map

- `app.js`: app state, rendering, event binding, and local-first workflows
- `modules/core.js`: shared constants, seed data, and default projects
- `modules/supabase-adapter.js`: Supabase Auth, REST, and Storage sync adapter with local fallback
- `modules/utils.js`: shared helpers for storage, escaping, URL parsing, and numeric clamping
- `local-server.cjs`: local alpha server and extension capture API
- `docs/architecture.md`: product layers, runtime flow, extension flow
- `docs/data-model.md`: Supabase-ready data model
- `docs/product-memory.md`: compact founder thesis and product decision rules
- `docs/launch-readiness-plan.md`: launch-first private alpha plan
- `docs/next-implementation-order.md`: ordered roadmap for Cursor/production work
- `docs/supabase-live-sync.md`: how the Supabase sync adapter works and how to enable live Google login

## What Works Now

- Local private sign-in mock
- Pinterest-style masonry grid
- Hover overlay details on each saved reference
- Save image, URL, or note
- Image validation for JPG, PNG, WebP up to 10MB
- Search and type filters
- Collections
- Detail drawer with editable title, note, and collection
- AI Lite simulation: tags, color extraction, OCR placeholder, summary
- Local persistence
- Responsive mobile layout
- Light/Dark/System theme with IBM Plex Sans / IBM Plex Sans Thai
- Collapsible left sidebar and closeable, resizable detail sidebar
- Flat SVG icons for workspace, vault menu, filters, collections, and save flows
- Public homepage with a minimal logo + Log in header
- Login page routes directly into the Vault Library workspace
- Premium Capture Flow screen based on the browser-extension concept
- Save modal supports Upload Image, Paste URL, and Quick Note with optional Project and Collection context
- Vault Library is always the source of truth and the default collection
- Detail drawer supports project assignment and one-click Add to Moodboard
- Local extension capture API with `/api/vault/health`, `/api/vault/capture`, `/api/vault/capture-file`, and `/api/vault/captures`
- Alpha smoke test for image, link, selected text, video, and snapshot capture flows

## Local Alpha QA

From the repo root:

```bash
npm run check
npm run alpha:smoke
```

The smoke test starts a temporary local Vault server, saves all launch-critical capture types, verifies newest-first import order, and then deletes its temporary data.

## Supabase Integration Next

1. Create a Supabase project and private vault-assets storage bucket.
2. Run supabase-schema.sql.
3. Replace localStorage methods in app.js with calls matching api-contract.md.
4. Move analysis into server functions so OCR, metadata extraction, and AI tags do not expose keys in the browser.

## Browser Extension Alpha

- Toolbar icon: open Mini Vault Panel for snapshot and upload flows
- Right-click image/link/video/page/selection: open preview popup before saving
- Highlight text: save selected text as note
- Popup fields: title, collection, note
- API target: local alpha endpoints under `http://127.0.0.1:5177/api/vault/*`
- Every capture lands in Vault Library first, then optionally links to a collection


## Added Moodboard Builder

- Projects list separates workspaces by client or job.
- Vault Library is the central object source.
- Drag any saved object from the library onto the canvas.
- Add editable text objects directly on the board.
- Move objects around with drag.
- Save Board persists the canvas in localStorage.
- Share Link creates a prototype hash link for later server-backed sharing.

## Supabase Connected

Project ref: zkflkpbmbozrchqncpzi
Project URL: https://zkflkpbmbozrchqncpzi.supabase.co
Public frontend key: configured in supabase-config.js
Private storage bucket: vault-assets
Migration applied: a_plus_vault_mvp_schema
Hardening applied: supabase-alpha-hardening.sql

The current UI remains local-first for demo access, but real email/password Supabase login and signup are wired for private alpha users. Collection membership now syncs into `vault_collection_items`, while client payload remains a fallback for older local data.

The production database is ready for the next pass where board/project editing is synced directly instead of staying local-first.
