-- Phase 2 step 1: Create empty schemas for the unified Anthem ↔ So1o backend.
-- No tables are created yet. We only stage the namespaces and grant the
-- PostgREST roles permission to USE them. Tables will be added later as we
-- migrate features in (contracts → shared, etc).

CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS anthem;
CREATE SCHEMA IF NOT EXISTS so1o;

-- Allow PostgREST roles to traverse the schemas (required before any future
-- table-level GRANTs will work via the Data API).
GRANT USAGE ON SCHEMA shared TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA anthem TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA so1o   TO anon, authenticated, service_role;

-- Default privileges: any future table created in these schemas by the
-- postgres role will automatically grant the right baseline to service_role.
-- We intentionally do NOT set defaults for anon/authenticated — each new
-- table must opt-in explicitly with its own GRANT alongside its RLS policies.
ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA so1o   GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA so1o   GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA so1o   GRANT ALL ON FUNCTIONS TO service_role;

COMMENT ON SCHEMA shared IS 'Cross-app entities used by both Anthem and So1o (contracts, notifications, wallet ledger).';
COMMENT ON SCHEMA anthem IS 'Anthem-only entities (portfolio projects, collections, studios, inspire boards).';
COMMENT ON SCHEMA so1o   IS 'So1o-only entities (quotes, invoices, clients, freelancer workflow).';