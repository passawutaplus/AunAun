-- Production: disable mock payments and revoke authenticated execute.
-- Demo/staging: run security-mock-payments-demo-enable.sql instead.

UPDATE public.payment_settings
SET
  mock_topup_enabled = false,
  mock_ad_pay_enabled = false,
  updated_at = now()
WHERE id = 1;

REVOKE EXECUTE ON FUNCTION public.topup_wallet_mock(integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mock_pay_ad_application(uuid) FROM authenticated;
