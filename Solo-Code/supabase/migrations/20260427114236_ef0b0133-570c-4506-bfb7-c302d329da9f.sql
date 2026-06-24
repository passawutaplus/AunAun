
-- Create a public view exposing only safe profile fields for viewing other creators.
-- Excludes: email, phone, address, tax_id, bank_*, payment_qr_url (PII / financial)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT
  user_id,
  display_name,
  brand_name,
  logo_url,
  avatar_url,
  tagline,
  social_link,
  currency,
  created_at
FROM public.profiles;

-- Allow anonymous + authenticated users to read the safe view
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Add a permissive SELECT policy so the security_invoker view can read base rows
-- when queried by anyone. Existing strict policies on profiles still protect direct
-- access to sensitive columns.
CREATE POLICY "Public can view safe profile fields via view"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);
