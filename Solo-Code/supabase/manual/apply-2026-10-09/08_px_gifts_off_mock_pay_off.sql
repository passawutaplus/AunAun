-- 2026-10-09: PX and gifts are out of the product for now; mock payments must not exist in production.
--
-- 1) payment_settings.mock_topup_enabled = true let ANY signed-in buyer confirm their own hire order as paid with a
--    charge id starting with "mock_" (shared.confirm_hire_order_payment): the order turns "paid" and nobody pays.
--    It is meant for demos only. Switch it off; also switch off the Stripe PX top-up flag (Stripe is cut over).
-- 2) The functions that CHANGE PX balances or send money-like value were callable by every signed-in user (and, for
--    the daily / mission claims, by anon). The app UI is already hidden (VITE_APLUS1_PX_ENABLED / GIFT_ECONOMY), but a
--    hidden button is not a lock. Client EXECUTE is revoked; service_role keeps it for server jobs.
--
-- To bring the PX economy back later:  GRANT EXECUTE ON FUNCTION <the function> TO authenticated;
--   (daily / mission claims also need `anon` removed, they check auth.uid()). Do NOT re-enable mock_topup_enabled in production.

UPDATE public.payment_settings
   SET mock_topup_enabled = false,
       stripe_px_enabled = false,
       updated_at = now()
 WHERE id = 1;

REVOKE ALL ON FUNCTION public.send_gift(uuid, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_daily_px() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_welcome_mission(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem.request_cashout(integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_gift(uuid, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_daily_px() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_welcome_mission(text) TO service_role;
GRANT EXECUTE ON FUNCTION anthem.request_cashout(integer, jsonb) TO service_role;

-- Read helpers: signed-in only (they were open to anon).
REVOKE ALL ON FUNCTION public.daily_px_claim_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._check_welcome_mission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.daily_px_claim_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._check_welcome_mission(uuid, text) TO authenticated, service_role;
