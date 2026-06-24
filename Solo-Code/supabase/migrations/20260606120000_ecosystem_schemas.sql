-- Unified So1o + an1hem: schema namespaces on rvnzjiskqliexysicfmh
-- shared = identity/billing/wallet/chat | anthem = showcase/social | so1o = back-office

CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS anthem;
CREATE SCHEMA IF NOT EXISTS so1o;

GRANT USAGE ON SCHEMA shared TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA anthem TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA so1o   TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA so1o   GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA so1o   GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA so1o   GRANT ALL ON FUNCTIONS TO service_role;

COMMENT ON SCHEMA shared IS 'Cross-app: profiles (public), wallet, contracts, ecosystem notifications';
COMMENT ON SCHEMA anthem IS 'an1hem showcase: projects, studios, jobs, feed';
COMMENT ON SCHEMA so1o   IS 'So1o My Desk: finance, quotations, dashboard (tables migrate here over time)';
