-- ============================================================================
-- DRAFT: SAMECOR Growth Engine, Phase 1 schema (`growth`).
-- NOT APPLIED. The owner reviews this first and applies it by hand. Never from CI.
-- Docs: Anthem-Code/docs/growth-engine/04-workflow-database.md
--
-- What it enforces in the database (same rules as Anthem-Code/src/lib/growth/engine.ts):
--   * campaign status changes follow ge_status_transitions (no skipped steps)
--   * versions, asset versions, platform variants, approvals, playbooks, costs and
--     the audit log are append-only; content_hash is computed here (sha256)
--   * approvals bind a platform variant hash; a new variant with a different hash
--     revokes scheduled jobs for that platform; only a signed-in admin can approve
--   * Pause All blocks every dispatch and every agent claim
--   * when the monthly AI credit runs out, AI tasks become BLOCKED_BUDGET (one LINE
--     notice per cycle) and come back on the next cycle. Nothing buys more credit.
--   * RLS: admins only. Agents and the publisher run as service_role.
--
-- Not in this file on purpose (the repo is public): prompts, editorial strategy,
-- the monthly cap, account handles, tokens. Those are rows/secrets the owner adds.
-- After applying: Settings -> API -> Exposed schemas: add `growth`.
-- ============================================================================

DO $guard$
BEGIN
  IF to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'public.has_role(uuid, app_role) is missing';
  END IF;
END
$guard$;

