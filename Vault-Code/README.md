# A+ Vault

Part of the [AunAun-fresh](../) monorepo (`Vault-Code/`).

A+ Vault is a private creative reference vault for the Aplus ecosystem: **You Create, We Connect**.

## Quick start (this machine)

```powershell
cd f:\So1o\AunAun-fresh\Vault-Code
npm.cmd run check
npm.cmd run build
$env:VAULT_PORT="5177"
$env:VAULT_DATA_DIR=(Join-Path (Get-Location) "outputs\a-plus-vault\data")
node outputs/a-plus-vault/local-server.cjs
```

Chrome extension: load unpacked from `vault-extension/`.

Production: https://aplus-vault.vercel.app

Cursor handoff: [`docs/CURSOR_START_HERE_A_PLUS_VAULT.md`](docs/CURSOR_START_HERE_A_PLUS_VAULT.md)

This MVP includes:

- Pinterest-style central Vault Grid
- Save image, URL, and note flows
- AI Lite metadata simulation: tags, colors, OCR placeholder, summary
- Projects and Moodboard Builder
- Drag saved vault objects into moodboards
- Editable text objects on the board
- Save/share prototype flows
- Supabase schema and config for project `zkflkpbmbozrchqncpzi`
- Vercel-ready static build output

## Run locally

For the web-only prototype, open `outputs/a-plus-vault/index.html` directly in a browser.

For the local alpha with browser-extension capture, run the local server and use the stable API port:

```bash
node outputs/a-plus-vault/local-server.cjs
```

Then open:

```text
http://127.0.0.1:5177/
```

The extension popup and context-menu capture default to this same API base.

For Vercel/static build:

```bash
npm run build
```

The build copies `outputs/a-plus-vault` to `dist`.

## QA

```bash
npm run test:gate          # sitemap:gen + check + unit + alpha:smoke + build
npm run sitemap:gen        # robots.txt, sitemap.xml, llms.txt
npm run smoke:public       # curl public routes (BASE_URL optional)
npm run smoke:api          # post-deploy API capture smoke (writes DB)
```

SEO details: [`docs/seo-deploy.md`](docs/seo-deploy.md)

Individual steps:

```bash
npm run check
npm run alpha:smoke
npm run build
```

`npm run check` validates source syntax, product guards, and a minimal local API save.
`npm run alpha:smoke` starts a temporary local server and tests image, link, selected text, video, and snapshot capture flows without touching your real local Vault data.

## Deploy (alpha demo)

```bash
npm run deploy:demo
# or from monorepo root:
./scripts/deploy-vercel.sh demo vault
```

Runs `test:gate` first, then deploys to Vercel project `aplus-vault`, then public + API smoke.

## Supabase

Supabase project: `zkflkpbmbozrchqncpzi`
URL: `https://zkflkpbmbozrchqncpzi.supabase.co`
Private storage bucket: `vault-assets`

The database migration `a_plus_vault_mvp_schema` has been applied and includes:

- `vault_items`
- `vault_item_analysis`
- `vault_collections`
- `vault_collection_items`
- `vault_projects`
- `vault_boards`
- `vault_board_objects`
- `vault_board_shares`

The current frontend remains local-first for alpha testing, with Supabase config included in `outputs/a-plus-vault/supabase-config.js`.

Latest private-alpha pass:

- Email/password login can use Supabase when the user enters a real email and a non-demo password.
- Create account calls Supabase Auth signup, with local alpha fallback if email confirmation is required.
- Custom collection membership now syncs to `vault_collection_items` instead of relying only on `client_payload`.
- RLS policies for all `vault_*` tables are scoped to `authenticated` and `auth.uid() = user_id`.
- The private `vault-assets` bucket allows JPG, PNG, WebP, MP4, and WebM up to 10MB.

## Handoff Docs

- `outputs/a-plus-vault/docs/architecture.md`
- `outputs/a-plus-vault/docs/data-model.md`
- `outputs/a-plus-vault/docs/product-memory.md`
- `outputs/a-plus-vault/docs/launch-readiness-plan.md`
- `outputs/a-plus-vault/docs/next-implementation-order.md`
- `outputs/a-plus-vault/docs/supabase-live-sync.md`
- `outputs/a-plus-vault/docs/vercel-preview-deploy.md`
