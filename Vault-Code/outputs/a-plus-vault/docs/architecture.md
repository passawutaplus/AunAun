# A+ Vault Architecture

## Product Model

A+ Vault has four separate layers. Keep these meanings stable as the product grows:

- Vault Library: the central source of truth. Every saved object lives here first.
- Collections: custom folders for grouping objects by theme, material, client, campaign, or research topic.
- Moodboards: canvas workspaces. They reference existing Vault objects and add board-only text/palette objects.
- Projects: job-level spaces that gather selected collections, moodboards, and project objects.

The important rule is: objects are not duplicated when they are used elsewhere. Collections, moodboards, and projects should reference the original Vault object ID.

## Current Runtime

- `index.html` loads the app shell.
- `app.js` owns view state, rendering, event binding, and local-first workflows.
- `modules/core.js` owns shared constants, default collections, seed objects, SVG seed generation, and default projects.
- `modules/supabase-adapter.js` owns direct Supabase Auth, REST, and Storage sync with local fallback.
- `modules/utils.js` owns reusable pure helpers such as localStorage, escaping, URL host parsing, and numeric clamping.
- `local-server.cjs` serves the local alpha and accepts browser extension captures.
- `vault-extension/` is the Chrome extension capture surface.

The alpha app stores local user state in `localStorage`. If a real Supabase session exists, objects and custom collections can sync in the background. Extension captures are stored by the local server in `outputs/a-plus-vault/data/vault-captures.json` and then imported into the browser app.

## UI Flow

1. Visitor lands on the public capture concept page.
2. `Build your Vault` opens login.
3. Login fades into the Vault Library with skeleton loading.
4. Vault Library shows a visual object grid. New objects are sorted below pinned objects and above older objects.
5. Object detail opens on the right, with source, actions, collection assignment, moodboard use, and object analysis.
6. Moodboards and Projects open as index pages first. Users choose a board or project before entering a canvas.

## Browser Extension Flow

1. Right-click image, video, link, selected text, or page area.
2. Extension builds a smart capture payload.
3. Popup opens a preview panel before saving.
4. User edits title, collection, and note.
5. Save posts to the local server API.
6. Local server writes capture data and returns an object URL.
7. Vault app syncs captures and inserts the newest object near the top.

## Production Direction

Move from local-first to Supabase in this order:

1. Supabase Auth replaces the local mock login.
2. Supabase Storage stores image/video files privately.
3. Postgres stores objects, analysis, collections, projects, boards, and board objects.
4. API routes perform validation, metadata extraction, OCR, color extraction, and AI tags.
5. Extension sends captures to authenticated API routes instead of local server endpoints.