CREATE SCHEMA IF NOT EXISTS growth;
REVOKE ALL ON SCHEMA growth FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA growth TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION growth.ge_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(public.has_role(auth.uid(), 'admin'), false);
$$;
REVOKE ALL ON FUNCTION growth.ge_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION growth.ge_is_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION growth.ge_sha256(_v jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(sha256(convert_to(COALESCE(_v, 'null'::jsonb)::text, 'UTF8')), 'hex');
$$;

CREATE OR REPLACE FUNCTION growth.ge_forbid_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'APPEND_ONLY: % rows cannot be changed or deleted', TG_TABLE_NAME;
END;
$$;

-- ---------------------------------------------------------------------------
-- Settings (one row) + audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS growth.ge_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode text NOT NULL DEFAULT 'mock' CHECK (mode IN ('mock', 'test', 'live')),
  pause_all boolean NOT NULL DEFAULT false,
  pause_reason text,
  vacation_mode boolean NOT NULL DEFAULT false,
  -- Monthly AI credit included with the owner's plan. The cap is set by the owner in the
  -- dashboard; NULL = not set. Never auto-reload, never buy more.
  ai_credit_status text NOT NULL DEFAULT 'UNKNOWN' CHECK (ai_credit_status IN ('UNKNOWN', 'AVAILABLE', 'LOW', 'EXHAUSTED')),
  ai_credit_cycle_start date,
  ai_monthly_cap_usd numeric(10, 2) CHECK (ai_monthly_cap_usd IS NULL OR ai_monthly_cap_usd >= 0),
  ai_spent_estimate_usd numeric(12, 4) NOT NULL DEFAULT 0 CHECK (ai_spent_estimate_usd >= 0),
  -- One LINE notice per cycle when credit runs out. The notifier clears *_pending after sending.
  ai_budget_notice_cycle date,
  ai_budget_notice_pending boolean NOT NULL DEFAULT false,
  magnific_credit_status text NOT NULL DEFAULT 'UNKNOWN' CHECK (magnific_credit_status IN ('UNKNOWN', 'AVAILABLE', 'LOW', 'EXHAUSTED')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO growth.ge_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS growth.ge_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_kind text NOT NULL CHECK (actor_kind IN ('owner', 'agent', 'system')),
  actor_id text,
  action text NOT NULL,
  resource text NOT NULL,
  old_version integer,
  new_version integer,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS ge_audit_logs_at_idx ON growth.ge_audit_logs (at DESC);
CREATE INDEX IF NOT EXISTS ge_audit_logs_resource_idx ON growth.ge_audit_logs (resource, at DESC);

CREATE OR REPLACE FUNCTION growth.ge_audit(_action text, _resource text, _detail jsonb DEFAULT '{}'::jsonb, _old integer DEFAULT NULL, _new integer DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  INSERT INTO growth.ge_audit_logs (actor_kind, actor_id, action, resource, old_version, new_version, detail)
  VALUES (CASE WHEN v_uid IS NULL THEN 'system' ELSE 'owner' END, v_uid::text, _action, _resource, _old, _new, COALESCE(_detail, '{}'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION growth.ge_audit(text, text, jsonb, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION growth.ge_audit(text, text, jsonb, integer, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- Versioned playbooks: prompts, editorial strategy, brand rules, CTA library.
-- Content is written by the owner after applying (not in this public repo).
-- The active one is the highest approved version per (kind, key).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS growth.ge_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('prompt', 'editorial_strategy', 'brand_rules', 'cta_library')),
  key text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  body jsonb NOT NULL,
  content_hash text NOT NULL DEFAULT '',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, key, version)
);

-- ---------------------------------------------------------------------------
-- Research
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS growth.ge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  canonical_url text NOT NULL UNIQUE,
  title text,
  source_type text NOT NULL CHECK (source_type IN ('news', 'institution', 'open_call', 'social', 'search', 'internal', 'other')),
  access_policy text NOT NULL DEFAULT 'public' CHECK (access_policy IN ('public', 'api', 'licensed', 'manual')),
  credibility smallint CHECK (credibility BETWEEN 0 AND 100),
  published_at timestamptz,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS growth.ge_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ids uuid[] NOT NULL DEFAULT '{}',
  title text NOT NULL,
  summary text,
  published_at timestamptz,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  score smallint CHECK (score BETWEEN 0 AND 100),
  risk text NOT NULL DEFAULT 'low' CHECK (risk IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'SIGNAL_FOUND' CHECK (status IN ('SIGNAL_FOUND', 'NEEDS_VERIFY', 'VERIFIED', 'PROPOSED', 'REJECTED', 'ARCHIVED')),
  dedupe_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Campaign state machine
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS growth.ge_status_transitions (
  from_status text NOT NULL,
  to_status text NOT NULL,
  PRIMARY KEY (from_status, to_status)
);
-- Mirrors TRANSITIONS in Anthem-Code/src/lib/growth/engine.ts (a vitest test keeps them equal).
INSERT INTO growth.ge_status_transitions (from_status, to_status) VALUES
  ('SIGNAL_FOUND', 'VERIFIED'), ('SIGNAL_FOUND', 'NEEDS_VERIFY'), ('SIGNAL_FOUND', 'ARCHIVED'),
  ('NEEDS_VERIFY', 'VERIFIED'), ('NEEDS_VERIFY', 'QC_PASSED'), ('NEEDS_VERIFY', 'REGENERATING'), ('NEEDS_VERIFY', 'ARCHIVED'),
  ('VERIFIED', 'PROPOSED'), ('VERIFIED', 'ARCHIVED'),
  ('PROPOSED', 'BRIEF_APPROVED'), ('PROPOSED', 'REJECTED'), ('PROPOSED', 'ARCHIVED'),
  ('BRIEF_APPROVED', 'DRAFTING'), ('BRIEF_APPROVED', 'PAUSED'),
  ('DRAFTING', 'VISUAL_READY'), ('DRAFTING', 'NEEDS_VERIFY'), ('DRAFTING', 'PAUSED'),
  ('VISUAL_READY', 'ADAPTED'), ('VISUAL_READY', 'PAUSED'),
  ('ADAPTED', 'QC_PASSED'), ('ADAPTED', 'NEEDS_VERIFY'), ('ADAPTED', 'REGENERATING'),
  ('QC_PASSED', 'AWAITING_APPROVAL'),
  ('AWAITING_APPROVAL', 'APPROVED'), ('AWAITING_APPROVAL', 'CHANGES_REQUESTED'), ('AWAITING_APPROVAL', 'REJECTED'), ('AWAITING_APPROVAL', 'PAUSED'),
  ('CHANGES_REQUESTED', 'REGENERATING'),
  ('REGENERATING', 'QC_PASSED'), ('REGENERATING', 'NEEDS_VERIFY'),
  ('APPROVED', 'SCHEDULED'), ('APPROVED', 'CHANGES_REQUESTED'), ('APPROVED', 'PAUSED'), ('APPROVED', 'EXPORTED_FOR_MANUAL_POST'), ('APPROVED', 'REJECTED'),
  ('SCHEDULED', 'PUBLISHING'), ('SCHEDULED', 'CHANGES_REQUESTED'), ('SCHEDULED', 'PAUSED'), ('SCHEDULED', 'EXPORTED_FOR_MANUAL_POST'), ('SCHEDULED', 'REJECTED'),
  ('PUBLISHING', 'PUBLISHED'), ('PUBLISHING', 'PUBLISH_FAILED'),
  ('PUBLISH_FAILED', 'SCHEDULED'), ('PUBLISH_FAILED', 'ARCHIVED'),
  ('EXPORTED_FOR_MANUAL_POST', 'PUBLISHED'), ('EXPORTED_FOR_MANUAL_POST', 'ARCHIVED'),
  ('PUBLISHED', 'MONITORING'),
  ('MONITORING', 'LEARNED'),
  ('LEARNED', 'ARCHIVED'),
  ('PAUSED', 'BRIEF_APPROVED'), ('PAUSED', 'DRAFTING'), ('PAUSED', 'VISUAL_READY'), ('PAUSED', 'AWAITING_APPROVAL'), ('PAUSED', 'APPROVED'), ('PAUSED', 'SCHEDULED'),
  ('REJECTED', 'ARCHIVED')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS growth.ge_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  pillar text NOT NULL,
  goal text NOT NULL,
  audience text,
  cta jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'SIGNAL_FOUND' CHECK (status IN (
    'SIGNAL_FOUND', 'VERIFIED', 'PROPOSED', 'BRIEF_APPROVED', 'DRAFTING', 'VISUAL_READY', 'ADAPTED', 'QC_PASSED',
    'AWAITING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'MONITORING', 'LEARNED',
    'NEEDS_VERIFY', 'CHANGES_REQUESTED', 'REGENERATING', 'REJECTED', 'PAUSED', 'PUBLISH_FAILED',
    'EXPORTED_FOR_MANUAL_POST', 'ARCHIVED')),
  paused_from text,
  signal_id uuid REFERENCES growth.ge_signals (id) ON DELETE SET NULL,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ge_campaigns_status_idx ON growth.ge_campaigns (status);

-- One immutable bundle per version: manifest = {component_key: hash, ...}, change summary, QC.
CREATE TABLE IF NOT EXISTS growth.ge_campaign_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES growth.ge_campaigns (id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  manifest jsonb NOT NULL,
  change_summary jsonb,
  qc jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_kind text NOT NULL CHECK (created_by_kind IN ('agent', 'owner', 'system')),
  created_by text,
  agent_run_id uuid,
  content_hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, version)
);

CREATE TABLE IF NOT EXISTS growth.ge_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES growth.ge_campaigns (id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  research_refs uuid[] NOT NULL DEFAULT '{}',
  creative_direction jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, version)
);

CREATE TABLE IF NOT EXISTS growth.ge_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES growth.ge_campaigns (id) ON DELETE RESTRICT,
  parent_id uuid REFERENCES growth.ge_assets (id) ON DELETE SET NULL,
  component_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('frame', 'pin', 'hero', 'diagram', 'video', 'other')),
  provider text NOT NULL CHECK (provider IN ('magnific_mcp_worker', 'magnific_api', 'manual_upload', 'renderer', 'mock')),
  rights_status text NOT NULL DEFAULT 'PENDING' CHECK (rights_status IN ('OK', 'PENDING', 'NOT_NEEDED', 'REVOKED')),
  rights_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, component_key)
);

-- file_sha256 = hash of the stored file bytes (computed by the uploader); generation = prompt,
-- model, generation id, credits. content_hash covers both.
CREATE TABLE IF NOT EXISTS growth.ge_asset_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES growth.ge_assets (id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  file_path text,
  file_sha256 text,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  generation jsonb NOT NULL DEFAULT '{}'::jsonb,
  qc jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, version)
);

