-- Admin / owner can read KYC rows from the client (shared.kyc_requests).
-- RLS was on with no policies and no GRANT to authenticated, so /admin/kyc showed empty.
-- Apply via: node scripts/ecosystem/apply-kyc-migration.mjs kyc-admin-read-policies.sql

REVOKE ALL ON shared.kyc_requests FROM anon;
REVOKE ALL ON shared.kyc_documents FROM anon;
REVOKE ALL ON shared.payout_profiles FROM anon;

GRANT SELECT ON shared.kyc_requests TO authenticated;
GRANT SELECT ON shared.kyc_documents TO authenticated;
GRANT SELECT ON shared.payout_profiles TO authenticated;

DROP POLICY IF EXISTS kyc_requests_owner_select ON shared.kyc_requests;
CREATE POLICY kyc_requests_owner_select ON shared.kyc_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS kyc_requests_admin_select ON shared.kyc_requests;
CREATE POLICY kyc_requests_admin_select ON shared.kyc_requests
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS kyc_documents_owner ON shared.kyc_documents;
CREATE POLICY kyc_documents_owner ON shared.kyc_documents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS kyc_documents_admin_select ON shared.kyc_documents;
CREATE POLICY kyc_documents_admin_select ON shared.kyc_documents
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS payout_profiles_owner ON shared.payout_profiles;
CREATE POLICY payout_profiles_owner ON shared.payout_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS payout_profiles_admin_select ON shared.payout_profiles;
CREATE POLICY payout_profiles_admin_select ON shared.payout_profiles
  FOR SELECT TO authenticated
  USING (public.is_admin_user());
