-- Demo / staging: enable mock payment RPCs for UX research builds.

UPDATE public.payment_settings
SET
  mock_topup_enabled = true,
  mock_ad_pay_enabled = true,
  updated_at = now()
WHERE id = 1;

GRANT EXECUTE ON FUNCTION public.topup_wallet_mock(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mock_pay_ad_application(uuid) TO authenticated;