-- What one platform shows for one campaign version. payload = caption, hashtags, CTA, canvas,
-- asset version ids + hashes, text components. Approvals bind content_hash.
CREATE TABLE IF NOT EXISTS growth.ge_platform_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES growth.ge_campaigns (id) ON DELETE RESTRICT,
  campaign_version_id uuid NOT NULL REFERENCES growth.ge_campaign_versions (id) ON DELETE RESTRICT,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook', 'threads', 'pinterest', 'blog', 'tiktok', 'lemon8', 'pantip')),
  payload jsonb NOT NULL,
  scheduled_slot timestamptz,
  content_hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_version_id, platform)
);
CREATE INDEX IF NOT EXISTS ge_platform_variants_campaign_idx ON growth.ge_platform_variants (campaign_id, platform);

CREATE TABLE IF NOT EXISTS growth.ge_locks (
  campaign_id uuid NOT NULL REFERENCES growth.ge_campaigns (id) ON DELETE CASCADE,
  component_key text NOT NULL,
  locked_by uuid,
  locked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, component_key)
);

-- ---------------------------------------------------------------------------
-- Approvals, comments, revisions, owner decisions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS growth.ge_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES growth.ge_campaigns (id) ON DELETE RESTRICT,
  campaign_version_id uuid NOT NULL REFERENCES growth.ge_campaign_versions (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DECIDED', 'SUPERSEDED')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

-- Append-only. Validity = the latest decision for (campaign, platform, hash) is APPROVED and that
-- hash is the platform's hash in the latest version. Same hash in a later version keeps approval.
CREATE TABLE IF NOT EXISTS growth.ge_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid REFERENCES growth.ge_approval_requests (id) ON DELETE RESTRICT,
  campaign_id uuid NOT NULL REFERENCES growth.ge_campaigns (id) ON DELETE RESTRICT,
  platform_variant_id uuid NOT NULL REFERENCES growth.ge_platform_variants (id) ON DELETE RESTRICT,
  platform text NOT NULL,
  approved_hash text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'REVOKED')),
  approver_id uuid NOT NULL,
  note text,
  decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ge_approvals_lookup_idx ON growth.ge_approvals (campaign_id, platform, approved_hash, decided_at DESC);

CREATE TABLE IF NOT EXISTS growth.ge_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES growth.ge_campaigns (id) ON DELETE CASCADE,
  campaign_version_id uuid NOT NULL REFERENCES growth.ge_campaign_versions (id) ON DELETE RESTRICT,
  scope text NOT NULL CHECK (scope IN ('CAMPAIGN', 'IMAGE_FRAME', 'COPY_CHANNEL', 'SEO_SECTION', 'FEED')),
  target_key text,
  -- Image hotspot as normalized [0,1] rect, text range + stable section id, or feed tile ids.
  anchor_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  author_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED_BY_AI', 'NEEDS_OWNER_DECISION', 'REOPENED')),
  resolved_in_version_id uuid REFERENCES growth.ge_campaign_versions (id) ON DELETE SET NULL,
  ai_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS growth.ge_revision_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES growth.ge_campaigns (id) ON DELETE CASCADE,
  comment_ids uuid[] NOT NULL,
  scope text NOT NULL CHECK (scope IN ('CAMPAIGN', 'IMAGE_FRAME', 'COPY_CHANNEL', 'SEO_SECTION', 'FEED')),
  from_version integer NOT NULL,
  to_version integer,
  impact_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'DONE', 'NEEDS_OWNER_DECISION', 'FAILED', 'BLOCKED_BUDGET')),
  task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- "Needs Decision" items that are not a campaign status (rights, sources, risky comments, setup).
CREATE TABLE IF NOT EXISTS growth.ge_owner_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('source', 'rights', 'risk', 'budget', 'setup', 'strategy')),
  subject_type text,
  subject_id uuid,
  title text NOT NULL,
  detail text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  decided_option text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Publishing (Phase 1–3: manual export only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS growth.ge_publish_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES growth.ge_campaigns (id) ON DELETE RESTRICT,
  platform text NOT NULL,
  platform_variant_id uuid NOT NULL REFERENCES growth.ge_platform_variants (id) ON DELETE RESTRICT,
  variant_hash text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  -- campaign_id:platform:vN:YYYY-MM-DDTHH:MMZ (UTC, never local time)
  idempotency_key text NOT NULL UNIQUE,
  adapter text NOT NULL DEFAULT 'manual_export' CHECK (adapter IN ('manual_export', 'meta', 'threads', 'pinterest', 'tiktok')),
  status text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN (
    'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PUBLISH_FAILED', 'PUBLISH_STATUS_UNKNOWN',
    'EXPORTED_FOR_MANUAL_POST', 'REVOKED', 'CANCELLED')),
  claimed_by text,
  lease_until timestamptz,
  retry_count smallint NOT NULL DEFAULT 0 CHECK (retry_count BETWEEN 0 AND 2),
  last_error text,
  last_block_reason text,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- One live job per campaign + platform + slot, whatever the version.
CREATE UNIQUE INDEX IF NOT EXISTS ge_publish_jobs_one_live_slot
  ON growth.ge_publish_jobs (campaign_id, platform, scheduled_at)
  WHERE status NOT IN ('REVOKED', 'CANCELLED');
CREATE INDEX IF NOT EXISTS ge_publish_jobs_due_idx ON growth.ge_publish_jobs (scheduled_at) WHERE status = 'SCHEDULED';

-- No fake success: a row exists only for a real export/post; simulated = true while mode = 'mock'.
CREATE TABLE IF NOT EXISTS growth.ge_post_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES growth.ge_publish_jobs (id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('manual_export', 'api')),
  simulated boolean NOT NULL,
  remote_id text,
  post_url text,
  published_at timestamptz,
  reconcile_status text NOT NULL DEFAULT 'MANUAL_PENDING' CHECK (reconcile_status IN ('CONFIRMED', 'UNKNOWN', 'FAILED', 'MANUAL_PENDING')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ge_post_publications_remote_idx ON growth.ge_post_publications (remote_id) WHERE remote_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Feedback + analytics (UNAVAILABLE is a value, never a guess)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS growth.ge_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES growth.ge_post_publications (id) ON DELETE CASCADE,
  platform text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric,
  availability text NOT NULL CHECK (availability IN ('AVAILABLE', 'UNAVAILABLE', 'NOT_PERMITTED')),
  window_label text NOT NULL CHECK (window_label IN ('24h', '72h', '7d', 'weekly')),
  captured_at timestamptz NOT NULL DEFAULT now(),
  CHECK (availability = 'AVAILABLE' OR metric_value IS NULL)
);

