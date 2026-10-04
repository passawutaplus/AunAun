# Phase 00 — Verify the map (no code changes)

`docs/CODEBASE.md` was written from reading the repo at commit 754a812. Verify it against the working tree and report in ≤25 lines:
1. Still true? (`git log -1`, structure, versions, `package.json` scripts). List every difference.
2. Items persistence: how does `app.js` store/sync items (localStorage ↔ `vaultRemote`/Supabase)? Which table(s) hold a logged-in user's items, collections, projects, moodboards? Is `vault_extension_captures` merged into My Vault by polling `GET /api/vault/captures`? Where is the user id available in API handlers (`resolveAuthContext`)?
3. Where would a server-side "enrich after save" step run on Vercel functions (waitUntil / Inngest / cron / client-triggered call)? What are function timeouts on the current plan?
4. Supabase project: plan, DB size, pausing risk, which migrations are applied (`list_migrations` if a Supabase tool exists) vs. the `.sql` files in the repo.
5. Search box location and current behavior (keyword/category filter); card + detail components in `app.js`.
6. Hosting: Vercel projects (web, demo, seeder), env var names only, cron frequency allowed.
7. Extension: version, permissions, API base defaults, how the token is issued (Profile → Extension sync).
8. Minimal plan for phases 01–02.

Then create `docs/PROGRESS.md` (checklist of phases 00–11). Implement nothing.
