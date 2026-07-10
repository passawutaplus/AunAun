-- Launch security P0 (2026-07-10): profiles RLS, admin bootstrap, private media paths.
-- Canonical: Solo-Code/supabase/migrations/20260710150000_launch_security_p0.sql

-- ========== P0-6: Remove hard-coded admin promotion on signup ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _display_name text;
  _avatar_url text;
  _username text;
BEGIN
  _display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  _avatar_url := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
  );

  IF _avatar_url IS NULL OR _avatar_url = '' THEN
    _avatar_url := COALESCE(public.pick_random_avatar_url(), '');
  END IF;

  _username := NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), '');
  IF _username IS NULL AND NEW.email IS NOT NULL THEN
    _username := split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6);
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, avatar_url, username)
  VALUES (NEW.id, NEW.email, _display_name, COALESCE(_avatar_url, ''), _username)
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.profiles.display_name),
    avatar_url = CASE
      WHEN public.profiles.avatar_url IS NULL OR public.profiles.avatar_url = ''
        THEN EXCLUDED.avatar_url
      ELSE public.profiles.avatar_url
    END,
    username = COALESCE(public.profiles.username, EXCLUDED.username);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ========== P0-5: Public profile surface (safe columns only) ==========
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_barrier = true)
AS
SELECT
  p.user_id,
  p.id,
  p.display_name,
  p.username,
  p.avatar_url,
  p.bio,
  p.role,
  p.skills,
  p.website,
  p.instagram,
  p.facebook,
  p.line_id,
  p.cover_url,
  p.is_verified,
  p.location,
  p.opportunity_status,
  p.opportunity_types,
  p.open_for_work,
  p.open_for_work_badge,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE coalesce(p.account_status, 'active') = 'active';

GRANT SELECT ON public.profiles_public TO anon, authenticated;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles_select_public_active" ON public.profiles;
CREATE POLICY "profiles_select_public_active"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (coalesce(account_status, 'active') = 'active');

-- ========== P0-3: Restrict profile UPDATE to safe user-editable columns ==========
REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  display_name,
  username,
  bio,
  role,
  phone,
  website,
  line_id,
  facebook,
  instagram,
  notify_email,
  notify_hire,
  notify_job_match,
  notify_collab,
  skills,
  experience,
  location,
  cover_url,
  avatar_url,
  preferred_employment_types,
  preferred_categories,
  feed_interests,
  feed_interests_at,
  opportunity_status,
  opportunity_types,
  brand_name,
  onboarding_visits
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.profiles_block_sensitive_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.frozen_at IS DISTINCT FROM OLD.frozen_at
     OR NEW.frozen_reason IS DISTINCT FROM OLD.frozen_reason
     OR NEW.risk_score IS DISTINCT FROM OLD.risk_score
     OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.subscription_seats IS DISTINCT FROM OLD.subscription_seats
     OR NEW.email IS DISTINCT FROM OLD.email
  THEN
    RAISE EXCEPTION 'PROFILE_PROTECTED_FIELD' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_block_sensitive_update ON public.profiles;
CREATE TRIGGER trg_profiles_block_sensitive_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_sensitive_update();

-- ========== P0-4: Tighten project-media ==========
DROP POLICY IF EXISTS "anthem media public read" ON storage.objects;
CREATE POLICY "anthem media public read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] NOT IN ('kyc', 'chat')
    AND NOT ((storage.foldername(name))[3] = 'cv')
  );

CREATE OR REPLACE FUNCTION public.kyc_path_owner_mutable(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared, public, storage
AS $$
  SELECT
    (storage.foldername(_path))[1] = 'anthem'
    AND (storage.foldername(_path))[2] = 'kyc'
    AND (storage.foldername(_path))[3] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1
      FROM shared.kyc_requests r
      WHERE r.user_id = auth.uid()
        AND r.status IN ('pending', 'approved')
    );
$$;

REVOKE ALL ON FUNCTION public.kyc_path_owner_mutable(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kyc_path_owner_mutable(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "kyc owner delete" ON storage.objects;
CREATE POLICY "kyc owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-media'
    AND public.kyc_path_owner_mutable(name)
  );

CREATE OR REPLACE FUNCTION public.assert_launch_payments_enabled()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'PAYMENTS_DISABLED_LAUNCH'
    USING ERRCODE = 'P0001',
          MESSAGE = 'Payments are disabled during launch';
END;
$$;

REVOKE ALL ON FUNCTION public.assert_launch_payments_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_launch_payments_enabled() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
