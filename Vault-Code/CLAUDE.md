# A+ Vault (Vault-Code)

Creative reference vault for Thai freelance designers. Part of Aplus ecosystem (Vault -> So1o -> Aplus1/SAMECOR).
Flow: save references -> organize -> moodboard/project -> (share) -> real work. Production: https://aplus-vault.vercel.app
Private by default (user data); the Discover page is public catalog. App is already built; building new features is allowed (Cosmos/Pinterest-style direction: capture + open-license bots + compliance). Don't rebuild from scratch.
This folder is a subfolder of the AunAun-fresh monorepo. Work only inside `Vault-Code/`; ignore `../Solo-Code`, `../Anthem-Code` etc.

## Read on demand only (not every session)
- `outputs/a-plus-vault/docs/product-memory.md` - decision filter before adding features
- `outputs/a-plus-vault/docs/next-implementation-order.md` - roadmap
- `outputs/a-plus-vault/docs/data-model.md` - tables
- `seeder/README.md` - only for Discover seeding work
- `docs/image-sourcing-rules.md` - READ FIRST before touching image import, Save, feed, or takedown code (rules R1-R8, legal reasons, decision log)
- Ignore `docs/CURSOR_*`, `.tmp-*`, `dist/`, `node_modules/` unless asked.

## Map (edit source in `outputs/a-plus-vault/`; `dist/` is generated, never edit)
- `app.js` (~2100 lines, VERY long dense lines) - views, state, dialogs, share, board bindings
- `styles.css` (~4950 lines, minified-style) - all styles; sections appended with `/* A+ Vault <name> */` comments
- `modules/` - moodboard-model/-ui/-editor-ui/-autosave/-history, smart-grid, sidebar-dnd, project-workspace, user-dashboard, settings-ops, supabase-adapter, discover, discover-search, scroll-blur, core, utils
- `supabase-*.sql` - migrations (schema, moodboard-phase1, extension-*, alpha-hardening, scale-hardening, feedback-admin, discover-seeder)
- `api/vault/*` + `lib/*.mjs` - Vercel serverless capture API (Bearer token)
- `vault-extension/` - Chrome extension MV3 (v0.1.4): popup, content, background
- `seeder/` - SEPARATE Next.js app (port 3010, own package.json): fills `discover_items` from Met/AIC (CC0)
- `scripts/` - qa.mjs + qa-security.mjs (guards), smoke tests, deploy scripts
- PWA/security: `sw.js`, `manifest.webmanifest`, `modules/pwa.js`, CSP in `vercel.json` (no inline scripts), `SECURITY.md`; landing pages use `marketing.css/js`; error pages generated from `error-page.template.html`
- Routes (vercel.json): `/vault`, `/moodboards/*`, `/discover` -> app shell

## Commands (Windows PowerShell: use `npm.cmd` if `npm` is blocked)
- After any change: `npm run check`
- Before deploy/PR: `npm run test:gate`
- Local server: see README (VAULT_PORT=5177, `outputs/a-plus-vault/local-server.cjs`)

## Token-saving rules (important)
- NEVER cat/view whole `app.js` or `styles.css` (huge lines). Use `grep -n "<keyword>" file | cut -c1-200`, then view a small range.
- Edit with a small unique `str_replace`. New CSS = append a new `/* A+ Vault <feature> */` block at end of styles.css; don't rewrite existing lines.
- Find code from visible UI text, class names, or `data-*` attrs in the user's screenshot. Don't explore the repo.
- If target is unclear, ask ONE short question.
- Change only what is marked. No refactors, renames, or new dependencies unless asked.
- Reply in 1-3 lines. User checks visually; don't open a browser or take screenshots.

## Annotated screenshots
User sends screenshots with red boxes/arrows + a short note. Red box/arrow = target element; note = desired change. Several numbered items = do all in one pass.

## Design tokens (light theme, coral accent)
`--coral:#ff4f43` `--coral-dark:#e33f34` `--ink:#2f3133` `--ink-strong:#151719` `--muted:#747a80` `--line:#e5e8eb` `--panel:#f7f8fa`; radius 8px; fonts IBM Plex Sans Thai + Agrandir Wide (brand). Reuse tokens/classes (.ghost-button .primary-button .chip .tag .modal ...).

## Product guardrails
- User content private by default; public sharing must be explicit and revocable.
- Capture first; save now, organize later; never break browsing flow.
- Objects live once in Vault Library; collections/boards/projects store RELATIONS, never copies.
- NEVER read, print, or commit `.env*` (`.env.local` exists here). Never expose service-role/AI keys in client or extension.
- Don't run SQL, deploy, push, or touch live Supabase data unless told.
- Don't become: generic bookmark manager, cloud drive, full design editor.
- Bots/crawlers: only open-license (CC0, PDM, CC BY, CC BY-SA; never NC/ND) sources via official APIs, respect ToS/robots; never scrape Pinterest/Behance/Google Images/Unsplash/Pexels in bulk (see seeder/README step 7). Images with unknown rights stay private (`rights_status=unknown`), never on public Discover.
- Before public sharing of user-saved images: need Report/Takedown (Thai Copyright Act ss.43/6-43/8), ToS, rights badge.
- Public share/discover pages: show credit/source; keep `noindex` unless told otherwise.
