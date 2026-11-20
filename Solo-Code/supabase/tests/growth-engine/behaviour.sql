\set ON_ERROR_STOP 1
-- expect_error(sql, pattern): the statement must fail with a message matching pattern.
CREATE OR REPLACE FUNCTION pg_temp.expect_error(_sql text, _pattern text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE _sql;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~ _pattern THEN RAISE NOTICE 'ok: % (%)', _pattern, SQLERRM; RETURN; END IF;
    RAISE EXCEPTION 'wrong error for %: %', _pattern, SQLERRM;
  END;
  RAISE EXCEPTION 'expected error % but it succeeded: %', _pattern, _sql;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.check(_ok boolean, _label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT COALESCE(_ok, false) THEN RAISE EXCEPTION 'FAILED: %', _label; END IF; RAISE NOTICE 'ok: %', _label; END $$;

-- Agents/publisher = service_role (no auth.uid()).
SET ROLE service_role;
INSERT INTO growth.ge_campaigns (id, slug, name, pillar, goal, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'pfi-w01', 'Portfolio First Impression', 'Design Knowledge', 'Create profile', 'AWAITING_APPROVAL');
INSERT INTO growth.ge_campaign_versions (id, campaign_id, version, manifest, created_by_kind)
VALUES ('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 1, '{"frame-2":"a"}', 'agent');
SELECT pg_temp.expect_error($$INSERT INTO growth.ge_campaign_versions (campaign_id, version, manifest, created_by_kind) VALUES ('11111111-1111-1111-1111-111111111111', 3, '{}', 'agent')$$, 'VERSION_GAP');
SELECT pg_temp.expect_error($$UPDATE growth.ge_campaign_versions SET manifest = '{}' WHERE version = 1$$, 'APPEND_ONLY');
SELECT pg_temp.check((SELECT content_hash ~ '^[0-9a-f]{64}$' FROM growth.ge_campaign_versions WHERE version = 1), 'sha256 content_hash set by DB');

INSERT INTO growth.ge_platform_variants (id, campaign_id, campaign_version_id, platform, payload, scheduled_slot) VALUES
  ('33333333-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'instagram', '{"frames":["f1","f2-dense"]}', now() - interval '1 minute'),
  ('33333333-0000-0000-0000-0000000000b1', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'facebook', '{"caption":"fb"}', now() - interval '1 minute');

-- An agent cannot approve.
SELECT pg_temp.expect_error($$INSERT INTO growth.ge_approvals (campaign_id, platform_variant_id, platform, approved_hash, decision, approver_id)
  SELECT campaign_id, id, platform, content_hash, 'APPROVED', '00000000-0000-0000-0000-00000000000a' FROM growth.ge_platform_variants WHERE platform = 'facebook'$$, 'OWNER_ONLY');
-- Scheduling an unapproved platform fails.
SELECT pg_temp.expect_error($$INSERT INTO growth.ge_publish_jobs (campaign_id, platform, platform_variant_id, variant_hash, scheduled_at, idempotency_key)
  SELECT campaign_id, platform, id, content_hash, scheduled_slot, 'k-ig-v1' FROM growth.ge_platform_variants WHERE platform = 'instagram'$$, 'NOT_APPROVED');
-- Status machine: no skipping, APPROVED needs every platform.
SELECT pg_temp.expect_error($$UPDATE growth.ge_campaigns SET status = 'SCHEDULED'$$, 'INVALID_TRANSITION');
SELECT pg_temp.expect_error($$UPDATE growth.ge_campaigns SET status = 'APPROVED'$$, 'NOT_ALL_PLATFORMS_APPROVED');
RESET ROLE;

-- The owner (admin) approves FB and IG from the dashboard.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
SELECT pg_temp.expect_error($$INSERT INTO growth.ge_approvals (campaign_id, platform_variant_id, platform, approved_hash, decision, approver_id)
  VALUES ('11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-0000000000b1', 'facebook', 'not-the-hash', 'APPROVED', '00000000-0000-0000-0000-00000000000a')$$, 'HASH_MISMATCH');
INSERT INTO growth.ge_approvals (campaign_id, platform_variant_id, platform, approved_hash, decision, approver_id)
  SELECT campaign_id, id, platform, content_hash, 'APPROVED', '00000000-0000-0000-0000-00000000000a' FROM growth.ge_platform_variants;
SELECT pg_temp.check((SELECT count(*) = 2 FROM growth.ge_approvals), 'admin sees + inserted 2 approvals');
UPDATE growth.ge_campaigns SET status = 'APPROVED';
SELECT pg_temp.expect_error($$UPDATE growth.ge_approvals SET decision = 'REJECTED'$$, 'APPEND_ONLY|permission denied');
-- A normal signed-in user sees nothing.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
SELECT pg_temp.check((SELECT count(*) = 0 FROM growth.ge_campaigns), 'non-admin sees 0 campaigns');
SELECT pg_temp.expect_error($$INSERT INTO growth.ge_approvals (campaign_id, platform_variant_id, platform, approved_hash, decision, approver_id)
  SELECT '11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-0000000000b1', 'facebook', 'x', 'APPROVED', '00000000-0000-0000-0000-00000000000b'$$, 'row-level security|OWNER_ONLY');
RESET ROLE;
SET ROLE anon;
SELECT pg_temp.expect_error($$SELECT * FROM growth.ge_campaigns$$, 'permission denied');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

-- Publisher schedules both; idempotency + one live job per slot.
SET ROLE service_role;
INSERT INTO growth.ge_publish_jobs (campaign_id, platform, platform_variant_id, variant_hash, scheduled_at, idempotency_key)
  SELECT campaign_id, platform, id, content_hash, scheduled_slot, '1111:' || platform || ':v1' FROM growth.ge_platform_variants;
SELECT pg_temp.expect_error($$INSERT INTO growth.ge_publish_jobs (campaign_id, platform, platform_variant_id, variant_hash, scheduled_at, idempotency_key)
  SELECT campaign_id, platform, id, content_hash, scheduled_slot, '1111:' || platform || ':v1' FROM growth.ge_platform_variants WHERE platform = 'facebook'$$, 'duplicate key');
SELECT pg_temp.expect_error($$INSERT INTO growth.ge_publish_jobs (campaign_id, platform, platform_variant_id, variant_hash, scheduled_at, idempotency_key)
  SELECT campaign_id, platform, id, content_hash, scheduled_slot, 'other-key' FROM growth.ge_platform_variants WHERE platform = 'facebook'$$, 'ge_publish_jobs_one_live_slot');
UPDATE growth.ge_campaigns SET status = 'SCHEDULED';

-- Pause All blocks dispatch and claims.
UPDATE growth.ge_settings SET pause_all = true;
SELECT pg_temp.expect_error($$UPDATE growth.ge_publish_jobs SET status = 'EXPORTED_FOR_MANUAL_POST' WHERE platform = 'facebook'$$, 'PAUSED_ALL');
SELECT pg_temp.check((SELECT growth.ge_claim_due_publish_job('w1') IS NULL), 'paused: no publish claim');
INSERT INTO growth.ge_agent_tasks (id, role, kind, uses_ai, idempotency_key) VALUES
  ('44444444-0000-0000-0000-000000000001', 'research', 'daily', true, 't-research'),
  ('44444444-0000-0000-0000-000000000002', 'qa', 'links', false, 't-qa');
INSERT INTO growth.ge_agent_tasks (id, role, kind, uses_ai, idempotency_key, depends_on) VALUES
  ('44444444-0000-0000-0000-000000000003', 'strategy', 'score', true, 't-score', ARRAY['44444444-0000-0000-0000-000000000001']::uuid[]);
SELECT pg_temp.check(((growth.ge_claim_next_task('w1')).id IS NULL), 'paused: no task claim');
UPDATE growth.ge_settings SET pause_all = false;

-- Owner comments → v2 changes IG only → IG job revoked, FB job stays.
INSERT INTO growth.ge_campaign_versions (id, campaign_id, version, manifest, created_by_kind)
VALUES ('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 2, '{"frame-2":"b"}', 'agent');
INSERT INTO growth.ge_platform_variants (campaign_id, campaign_version_id, platform, payload, scheduled_slot)
  SELECT campaign_id, '22222222-0000-0000-0000-000000000002', platform,
         CASE WHEN platform = 'instagram' THEN '{"frames":["f1","f2-lighter"]}'::jsonb ELSE payload END, scheduled_slot
  FROM growth.ge_platform_variants WHERE campaign_version_id = '22222222-0000-0000-0000-000000000001';
SELECT pg_temp.check((SELECT status = 'REVOKED' FROM growth.ge_publish_jobs WHERE platform = 'instagram'), 'IG job revoked by v2');
SELECT pg_temp.check((SELECT status = 'SCHEDULED' FROM growth.ge_publish_jobs WHERE platform = 'facebook'), 'FB job kept (same hash)');
SELECT pg_temp.expect_error($$UPDATE growth.ge_publish_jobs SET status = 'SCHEDULED' WHERE platform = 'instagram'$$, 'JOB_CLOSED');
SELECT pg_temp.expect_error($$INSERT INTO growth.ge_publish_jobs (campaign_id, platform, platform_variant_id, variant_hash, scheduled_at, idempotency_key)
  SELECT pv.campaign_id, pv.platform, pv.id, pv.content_hash, pv.scheduled_slot, '1111:instagram:v2'
  FROM growth.ge_platform_variants pv JOIN growth.ge_campaign_versions cv ON cv.id = pv.campaign_version_id WHERE cv.version = 2 AND pv.platform = 'instagram'$$, 'NOT_APPROVED');
-- Old v1 IG job cannot be exported (stale) – it is REVOKED anyway; FB exports fine.
SELECT pg_temp.check((SELECT (growth.ge_claim_due_publish_job('w1')).platform = 'facebook'), 'claim returns the FB job');
UPDATE growth.ge_publish_jobs SET status = 'EXPORTED_FOR_MANUAL_POST' WHERE platform = 'facebook';
INSERT INTO growth.ge_post_publications (job_id, idempotency_key, kind, simulated)
  SELECT id, idempotency_key, 'manual_export', true FROM growth.ge_publish_jobs WHERE platform = 'facebook';
SELECT pg_temp.expect_error($$INSERT INTO growth.ge_post_publications (job_id, idempotency_key, kind, simulated)
  SELECT id, idempotency_key, 'manual_export', true FROM growth.ge_publish_jobs WHERE platform = 'facebook'$$, 'duplicate key');

-- Unknown result must be reconciled before retry.
UPDATE growth.ge_publish_jobs SET status = 'PUBLISH_STATUS_UNKNOWN' WHERE platform = 'facebook';
SELECT pg_temp.expect_error($$UPDATE growth.ge_publish_jobs SET status = 'SCHEDULED' WHERE platform = 'facebook'$$, 'NEEDS_RECONCILE');

-- Credit: lease + deps first, then exhaustion.
SELECT pg_temp.check(((growth.ge_claim_next_task('w1')).id = '44444444-0000-0000-0000-000000000001'), 'claims research first');
SELECT pg_temp.check(((growth.ge_claim_next_task('w2')).id = '44444444-0000-0000-0000-000000000002'), 'score waits for research; qa next');
SELECT pg_temp.check((SELECT NOT growth.ge_complete_task('44444444-0000-0000-0000-000000000001', 'w2', true)), 'non-holder cannot complete');
SELECT pg_temp.check((SELECT growth.ge_complete_task('44444444-0000-0000-0000-000000000001', 'w1', true)), 'holder completes');
UPDATE growth.ge_settings SET ai_credit_cycle_start = DATE '2026-11-01', ai_credit_status = 'AVAILABLE', ai_monthly_cap_usd = 1.00;
SELECT growth.ge_record_ai_usage(NULL, NULL, 1.20);
SELECT pg_temp.check((SELECT ai_credit_status = 'EXHAUSTED' AND ai_budget_notice_pending FROM growth.ge_settings), 'cap reached → EXHAUSTED + one notice pending');
SELECT pg_temp.check((SELECT status = 'BLOCKED_BUDGET' FROM growth.ge_agent_tasks WHERE id = '44444444-0000-0000-0000-000000000003'), 'queued AI task → BLOCKED_BUDGET');
INSERT INTO growth.ge_agent_tasks (role, kind, uses_ai, idempotency_key) VALUES ('copy', 'caption', true, 't-copy'), ('analytics', 'sync', false, 't-sync');
SELECT pg_temp.check((SELECT status = 'BLOCKED_BUDGET' FROM growth.ge_agent_tasks WHERE idempotency_key = 't-copy'), 'new AI task starts BLOCKED_BUDGET');
SELECT pg_temp.check(((growth.ge_claim_next_task('w3')).idempotency_key = 't-sync'), 'non-AI work continues');
UPDATE growth.ge_settings SET ai_budget_notice_pending = false; -- notifier sent it
UPDATE growth.ge_settings SET ai_spent_estimate_usd = ai_spent_estimate_usd + 0.5;
SELECT pg_temp.check((SELECT NOT ai_budget_notice_pending FROM growth.ge_settings), 'no second notice in the same cycle');
SELECT growth.ge_start_credit_cycle(DATE '2026-12-01');
SELECT pg_temp.check((SELECT count(*) = 0 FROM growth.ge_agent_tasks WHERE status = 'BLOCKED_BUDGET'), 'new cycle → AI tasks back to QUEUED');
RESET ROLE;

SELECT pg_temp.check((SELECT count(*) >= 5 FROM growth.ge_audit_logs), 'audit rows written');
SELECT action, actor_kind FROM growth.ge_audit_logs ORDER BY id;
