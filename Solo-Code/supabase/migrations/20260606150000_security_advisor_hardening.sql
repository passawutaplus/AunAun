-- Security Advisor hardening (rvnzjiskqliexysicfmh)
-- Fixes: function_search_path_mutable, anon EXECUTE on triggers/internal RPCs

-- ── 1. Pin search_path on support-ticket helpers ──
ALTER FUNCTION public.format_ticket_number(bigint) SET search_path = public;

CREATE OR REPLACE FUNCTION public.assign_support_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR btrim(NEW.ticket_number) = '' THEN
    NEW.ticket_number := public.format_ticket_number(nextval('public.support_ticket_number_seq'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_support_ticket_closed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('closed', 'wont_fix') AND NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    ELSIF NEW.status NOT IN ('closed', 'wont_fix') THEN
      NEW.closed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Trigger / notify functions: not callable via PostgREST ──
REVOKE EXECUTE ON FUNCTION public.assign_support_ticket_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.format_ticket_number(bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_support_ticket_closed_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_invoice_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_slip_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_support_ticket_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_invoice_late() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_slip_upload() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_ticket_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.feedback_to_training_sample() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trim_price_guide_history() FROM PUBLIC, anon, authenticated;

-- ── 3. Email queue: service_role / edge functions only ──
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- ── 4. Authenticated-only RPCs (revoke anon; keep authenticated for app) ──
REVOKE EXECUTE ON FUNCTION public.auto_update_invoice_statuses() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_user_tier(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.force_purge_user(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_article_view(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_article_view(text) TO service_role;

-- vector(1536) = pgvector type used by match_ai_knowledge
REVOKE EXECUTE ON FUNCTION public.match_ai_knowledge(vector, text, integer) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.get_db_usage_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_storage_usage_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_feature_data_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_feature_usage_stats(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_feature_usage_trend(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_daily_active_users(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_device_breakdown(integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_device_usage_stats(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_hourly_active_distribution(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_top_active_users(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_top_subscriptions(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_calculator_usage_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_user_activity(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;

-- Admin RPCs already gate on has_role(); revoke anon only
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles_safe() FROM PUBLIC, anon;

-- ── 5. Intentional public share-link RPCs (anon kept) ──
-- get_brief_by_token, confirm_brief_by_token, update_brief_by_token
-- get_planner_share_by_token, get_planner_posts_by_token, submit_post_approval
-- get_shared_supplier_by_token, get_public_profile
-- Security Advisor may still WARN — token validates access inside each function.
