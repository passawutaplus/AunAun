-- Fix Settings / own-profile select('*') 500 after column-level REVOKE.
-- Authenticated RLS is own-row (+ admin); public directory uses profiles_public.
-- Applied 2026-07-22 on zkflkpbmbozrchqncpzi.

GRANT SELECT ON public.profiles TO authenticated;

GRANT UPDATE (
  billing_type, legal_name, company_name, billing_address, branch,
  contact_person, contact_role, vat_registered,
  notify_email, notify_hire, notify_collab, notify_job_match,
  preferred_employment_types, username_changed_at,
  bank_name, bank_account_name, feed_interests, feed_interests_at
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile_sensitive()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  prow public.profiles%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT * INTO prow FROM public.profiles WHERE user_id = uid OR id = uid LIMIT 1;
  IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  RETURN jsonb_build_object(
    'email', prow.email,
    'phone', prow.phone,
    'tax_id', prow.tax_id,
    'bank_account_number', prow.bank_account_number,
    'bank_name', prow.bank_name,
    'bank_account_name', prow.bank_account_name,
    'payment_qr_url', prow.payment_qr_url,
    'stripe_connect_account_id', prow.stripe_connect_account_id,
    'address', prow.address,
    'billing_type', prow.billing_type,
    'legal_name', prow.legal_name,
    'company_name', prow.company_name,
    'billing_address', prow.billing_address,
    'branch', prow.branch,
    'contact_person', prow.contact_person,
    'contact_role', prow.contact_role,
    'vat_registered', prow.vat_registered,
    'account_status', prow.account_status,
    'is_active', prow.is_active
  );
END;
$$;
