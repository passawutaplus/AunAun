# Schema Reorganize Plan — Anthem ↔ So1o

> **In progress** on `rvnzjiskqliexysicfmh` — see `Solo-Code/supabase/ECOSYSTEM.md` for applied steps.
> See `.lovable/plan.md` for the full 5-phase roadmap. This document
> defines **where each table lives** so every later migration is
> deterministic.

## Target schemas (single Supabase project)

| Schema   | Purpose                                                 | Who reads |
|----------|---------------------------------------------------------|-----------|
| `shared` | Identity, money, contracts, notifications, contacts.    | Both apps |
| `anthem` | Public/social: portfolio, feed, ads, follows, likes.    | Anthem    |
| `so1o`   | Private business tools: quotes, invoices, clients, etc. | So1o      |
| `public` | Postgres default — kept empty after migration, except for `pgvector` extension helpers and Supabase-managed objects. |

## Table placement (from current `public` schema)

### → `shared`
- `profiles`
- `user_roles`
- `wallets`, `wallet_topups`, `cashout_requests`
- `gifts`, `gift_transactions`
- `contracts` (currently in `public`)
- `admin_audit_log`
- `conversations`, `messages` (cross-app chat)
- `shared.notifications` / `ecosystem_notifications` (shipped)
- `contacts` (lightweight client book shared by both)

### → `anthem`
- `projects`, `project_likes`, `project_comments`, `project_views`, `project_bookmarks`
- `collections`, `collection_items`
- `inspire_boards`, `inspire_items`
- `follows`
- `image_likes`, `image_shares`
- `ad_applications`, `ad_campaigns`, `ad_events`
- `collab_requests`, `hiring_requests`
- `studios`, `studio_members`, `studio_formation_requests`, `studio_formation_invites`
- `job_posts`, `job_applications`, `job_match_notifications`

### → `so1o` (created fresh in Phase 2, imported from current So1o project)
- `quotes`, `quote_items`
- `invoices`, `invoice_items`, `payments`
- `clients_extended` (business details: tax id, address, billing email)
- `tasks`, `milestones`, `time_entries`
- `expenses`, `tax_records`

## Cross-schema rules

1. **Foreign keys across schemas are allowed**, e.g.
   `so1o.quotes.client_user_id → shared.profiles.id`.
2. **Security-definer functions** must explicitly
   `SET search_path = shared, anthem, so1o, public` to prevent privilege
   escalation via search_path injection.
3. **PostgREST exposure**: only `shared`, `anthem`, `so1o` are exposed
   per app via Supabase Dashboard → API Settings. Each frontend uses a
   client configured to its primary schema; cross-schema reads go
   through RPC.
4. **GRANTs**: every new table gets explicit
   `GRANT ... TO authenticated, service_role` and (only when policies
   allow) `anon`.
5. **Storage**: single bucket `project-media` on the Anthem Supabase
   project. Path convention `<app>/<user_id>/<folder>/<file>`.

## What stays in `public`

- `pgvector` operators and helper functions (the giant block of
  `halfvec_*` / `vector_*` definitions). These are extension-owned.
- Supabase-managed tables/extensions.

## Migration ordering (Phase 2)

1. Create schemas, GRANT usage to `authenticated`, `anon`, `service_role`.
2. `ALTER TABLE public.<t> SET SCHEMA <target>` for each app table.
3. Recreate all RLS policies and security-definer functions with the
   correct `search_path`.
4. Update `src/integrations/supabase/client.ts` consumers — any code
   that uses bare `from("table_name")` keeps working because
   PostgREST resolves via the client's configured schema. Code that
   reaches across schemas switches to RPC.
5. Regenerate `src/integrations/supabase/types.ts`.
6. Smoke-test every Anthem page + edge function.

## Out of scope for this document

- The actual data-export/import script for So1o's existing Supabase.
- Auth-merge UX (handled in Phase 2 user-remap section of the plan).
- Monorepo packaging (Phase 5).