-- PII minimization: redacted text only, expires after 90 days.
CREATE TABLE IF NOT EXISTS growth.ge_social_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES growth.ge_post_publications (id) ON DELETE CASCADE,
  provider_comment_id text NOT NULL,
  redacted_text text,
  category text CHECK (category IN ('praise', 'faq', 'product_feedback', 'opportunity', 'criticism', 'risk', 'spam')),
  risk text NOT NULL DEFAULT 'none' CHECK (risk IN ('none', 'low', 'high')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, provider_comment_id)
);

CREATE TABLE IF NOT EXISTS growth.ge_funnel_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN (
    'marketing_landing_view', 'creator_signup_completed', 'creator_profile_completed',
    'first_project_published', 'marketing_cta_clicked', 'event_listing_opened', 'campaign_invite_accepted')),
  campaign_id uuid REFERENCES growth.ge_campaigns (id) ON DELETE SET NULL,
  content_id text,
  platform text,
  pseudonymous_user_id text,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_scope text NOT NULL DEFAULT 'essential',
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ge_funnel_events_campaign_idx ON growth.ge_funnel_events (campaign_id, event_type, occurred_at);

CREATE TABLE IF NOT EXISTS growth.ge_learning_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week date NOT NULL UNIQUE,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  hypotheses jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_tests jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- at most 3 decisions: Keep / Improve / Stop / Test Next
  owner_decision jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS growth.ge_brand_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe text NOT NULL CHECK (recipe ~ '^R0[1-9]$'),
  version integer NOT NULL CHECK (version > 0),
  layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  color_tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  font_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipe, version)
);

-- Tokens never live here: token_secret_ref is the *name* of a Supabase Vault/Edge secret.
CREATE TABLE IF NOT EXISTS growth.ge_provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('anthropic', 'magnific', 'meta', 'threads', 'pinterest', 'tiktok', 'line')),
  account_ref text,
  scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'NOT_CONNECTED' CHECK (status IN ('NOT_CONNECTED', 'CONNECTED', 'ACTION_REQUIRED', 'DISABLED')),
  token_secret_ref text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, account_ref)
);

-- ---------------------------------------------------------------------------
-- Agent coordination: queue with lease/lock, dependencies, idempotency, runs, costs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS growth.ge_agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('research', 'strategy', 'copy', 'seo', 'art_director', 'revision', 'qa', 'analytics', 'publisher')),
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'CLAIMED', 'RUNNING', 'DONE', 'FAILED', 'BLOCKED_BUDGET', 'CANCELLED')),
  uses_ai boolean NOT NULL,
  priority smallint NOT NULL DEFAULT 100,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  campaign_id uuid REFERENCES growth.ge_campaigns (id) ON DELETE CASCADE,
  depends_on uuid[] NOT NULL DEFAULT '{}',
  idempotency_key text NOT NULL UNIQUE,
  claimed_by text,
  lease_until timestamptz,
  attempts smallint NOT NULL DEFAULT 0,
  max_attempts smallint NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 5),
  run_after timestamptz NOT NULL DEFAULT now(),
  blocked_reason text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS ge_agent_tasks_ready_idx ON growth.ge_agent_tasks (priority, created_at) WHERE status IN ('QUEUED', 'CLAIMED', 'RUNNING');

CREATE TABLE IF NOT EXISTS growth.ge_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES growth.ge_agent_tasks (id) ON DELETE CASCADE,
  role text NOT NULL,
  model text,
  prompt_playbook_id uuid REFERENCES growth.ge_playbooks (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED', 'BLOCKED_BUDGET')),
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6),
  request_id text,
  error text,
  output jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS growth.ge_usage_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES growth.ge_agent_runs (id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('anthropic', 'magnific', 'other')),
  campaign_id uuid REFERENCES growth.ge_campaigns (id) ON DELETE SET NULL,
  estimated_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  billed_cost_usd numeric(12, 6),
  credits numeric(14, 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Triggers: hashes, append-only, versions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION growth.ge_set_content_hash()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Computed here, whatever the client sent. (IF, not CASE: each branch may only touch its own table's columns.)
  IF TG_TABLE_NAME = 'ge_campaign_versions' THEN
    NEW.content_hash := growth.ge_sha256(NEW.manifest);
  ELSIF TG_TABLE_NAME = 'ge_briefs' THEN
    NEW.content_hash := growth.ge_sha256(jsonb_build_object('research_refs', to_jsonb(NEW.research_refs), 'creative_direction', NEW.creative_direction, 'seo_plan', NEW.seo_plan));
  ELSIF TG_TABLE_NAME = 'ge_asset_versions' THEN
    NEW.content_hash := growth.ge_sha256(jsonb_build_object('file_sha256', NEW.file_sha256, 'file_path', NEW.file_path, 'dimensions', NEW.dimensions, 'generation', NEW.generation));
  ELSIF TG_TABLE_NAME = 'ge_platform_variants' THEN
    NEW.content_hash := growth.ge_sha256(jsonb_build_object('platform', NEW.platform, 'payload', NEW.payload, 'scheduled_slot', to_jsonb(NEW.scheduled_slot)));
  ELSIF TG_TABLE_NAME = 'ge_playbooks' THEN
    NEW.content_hash := growth.ge_sha256(NEW.body);
  ELSIF TG_TABLE_NAME = 'ge_brand_templates' THEN
    NEW.content_hash := growth.ge_sha256(jsonb_build_object('layout_config', NEW.layout_config, 'color_tokens', NEW.color_tokens, 'font_refs', NEW.font_refs));
  ELSE
    RAISE EXCEPTION 'ge_set_content_hash: unexpected table %', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

DO $hash$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ge_campaign_versions', 'ge_briefs', 'ge_asset_versions', 'ge_platform_variants', 'ge_playbooks', 'ge_brand_templates']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON growth.%I', t || '_hash', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON growth.%I FOR EACH ROW EXECUTE FUNCTION growth.ge_set_content_hash()', t || '_hash', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['ge_campaign_versions', 'ge_briefs', 'ge_asset_versions', 'ge_platform_variants', 'ge_playbooks',
                           'ge_brand_templates', 'ge_approvals', 'ge_audit_logs', 'ge_usage_costs', 'ge_status_transitions']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON growth.%I', t || '_append_only', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON growth.%I FOR EACH ROW EXECUTE FUNCTION growth.ge_forbid_change()', t || '_append_only', t);
  END LOOP;
