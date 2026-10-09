-- Security hardening: server-only SECURITY DEFINER RPCs must not be callable with the public anon key.
--
-- Found 2026-10-07 via Supabase security advisors + pg_proc inspection:
-- these functions take a caller-supplied user id, perform NO auth.uid()/role check inside,
-- and had EXECUTE granted to anon + authenticated (PostgREST: /rest/v1/rpc/<name>).
-- Anyone holding the public anon key could, for example, call add_ai_credits_atomic with an
-- arbitrary user id and a made-up stripe_session_id to mint AI credits.
--
-- Every legitimate caller found in the repo uses a service-role client (supabaseAdmin /
-- edge-function admin client) or is another SECURITY DEFINER function (runs as owner),
-- so restricting EXECUTE to service_role does not change app behavior.
--
-- NOT touched here (browser callers exist, need in-function ownership checks instead):
--   public.notify_collab_end_event, public.notify_hire_cancel_event (Anthem client calls them),
--   public.recommend_from_likes (Anthem feed). See Solo-Code/docs/SOLO-HANDOFF.md.
--
-- Apply BEFORE deploying app changes (see README "Production safety").

BEGIN;

-- Credits / quota (server-only)
REVOKE EXECUTE ON FUNCTION public.add_ai_credits_atomic(uuid, text, integer, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.debit_ai_credits(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_ai_usage_summary(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_design_drill_reroll(uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_design_drill_reroll_status(uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_meeting_free_slot(uuid)
  FROM PUBLIC, anon, authenticated;

-- Tier sync + notification fan-out (server-only; forged calls could spam/phish any user)
REVOKE EXECUTE ON FUNCTION public.sync_user_tier(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_line_notification(uuid, text, jsonb, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_kyc_user(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_job_application_event(uuid, text, text, text, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

-- Keep service_role (and the owner) able to call them
GRANT EXECUTE ON FUNCTION public.add_ai_credits_atomic(uuid, text, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_ai_credits(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_summary(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_design_drill_reroll(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_design_drill_reroll_status(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_meeting_free_slot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_user_tier(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_line_notification(uuid, text, jsonb, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_kyc_user(uuid, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_job_application_event(uuid, text, text, text, uuid, uuid, text) TO service_role;

-- Forged-notification vectors that the Anthem browser client legitimately needs while signed in:
-- remove anon only (authenticated stays until the functions verify the caller).
REVOKE EXECUTE ON FUNCTION public.notify_collab_end_event(uuid, text, text, text, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_hire_cancel_event(uuid, text, text, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_collab_end_event(uuid, text, text, text, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_hire_cancel_event(uuid, text, text, text, uuid, uuid) TO authenticated, service_role;

COMMIT;

-- Post-apply check (expect 0 rows):
-- select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.proname in ('add_ai_credits_atomic','debit_ai_credits','check_and_increment_ai_usage',
--                      'get_ai_usage_summary','claim_design_drill_reroll','get_design_drill_reroll_status',
--                      'claim_meeting_free_slot','sync_user_tier','enqueue_line_notification',
--                      'notify_kyc_user','notify_job_application_event')
--    and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
