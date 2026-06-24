-- Prevent browser clients from minting purchased credits through the mock RPC.
-- Demo environments may grant authenticated access in a separate, explicit setup step.
REVOKE ALL ON FUNCTION public.topup_wallet_mock(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.topup_wallet_mock(integer)
  TO service_role;