END
$hash$;

-- Versions are numbered 1, 2, 3… per campaign with no gaps (row lock prevents races).
CREATE OR REPLACE FUNCTION growth.ge_next_version_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_max integer;
BEGIN
  PERFORM 1 FROM growth.ge_campaigns WHERE id = NEW.campaign_id FOR UPDATE;
  SELECT COALESCE(max(version), 0) INTO v_max FROM growth.ge_campaign_versions WHERE campaign_id = NEW.campaign_id;
  IF NEW.version <> v_max + 1 THEN
    RAISE EXCEPTION 'VERSION_GAP: expected v%, got v%', v_max + 1, NEW.version;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ge_campaign_versions_next ON growth.ge_campaign_versions;
CREATE TRIGGER ge_campaign_versions_next BEFORE INSERT ON growth.ge_campaign_versions
  FOR EACH ROW EXECUTE FUNCTION growth.ge_next_version_guard();

-- ---------------------------------------------------------------------------
-- Approval rules
-- ---------------------------------------------------------------------------
-- Latest decision for this exact hash is APPROVED.
CREATE OR REPLACE FUNCTION growth.ge_hash_approved(_campaign uuid, _platform text, _hash text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT a.decision = 'APPROVED'
    FROM growth.ge_approvals a
    WHERE a.campaign_id = _campaign AND a.platform = _platform AND a.approved_hash = _hash
    ORDER BY a.decided_at DESC, a.id DESC
    LIMIT 1
  ), false);
$$;

-- The platform's hash in the campaign's latest version (NULL if the platform is not in it).
CREATE OR REPLACE FUNCTION growth.ge_latest_variant_hash(_campaign uuid, _platform text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT pv.content_hash
  FROM growth.ge_platform_variants pv
  JOIN growth.ge_campaign_versions cv ON cv.id = pv.campaign_version_id
  WHERE pv.campaign_id = _campaign AND pv.platform = _platform
    AND cv.version = (SELECT max(version) FROM growth.ge_campaign_versions WHERE campaign_id = _campaign)
  LIMIT 1;
$$;

-- Only a signed-in admin can approve. Agents (service_role, no auth.uid()) cannot.
CREATE OR REPLACE FUNCTION growth.ge_approval_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = growth, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_variant growth.ge_platform_variants;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'OWNER_ONLY: approvals come from a signed-in admin, never from an agent';
  END IF;
  SELECT * INTO v_variant FROM growth.ge_platform_variants WHERE id = NEW.platform_variant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'UNKNOWN_VARIANT';
  END IF;
  IF NEW.approved_hash IS DISTINCT FROM v_variant.content_hash THEN
    RAISE EXCEPTION 'HASH_MISMATCH: approve what you saw, the content has changed';
  END IF;
  IF NEW.decision = 'APPROVED' AND v_variant.content_hash IS DISTINCT FROM growth.ge_latest_variant_hash(v_variant.campaign_id, v_variant.platform) THEN
    RAISE EXCEPTION 'STALE_VERSION: a newer version exists for %', v_variant.platform;
  END IF;
  NEW.approver_id := v_uid;
  NEW.campaign_id := v_variant.campaign_id;
  NEW.platform := v_variant.platform;
  NEW.decided_at := now();
  PERFORM growth.ge_audit('approval.' || lower(NEW.decision), 'campaign:' || NEW.campaign_id,
    jsonb_build_object('platform', NEW.platform, 'hash', NEW.approved_hash));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ge_approvals_guard ON growth.ge_approvals;
CREATE TRIGGER ge_approvals_guard BEFORE INSERT ON growth.ge_approvals
  FOR EACH ROW EXECUTE FUNCTION growth.ge_approval_guard();

-- Campaign status: allowed transitions only; APPROVED needs every platform of the latest version.
CREATE OR REPLACE FUNCTION growth.ge_campaign_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM growth.ge_status_transitions WHERE from_status = OLD.status AND to_status = NEW.status) THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: % -> %', OLD.status, NEW.status;
  END IF;
  IF NEW.status = 'APPROVED' AND EXISTS (
    SELECT 1
    FROM growth.ge_platform_variants pv
    JOIN growth.ge_campaign_versions cv ON cv.id = pv.campaign_version_id
    WHERE pv.campaign_id = NEW.id
      AND cv.version = (SELECT max(version) FROM growth.ge_campaign_versions WHERE campaign_id = NEW.id)
      AND NOT growth.ge_hash_approved(NEW.id, pv.platform, pv.content_hash)
  ) THEN
    RAISE EXCEPTION 'NOT_ALL_PLATFORMS_APPROVED';
  END IF;
  NEW.paused_from := CASE WHEN NEW.status = 'PAUSED' THEN OLD.status ELSE NULL END;
  PERFORM growth.ge_audit('status.change', 'campaign:' || NEW.id, jsonb_build_object('from', OLD.status, 'to', NEW.status));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ge_campaigns_status_guard ON growth.ge_campaigns;
CREATE TRIGGER ge_campaigns_status_guard BEFORE UPDATE ON growth.ge_campaigns
  FOR EACH ROW EXECUTE FUNCTION growth.ge_campaign_status_guard();

-- A new variant with a different hash revokes scheduled jobs for that platform.
CREATE OR REPLACE FUNCTION growth.ge_revoke_stale_jobs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
BEGIN
  UPDATE growth.ge_publish_jobs
     SET status = 'REVOKED', last_block_reason = 'STALE_APPROVAL', updated_at = now()
   WHERE campaign_id = NEW.campaign_id AND platform = NEW.platform
     AND status = 'SCHEDULED' AND variant_hash <> NEW.content_hash;
  IF FOUND THEN
    PERFORM growth.ge_audit('job.revoked', 'campaign:' || NEW.campaign_id, jsonb_build_object('platform', NEW.platform, 'new_hash', NEW.content_hash));
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS ge_platform_variants_revoke ON growth.ge_platform_variants;
CREATE TRIGGER ge_platform_variants_revoke AFTER INSERT ON growth.ge_platform_variants
  FOR EACH ROW EXECUTE FUNCTION growth.ge_revoke_stale_jobs();

