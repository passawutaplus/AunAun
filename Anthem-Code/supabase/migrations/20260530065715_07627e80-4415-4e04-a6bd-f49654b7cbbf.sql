-- ============================================================
-- Security hardening migration
-- 1. Wallets: stop exposing balances publicly
-- 2. ad_events / image_shares: require auth for INSERT
-- 3. Revoke EXECUTE on internal trigger / admin / handler functions
--    from public+anon (keep service_role + authenticated where needed)
-- ============================================================

-- ---------- WALLETS: privacy fix ----------
DROP POLICY IF EXISTS "wallets public read" ON public.wallets;
CREATE POLICY "wallets owner read"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can still see all wallets (for moderation)
CREATE POLICY "wallets admin read"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- AD EVENTS: require auth ----------
DROP POLICY IF EXISTS "Anyone insert ad event" ON public.ad_events;
CREATE POLICY "Authenticated insert ad event"
  ON public.ad_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ---------- IMAGE SHARES: require auth ----------
DROP POLICY IF EXISTS "anyone insert share" ON public.image_shares;
CREATE POLICY "Authenticated insert share"
  ON public.image_shares FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ---------- Revoke EXECUTE on TRIGGER functions ----------
-- Trigger fns are only invoked by the database itself; no client should call them.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_collection_item_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_inspire_board_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_studio_formation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispatch_job_match() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_hire_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_collab_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_job_application() FROM PUBLIC, anon, authenticated;

-- Internal helper
REVOKE ALL ON FUNCTION public.ensure_wallet(uuid) FROM PUBLIC, anon, authenticated;

-- ---------- Restrict admin_* functions to authenticated only ----------
-- (the functions themselves check has_role, but we want anon blocked at the door)
REVOKE EXECUTE ON FUNCTION public.admin_ad_overview()           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_gift_overview()         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_ad_application(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_ad_application(uuid, text)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_cashouts(integer)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_topups(integer)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_mark_cashout_paid(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_recent_gifts(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_top_gift_projects(integer)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_top_gift_recipients(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_top_gift_senders(integer)    FROM PUBLIC, anon;

-- ---------- Restrict user-action functions to authenticated only ----------
REVOKE EXECUTE ON FUNCTION public.send_gift(uuid, uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_cashout(integer, jsonb)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.topup_wallet_mock(integer)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_ad_event(uuid, ad_event_type) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_ad_event_v2(uuid, ad_event_type, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mock_pay_ad_application(uuid)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_project_view(uuid)     FROM PUBLIC, anon;

-- has_role / is_studio_* / is_formation_participant are used inside RLS — keep them
-- callable; they only read user_roles which has its own policy.
-- get_active_ads / get_ad_campaign / image_like_count / image_share_count
-- / ad_events_daily are read-only public data; intentionally remain anon-callable.