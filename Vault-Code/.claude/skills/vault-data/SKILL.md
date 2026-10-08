---
name: vault-data
description: Change data model, Supabase tables/RLS/storage, items, collections, projects, auth, or sync. Use for database, schema, Supabase, sync, upload, or permission requests.
---
# Vault data
- Source of truth: `vault_items` (type: image|video|link|note). Related: `vault_item_analysis`, `vault_collections`, `vault_collection_items`, `vault_projects`, `vault_boards`, `vault_board_objects`, `vault_board_shares`, `vault_extension_captures`, `discover_items`.
- Always store relations to the original item; never duplicate objects.
- New migration = new `outputs/a-plus-vault/supabase-<name>.sql` (idempotent). Don't edit applied migrations. Update `docs/data-model.md`.
- RLS: every vault_* table scoped `auth.uid() = user_id`. Public sharing only via explicit share rows/tokens.
- Storage: private bucket `vault-assets` (JPG/PNG/WebP/MP4/WebM, <=10MB), prefer signed URLs; public catalog bucket `discover-media`.
- Client adapter: `modules/supabase-adapter.js`. Server: `api/vault/*`, `lib/*.mjs`. Service-role key only in server env, never in client/extension/commits.
- Never run SQL or change live data without telling the user first. Run `npm run check` and tests in `scripts/__tests__`.