-- ---------------------------------------------------------------------------
-- Publish guard: approval hash at scheduling; + Pause All at dispatch
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION growth.ge_publish_job_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
DECLARE
  v_variant growth.ge_platform_variants;
  v_status text;
  v_dispatch boolean;
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('REVOKED', 'CANCELLED', 'PUBLISHED') THEN
    RAISE EXCEPTION 'JOB_CLOSED: % jobs cannot move; schedule a new job', OLD.status;
  END IF;
  -- Leaving PUBLISH_STATUS_UNKNOWN needs a reconcile result first (no blind retry).
  IF TG_OP = 'UPDATE' AND OLD.status = 'PUBLISH_STATUS_UNKNOWN' AND NEW.status NOT IN ('PUBLISHED', 'PUBLISH_FAILED') THEN
    RAISE EXCEPTION 'NEEDS_RECONCILE';
  END IF;
  -- Only these need the checks below; moving to REVOKED/CANCELLED/FAILED/UNKNOWN/PUBLISHED does not.
  IF NEW.status NOT IN ('SCHEDULED', 'PUBLISHING', 'EXPORTED_FOR_MANUAL_POST') THEN
    RETURN NEW;
  END IF;
  v_dispatch := NEW.status IN ('PUBLISHING', 'EXPORTED_FOR_MANUAL_POST');

  IF v_dispatch AND (SELECT pause_all FROM growth.ge_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'PAUSED_ALL';
  END IF;
  SELECT status INTO v_status FROM growth.ge_campaigns WHERE id = NEW.campaign_id;
  IF v_status IN ('PAUSED', 'REJECTED', 'ARCHIVED', 'CHANGES_REQUESTED', 'REGENERATING', 'NEEDS_VERIFY') THEN
    RAISE EXCEPTION 'CAMPAIGN_NOT_PUBLISHABLE: %', v_status;
  END IF;
  SELECT * INTO v_variant FROM growth.ge_platform_variants WHERE id = NEW.platform_variant_id;
  IF NOT FOUND OR v_variant.platform <> NEW.platform OR v_variant.campaign_id <> NEW.campaign_id THEN
    RAISE EXCEPTION 'UNKNOWN_VARIANT';
  END IF;
  IF NEW.variant_hash IS DISTINCT FROM v_variant.content_hash
     OR v_variant.content_hash IS DISTINCT FROM growth.ge_latest_variant_hash(NEW.campaign_id, NEW.platform) THEN
    RAISE EXCEPTION 'STALE_APPROVAL';
  END IF;
  IF NOT growth.ge_hash_approved(NEW.campaign_id, NEW.platform, NEW.variant_hash) THEN
    RAISE EXCEPTION 'NOT_APPROVED: % is not approved for this hash', NEW.platform;
  END IF;
  IF v_dispatch AND NEW.scheduled_at > now() THEN
    RAISE EXCEPTION 'NOT_DUE';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ge_publish_jobs_guard ON growth.ge_publish_jobs;
CREATE TRIGGER ge_publish_jobs_guard BEFORE INSERT OR UPDATE ON growth.ge_publish_jobs
  FOR EACH ROW EXECUTE FUNCTION growth.ge_publish_job_guard();

-- Publisher tick (every 15 min). Returns one due job, leased, or nothing when paused.
CREATE OR REPLACE FUNCTION growth.ge_claim_due_publish_job(_worker text, _lease_seconds integer DEFAULT 120)
RETURNS growth.ge_publish_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
DECLARE
  v_job growth.ge_publish_jobs;
BEGIN
  IF (SELECT pause_all FROM growth.ge_settings WHERE id = 1) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_job FROM growth.ge_publish_jobs
   WHERE status = 'SCHEDULED' AND scheduled_at <= now()
     AND (lease_until IS NULL OR lease_until < now())
     AND NOT EXISTS (SELECT 1 FROM growth.ge_post_publications p WHERE p.idempotency_key = ge_publish_jobs.idempotency_key)
   ORDER BY scheduled_at
   FOR UPDATE SKIP LOCKED
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  UPDATE growth.ge_publish_jobs
     SET claimed_by = _worker, lease_until = now() + make_interval(secs => _lease_seconds)
   WHERE id = v_job.id
  RETURNING * INTO v_job;
  RETURN v_job;
END;
$$;

-- ---------------------------------------------------------------------------
-- AI credit rule: exhausted → AI tasks BLOCKED_BUDGET, one notice per cycle, resume next cycle
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION growth.ge_settings_before()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  -- The owner's cap counts as exhausted once the running estimate reaches it.
  IF NEW.ai_monthly_cap_usd IS NOT NULL AND NEW.ai_spent_estimate_usd >= NEW.ai_monthly_cap_usd THEN
    NEW.ai_credit_status := 'EXHAUSTED';
  END IF;
  IF NEW.ai_credit_status = 'EXHAUSTED'
     AND NEW.ai_budget_notice_cycle IS DISTINCT FROM COALESCE(NEW.ai_credit_cycle_start, DATE '1970-01-01') THEN
    NEW.ai_budget_notice_cycle := COALESCE(NEW.ai_credit_cycle_start, DATE '1970-01-01');
    NEW.ai_budget_notice_pending := true;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ge_settings_before ON growth.ge_settings;
CREATE TRIGGER ge_settings_before BEFORE UPDATE ON growth.ge_settings
  FOR EACH ROW EXECUTE FUNCTION growth.ge_settings_before();

CREATE OR REPLACE FUNCTION growth.ge_settings_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
BEGIN
  IF NEW.ai_credit_status = 'EXHAUSTED' AND OLD.ai_credit_status IS DISTINCT FROM 'EXHAUSTED' THEN
    UPDATE growth.ge_agent_tasks
       SET status = 'BLOCKED_BUDGET', blocked_reason = 'AI credit exhausted for this cycle',
           claimed_by = NULL, lease_until = NULL, updated_at = now()
     WHERE uses_ai AND status = 'QUEUED';
    UPDATE growth.ge_revision_requests SET status = 'BLOCKED_BUDGET', updated_at = now() WHERE status = 'QUEUED';
  ELSIF OLD.ai_credit_status = 'EXHAUSTED' AND NEW.ai_credit_status IN ('AVAILABLE', 'LOW') THEN
    UPDATE growth.ge_agent_tasks SET status = 'QUEUED', blocked_reason = NULL, updated_at = now() WHERE status = 'BLOCKED_BUDGET';
    UPDATE growth.ge_revision_requests SET status = 'QUEUED', updated_at = now() WHERE status = 'BLOCKED_BUDGET';
  END IF;
  IF NEW.pause_all IS DISTINCT FROM OLD.pause_all THEN
    PERFORM growth.ge_audit(CASE WHEN NEW.pause_all THEN 'pause_all.on' ELSE 'pause_all.off' END, 'settings', jsonb_build_object('reason', NEW.pause_reason));
  END IF;
  IF NEW.mode IS DISTINCT FROM OLD.mode THEN
    PERFORM growth.ge_audit('mode.change', 'settings', jsonb_build_object('from', OLD.mode, 'to', NEW.mode));
  END IF;
  IF NEW.ai_monthly_cap_usd IS DISTINCT FROM OLD.ai_monthly_cap_usd THEN
    PERFORM growth.ge_audit('budget.cap_changed', 'settings', '{}'::jsonb);
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS ge_settings_after ON growth.ge_settings;
CREATE TRIGGER ge_settings_after AFTER UPDATE ON growth.ge_settings
  FOR EACH ROW EXECUTE FUNCTION growth.ge_settings_after();

-- Any AI task created while credit is out starts as BLOCKED_BUDGET.
CREATE OR REPLACE FUNCTION growth.ge_task_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.uses_ai AND (SELECT ai_credit_status FROM growth.ge_settings WHERE id = 1) = 'EXHAUSTED' THEN
    NEW.status := 'BLOCKED_BUDGET';
    NEW.blocked_reason := 'AI credit exhausted for this cycle';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ge_agent_tasks_insert_guard ON growth.ge_agent_tasks;
CREATE TRIGGER ge_agent_tasks_insert_guard BEFORE INSERT ON growth.ge_agent_tasks
  FOR EACH ROW EXECUTE FUNCTION growth.ge_task_insert_guard();

-- Worker claim with lease. Nothing when Pause All is on. Expired leases can be re-claimed.
CREATE OR REPLACE FUNCTION growth.ge_claim_next_task(_worker text, _lease_seconds integer DEFAULT 300)
RETURNS growth.ge_agent_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
DECLARE
  v_settings growth.ge_settings;
  v_exhausted boolean;
  v_task growth.ge_agent_tasks;
BEGIN
  SELECT * INTO v_settings FROM growth.ge_settings WHERE id = 1;
  IF v_settings.pause_all THEN
    RETURN NULL;
  END IF;
  v_exhausted := v_settings.ai_credit_status = 'EXHAUSTED';
  IF v_exhausted THEN
    -- Expired AI leases also stop here instead of being retried.
    UPDATE growth.ge_agent_tasks
       SET status = 'BLOCKED_BUDGET', blocked_reason = 'AI credit exhausted for this cycle',
           claimed_by = NULL, lease_until = NULL, updated_at = now()
     WHERE uses_ai AND (status = 'QUEUED' OR (status IN ('CLAIMED', 'RUNNING') AND lease_until < now()));
  END IF;

  SELECT * INTO v_task FROM growth.ge_agent_tasks q
   WHERE (q.status = 'QUEUED' OR (q.status IN ('CLAIMED', 'RUNNING') AND q.lease_until < now()))
     AND q.run_after <= now()
     AND q.attempts < q.max_attempts
     AND NOT (q.uses_ai AND v_exhausted)
     AND NOT EXISTS (
       SELECT 1 FROM unnest(q.depends_on) AS d(dep_id)
       LEFT JOIN growth.ge_agent_tasks x ON x.id = d.dep_id
       WHERE x.status IS DISTINCT FROM 'DONE')
   ORDER BY q.priority, q.created_at
   FOR UPDATE OF q SKIP LOCKED
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE growth.ge_agent_tasks
     SET status = 'CLAIMED', claimed_by = _worker,
         lease_until = now() + make_interval(secs => _lease_seconds),
         attempts = attempts + 1, updated_at = now()
   WHERE id = v_task.id
  RETURNING * INTO v_task;
  RETURN v_task;
END;
$$;

-- Only the lease holder can finish (a re-claimed task cannot be overwritten by a stale worker).
CREATE OR REPLACE FUNCTION growth.ge_complete_task(_task uuid, _worker text, _ok boolean, _error text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
BEGIN
  UPDATE growth.ge_agent_tasks
     SET status = CASE WHEN _ok THEN 'DONE' ELSE 'FAILED' END,
         last_error = _error, lease_until = NULL, finished_at = now(), updated_at = now()
   WHERE id = _task AND claimed_by = _worker AND status IN ('CLAIMED', 'RUNNING');
  RETURN FOUND;
END;
$$;

-- Add an estimate after each Claude call. Reaching the cap flips status to EXHAUSTED (trigger).
CREATE OR REPLACE FUNCTION growth.ge_record_ai_usage(_run uuid, _campaign uuid, _estimated_usd numeric)
RETURNS growth.ge_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
DECLARE
  v growth.ge_settings;
BEGIN
  INSERT INTO growth.ge_usage_costs (run_id, provider, campaign_id, estimated_cost_usd)
  VALUES (_run, 'anthropic', _campaign, GREATEST(_estimated_usd, 0));
  UPDATE growth.ge_settings
     SET ai_spent_estimate_usd = ai_spent_estimate_usd + GREATEST(_estimated_usd, 0)
   WHERE id = 1
  RETURNING * INTO v;
  RETURN v;
END;
$$;

-- The API answered "credit balance is too low": stop AI work for this cycle.
CREATE OR REPLACE FUNCTION growth.ge_mark_credit_exhausted()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
  UPDATE growth.ge_settings SET ai_credit_status = 'EXHAUSTED' WHERE id = 1;
$$;

-- New monthly credit arrived (cron on the cycle day, or the owner by hand).
CREATE OR REPLACE FUNCTION growth.ge_start_credit_cycle(_cycle_start date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
  UPDATE growth.ge_settings
     SET ai_credit_status = 'AVAILABLE', ai_credit_cycle_start = _cycle_start,
         ai_spent_estimate_usd = 0, ai_budget_notice_pending = false
   WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION growth.ge_claim_next_task(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION growth.ge_complete_task(uuid, text, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION growth.ge_record_ai_usage(uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION growth.ge_mark_credit_exhausted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION growth.ge_start_credit_cycle(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION growth.ge_claim_due_publish_job(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION growth.ge_claim_next_task(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION growth.ge_complete_task(uuid, text, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION growth.ge_record_ai_usage(uuid, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION growth.ge_mark_credit_exhausted() TO service_role;
GRANT EXECUTE ON FUNCTION growth.ge_start_credit_cycle(date) TO service_role;
GRANT EXECUTE ON FUNCTION growth.ge_claim_due_publish_job(text, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- RLS: admins read everything; the owner writes only decisions. Agents use service_role.
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA growth FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA growth TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA growth TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA growth TO service_role;

GRANT UPDATE (mode, pause_all, pause_reason, vacation_mode, ai_monthly_cap_usd) ON growth.ge_settings TO authenticated;
GRANT INSERT ON growth.ge_approvals TO authenticated;
GRANT INSERT, UPDATE (status, ai_note) ON growth.ge_comments TO authenticated;
GRANT INSERT, DELETE ON growth.ge_locks TO authenticated;
GRANT INSERT ON growth.ge_revision_requests TO authenticated;
GRANT UPDATE (status) ON growth.ge_campaigns TO authenticated;
GRANT UPDATE (decided_option, decided_by, decided_at) ON growth.ge_owner_decisions TO authenticated;
GRANT UPDATE (owner_decision) ON growth.ge_learning_memos TO authenticated;
GRANT INSERT ON growth.ge_playbooks TO authenticated;

DO $rls$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'growth'
  LOOP
    EXECUTE format('ALTER TABLE growth.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON growth.%I', t || '_admin_read', t);
    EXECUTE format('CREATE POLICY %I ON growth.%I FOR SELECT TO authenticated USING ((SELECT growth.ge_is_admin()))', t || '_admin_read', t);
  END LOOP;
END
$rls$;

-- Write policies (column grants above limit what can change).
DROP POLICY IF EXISTS ge_settings_admin_update ON growth.ge_settings;
CREATE POLICY ge_settings_admin_update ON growth.ge_settings FOR UPDATE TO authenticated
  USING ((SELECT growth.ge_is_admin())) WITH CHECK ((SELECT growth.ge_is_admin()));
DROP POLICY IF EXISTS ge_approvals_admin_insert ON growth.ge_approvals;
CREATE POLICY ge_approvals_admin_insert ON growth.ge_approvals FOR INSERT TO authenticated
  WITH CHECK ((SELECT growth.ge_is_admin()));
DROP POLICY IF EXISTS ge_comments_admin_insert ON growth.ge_comments;
CREATE POLICY ge_comments_admin_insert ON growth.ge_comments FOR INSERT TO authenticated
  WITH CHECK ((SELECT growth.ge_is_admin()) AND author_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS ge_comments_admin_update ON growth.ge_comments;
CREATE POLICY ge_comments_admin_update ON growth.ge_comments FOR UPDATE TO authenticated
  USING ((SELECT growth.ge_is_admin())) WITH CHECK ((SELECT growth.ge_is_admin()));
DROP POLICY IF EXISTS ge_locks_admin_insert ON growth.ge_locks;
CREATE POLICY ge_locks_admin_insert ON growth.ge_locks FOR INSERT TO authenticated
  WITH CHECK ((SELECT growth.ge_is_admin()));
DROP POLICY IF EXISTS ge_locks_admin_delete ON growth.ge_locks;
CREATE POLICY ge_locks_admin_delete ON growth.ge_locks FOR DELETE TO authenticated
  USING ((SELECT growth.ge_is_admin()));
DROP POLICY IF EXISTS ge_revision_requests_admin_insert ON growth.ge_revision_requests;
CREATE POLICY ge_revision_requests_admin_insert ON growth.ge_revision_requests FOR INSERT TO authenticated
  WITH CHECK ((SELECT growth.ge_is_admin()) AND status = 'QUEUED');
DROP POLICY IF EXISTS ge_campaigns_admin_update ON growth.ge_campaigns;
CREATE POLICY ge_campaigns_admin_update ON growth.ge_campaigns FOR UPDATE TO authenticated
  USING ((SELECT growth.ge_is_admin())) WITH CHECK ((SELECT growth.ge_is_admin()));
DROP POLICY IF EXISTS ge_owner_decisions_admin_update ON growth.ge_owner_decisions;
CREATE POLICY ge_owner_decisions_admin_update ON growth.ge_owner_decisions FOR UPDATE TO authenticated
  USING ((SELECT growth.ge_is_admin())) WITH CHECK ((SELECT growth.ge_is_admin()) AND decided_by = (SELECT auth.uid()));
DROP POLICY IF EXISTS ge_learning_memos_admin_update ON growth.ge_learning_memos;
CREATE POLICY ge_learning_memos_admin_update ON growth.ge_learning_memos FOR UPDATE TO authenticated
  USING ((SELECT growth.ge_is_admin())) WITH CHECK ((SELECT growth.ge_is_admin()));
DROP POLICY IF EXISTS ge_playbooks_admin_insert ON growth.ge_playbooks;
CREATE POLICY ge_playbooks_admin_insert ON growth.ge_playbooks FOR INSERT TO authenticated
  WITH CHECK ((SELECT growth.ge_is_admin()) AND approved_by = (SELECT auth.uid()));

-- Locks are audited (they change what a revision may touch).
CREATE OR REPLACE FUNCTION growth.ge_lock_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = growth, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.locked_by := auth.uid();
    PERFORM growth.ge_audit('lock.added', 'campaign:' || NEW.campaign_id, jsonb_build_object('component', NEW.component_key));
    RETURN NEW;
  END IF;
  PERFORM growth.ge_audit('lock.removed', 'campaign:' || OLD.campaign_id, jsonb_build_object('component', OLD.component_key));
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS ge_locks_audit ON growth.ge_locks;
CREATE TRIGGER ge_locks_audit BEFORE INSERT OR DELETE ON growth.ge_locks
  FOR EACH ROW EXECUTE FUNCTION growth.ge_lock_audit();
