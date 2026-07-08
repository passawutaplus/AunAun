# Launch Readiness Plan

This is the launch-first plan for turning the current alpha into a usable private alpha. The goal is not to finish the long-term vision. The goal is to make the core loop trustworthy enough for 5-10 real testers.

## Launch Goal

Ship a private alpha where a designer can:

1. install/use the Chrome extension
2. save image, link, page, selected text, video preview, or snapshot without leaving the current page
3. see the object appear in Vault Library
4. search and filter it later
5. keep it in a collection
6. reuse it in a moodboard or project direction flow
7. trust that the source and preview are preserved

## Scope Boundary

Build now:

- reliable extension capture
- Supabase Auth and private storage
- central Vault Library
- Inbox default
- search, filters, collections
- object detail with source/context
- basic moodboard reuse
- private share link for one object or one collection
- clear error and loading states

Delay:

- full design editor
- public discovery feed
- advanced collaboration
- native mobile apps
- complex canvas tools
- team roles
- full AI assistant
- full-page screenshot archive
- large PSD/AI/FIG asset management

## Phase 0: Product Lock

Outcome: the team and tools share one product direction.

Tasks:

- Keep `docs/product-memory.md` as the source of truth.
- Keep `docs/architecture.md` aligned with the meanings of Vault Library, Collections, Moodboards, and Projects.
- Use this rule for every new task: if it does not improve capture, retrieval, or real work reuse, defer it.

Acceptance:

- New development can be judged against the same product rules.
- Cursor can continue without rediscovering the product thesis.

## Phase 1: Reliable Local Alpha

Outcome: current local app is stable enough to test flows repeatedly.

Tasks:

- Keep the app loading without blank-screen regressions.
- Keep sidebar, detail drawer, object grid, collection pages, project pages, and moodboard pages stable.
- Keep newest saved objects sorted below pinned objects and above older objects.
- Keep collection default as Vault Library / Inbox for quick capture.
- Keep extension preview popup before saving.
- Keep local server capture endpoints working.
- Keep `/api/vault/health` working so the extension can warn when the local API is offline.
- Add small smoke checks for app boot, grid render, detail open, extension capture import, and object share page.

Acceptance:

- `npm run check` passes.
- `npm run alpha:smoke` passes.
- `npm run build` passes.
- App opens locally and renders the Vault grid.
- Extension save does not fail on normal image/link/text captures.

## Phase 2: Supabase Private Alpha

Outcome: tester data survives refresh, browser changes, and device changes.

Tasks:

- Enable real email/password auth and Google login.
- Confirm Supabase Auth redirect URLs for local and Vercel.
- Consume OAuth callbacks on app boot and remove access tokens from the URL.
- Store objects in `vault_items`.
- Store custom collections in `vault_collections`.
- Store image/video assets in private `vault-assets` storage.
- Use signed URLs for private previews.
- Confirm RLS prevents cross-user reads and writes.
- Keep local fallback only as a safety net, not the primary alpha path.

Acceptance:

- A real tester can sign up, sign in, save, refresh, and still see their objects.
- Tester A cannot read Tester B objects.
- Uploaded images are not public unless explicitly shared.

## Phase 3: Extension Production Pass

Outcome: the extension becomes the primary product entry point.

Tasks:

- Send captures to the authenticated Vault API instead of only local server.
- Keep right-click save for images, links, selected text, and page URLs.
- Keep snapshot preview before saving.
- Add video support through poster/thumbnail/source URL first.
- Detect CSS background images, `picture`, `srcset`, and common portfolio cards.
- Add friendly failed-save states with retry.
- Keep Recently kept local to the extension.
- Never redirect the current tab by default.

Acceptance:

- Save from Pinterest, Behance, Google Images, normal websites, and portfolio pages works in most common cases.
- Capture success target for alpha: 90%+ on tester domains.
- Preview success target for alpha: 85%+ on tester domains.
- Save time target: under 5 seconds for normal captures.

## Phase 4: Retrieval and Organization

Outcome: saved objects are easy to find again.

Tasks:

- Search title, note, source domain, URL, keyword, and OCR placeholder fields.
- Add filters for type, date saved, source/domain, collection, project, keyword, style, category, and color family.
- Add duplicate warning for matching source URL or image URL.
- Keep collection create, rename, delete, and item assignment.
- Keep project index as a list of included collections and moodboards before opening a board.
- Keep moodboard index as board cards with create, rename, delete, and open actions.

Acceptance:

- A tester can find an item saved earlier without remembering the exact title.
- Collections and projects clarify organization without blocking quick save.

## Phase 5: Real Work Sharing

Outcome: a saved reference can be used in client/team conversations.

Tasks:

- Create a single-object share page with preview, source, keyword, colors, and a `Try to your Vault` CTA.
- Create private collection share links.
- Add social share and copy-link popup.
- Keep public sharing explicit and reversible.
- Add source attribution to shared pages.

Acceptance:

- Shared object pages work without exposing private user libraries.
- Every shared page links back to the Vault product.

## Phase 6: AI Lite After Trust

Outcome: AI helps structure references without becoming the main product promise.

Tasks:

- Extract dominant colors.
- Add keyword/style/category tags.
- Add OCR only after capture and retrieval are reliable.
- Add summary for image/link objects.
- Prepare semantic search schema, but do not ship heavy AI until core metrics are stable.

Acceptance:

- AI failure never blocks saving.
- Users can still search and organize manually.

## Launch Checklist

- Auth works for real testers.
- RLS and storage privacy are verified.
- Extension capture works for image, link, text, page URL, video poster, and snapshot.
- Objects preserve source URL, page title, domain, saved date, capture method, and preview when available.
- New objects appear below pinned objects.
- Vault Library is always the source of truth.
- Search and filters work.
- Collections can be created, renamed, deleted, and assigned.
- Moodboards reuse objects by reference.
- Object share popup can copy link and share to common platforms.
- App has skeleton/loading states and friendly failed states.
- Mobile web remains usable.
- Vercel deploy URL works.
- 5-10 testers have a simple feedback checklist.

## Private Alpha Test Script

Ask each tester to complete these tasks:

1. Install or load the extension.
2. Save 3 images from different sites.
3. Save 1 link from a page.
4. Save 1 selected text note.
5. Save 1 snapshot.
6. Open Vault and find the newest saved objects.
7. Search for one item by source or keyword.
8. Move one item into a collection.
9. Add one item to a moodboard.
10. Share one object link.

Track:

- where capture failed
- whether preview failed
- whether the user stayed in browsing flow
- whether the user could find saved references later
- what felt confusing or untrustworthy
