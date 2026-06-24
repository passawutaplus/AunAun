-- =====================================================================
-- Lock down EXECUTE on SECURITY DEFINER functions (least privilege)
-- =====================================================================

-- Trigger-only functions: revoke ALL grants (only superuser-owned triggers call them)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_comment_report_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_hire() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.chat_auto_reply() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_last_active() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_hire_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.moderate_portfolio_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_approve_tester() FROM PUBLIC, anon, authenticated;

-- Admin-only / cron-only maintenance functions
REVOKE EXECUTE ON FUNCTION public.purge_inactive_profile_data(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_storage() FROM PUBLIC, anon, authenticated;

-- Admin analytics: only service role / admin server functions need these
REVOKE EXECUTE ON FUNCTION public.get_daily_active_users(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_hourly_active_distribution(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_top_active_users(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_feature_usage_stats(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_feature_usage_trend(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_feature_data_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_db_usage_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_storage_usage_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_top_subscriptions(integer) FROM PUBLIC, anon, authenticated;

-- Re-grant only to authenticated where end-users actually need to call them via SDK:
-- has_role: used in RLS USING clauses (already accessible via SECURITY DEFINER context)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- log_user_activity: signed-in users log their own activity
GRANT EXECUTE ON FUNCTION public.log_user_activity(text) TO authenticated;

-- get_public_profile: viewing others' public profile (signed-in or anon both fine)
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;