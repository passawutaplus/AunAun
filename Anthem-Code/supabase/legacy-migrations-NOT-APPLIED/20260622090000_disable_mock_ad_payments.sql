-- Mock ad payments are for explicitly configured demo environments only.
-- Production payment confirmation must be performed by a trusted server/webhook.
REVOKE ALL ON FUNCTION public.mock_pay_ad_application(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mock_pay_ad_application(uuid)
  TO service_role;
