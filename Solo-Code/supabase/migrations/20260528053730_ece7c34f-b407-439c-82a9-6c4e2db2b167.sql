-- Remove admin's unrestricted SELECT on profiles (which exposed bank/tax/phone/address to any admin).
-- Admins keep access to non-sensitive identity columns via a dedicated safe view.

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Safe admin view: excludes bank_account_number, bank_account_name, bank_name,
-- tax_id, phone, address, payment_qr_url, terms, social_link, logo_url.
CREATE OR REPLACE VIEW public.admin_profiles_safe
WITH (security_invoker = false) AS
SELECT
  id, user_id, email, display_name, brand_name, avatar_url, tagline,
  created_at, updated_at, last_active_at,
  is_active, deactivated_at, deactivated_by, purge_after, purged_at,
  tester_approved, tester_applied_at,
  onboarding_completed, onboarding_data, persona,
  freelance_field, archetype, archetype_secondary,
  subscription_tier, subscription_seats, currency
FROM public.profiles
WHERE public.has_role(auth.uid(), 'admin'::app_role);

GRANT SELECT ON public.admin_profiles_safe TO authenticated;

COMMENT ON VIEW public.admin_profiles_safe IS
  'Admin-only view exposing non-sensitive profile columns. Sensitive fields (bank, tax_id, phone, address, payment QR) are intentionally omitted; admins must never bulk-read those across users. For per-user destructive ops, use server functions with supabaseAdmin.';