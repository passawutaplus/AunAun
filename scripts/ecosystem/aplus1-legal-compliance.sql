-- Aplus1 legal & compliance MVP (PDPA consent logs, copyright reports, privacy requests)
-- Schema: anthem.*  |  RPCs: public.*

-- ── Policy versions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anthem.policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type text NOT NULL CHECK (policy_type IN ('terms', 'privacy', 'cookies', 'community', 'attestation')),
  version text NOT NULL,
  title text NOT NULL,
  url text,
  content_hash text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  effective_at timestamptz NOT NULL DEFAULT now(),
  requires_reconsent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_type, version)
);

CREATE INDEX IF NOT EXISTS idx_policy_versions_active
  ON anthem.policy_versions (policy_type, effective_at DESC)
  WHERE status = 'active';

-- Seed current policy metadata (content lives in public pages)
INSERT INTO anthem.policy_versions (policy_type, version, title, url, status, effective_at, requires_reconsent)
VALUES
  ('terms', '2026-07-03', 'ข้อกำหนดการใช้งาน', '/legal/terms', 'active', '2026-07-03'::timestamptz, false),
  ('privacy', '2026-07-03', 'นโยบายความเป็นส่วนตัว (PDPA)', '/legal/privacy', 'active', '2026-07-03'::timestamptz, false),
  ('cookies', '2026-07-03', 'นโยบายคุกกี้', '/legal/cookies', 'active', '2026-07-03'::timestamptz, false),
  ('attestation', '2026-06-14', 'คำแถลการยืนยันสิทธิ์', '/legal/ip#attestation', 'active', '2026-06-14'::timestamptz, false)
ON CONFLICT (policy_type, version) DO NOTHING;

-- ── User consents (append-only) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anthem.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_version_id uuid REFERENCES anthem.policy_versions(id),
  consent_type text NOT NULL CHECK (consent_type IN ('terms', 'privacy_notice', 'age_parental_ack', 'cookies')),
  accepted boolean NOT NULL DEFAULT true,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent text,
  locale text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user
  ON anthem.user_consents (user_id, consent_type, accepted_at DESC);

ALTER TABLE anthem.user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_consents_select_own ON anthem.user_consents;
CREATE POLICY user_consents_select_own ON anthem.user_consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS user_consents_insert_own ON anthem.user_consents;
CREATE POLICY user_consents_insert_own ON anthem.user_consents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── Cookie consents ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anthem.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  policy_version_id uuid REFERENCES anthem.policy_versions(id),
  necessary boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  preferences boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_cookie_consents_user
  ON anthem.cookie_consents (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE anthem.cookie_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cookie_consents_select_own ON anthem.cookie_consents;
CREATE POLICY cookie_consents_select_own ON anthem.cookie_consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS cookie_consents_insert ON anthem.cookie_consents;
CREATE POLICY cookie_consents_insert ON anthem.cookie_consents
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ── Copyright reports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anthem.copyright_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claimant_name text NOT NULL,
  claimant_email text NOT NULL,
  claimant_role text,
  original_work_description text NOT NULL,
  original_work_url text,
  infringing_url text NOT NULL,
  infringing_subject_type text DEFAULT 'project',
  infringing_subject_id uuid,
  good_faith_confirmed boolean NOT NULL DEFAULT false,
  authority_confirmed boolean NOT NULL DEFAULT false,
  signature_text text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'hidden', 'rejected', 'resolved')),
  action_taken text,
  action_taken_at timestamptz,
  admin_note text,
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copyright_reports_status
  ON anthem.copyright_reports (status, created_at DESC);

ALTER TABLE anthem.copyright_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copyright_reports_insert ON anthem.copyright_reports;
CREATE POLICY copyright_reports_insert ON anthem.copyright_reports
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS copyright_reports_admin ON anthem.copyright_reports;
CREATE POLICY copyright_reports_admin ON anthem.copyright_reports
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ── Privacy requests (deletion, export, access, correction) ───────────────────
CREATE TABLE IF NOT EXISTS anthem.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('access', 'export', 'delete', 'correct', 'object', 'withdraw')),
  description text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'approved', 'rejected', 'completed')),
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_user
  ON anthem.privacy_requests (user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_status
  ON anthem.privacy_requests (status, requested_at DESC);

ALTER TABLE anthem.privacy_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS privacy_requests_select_own ON anthem.privacy_requests;
CREATE POLICY privacy_requests_select_own ON anthem.privacy_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS privacy_requests_insert_own ON anthem.privacy_requests;
CREATE POLICY privacy_requests_insert_own ON anthem.privacy_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS privacy_requests_admin_update ON anthem.privacy_requests;
CREATE POLICY privacy_requests_admin_update ON anthem.privacy_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ── Helpers ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION anthem.active_policy_id(_policy_type text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM anthem.policy_versions
  WHERE policy_type = _policy_type AND status = 'active'
  ORDER BY effective_at DESC
  LIMIT 1;
$$;

-- Record signup consents (terms + privacy + age)
CREATE OR REPLACE FUNCTION public.record_signup_consents(
  _terms_version text DEFAULT '2026-07-03',
  _privacy_version text DEFAULT '2026-07-03',
  _locale text DEFAULT 'th'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  terms_pid uuid;
  privacy_pid uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน';
  END IF;

  SELECT id INTO terms_pid FROM anthem.policy_versions
  WHERE policy_type = 'terms' AND version = _terms_version AND status = 'active'
  LIMIT 1;

  SELECT id INTO privacy_pid FROM anthem.policy_versions
  WHERE policy_type = 'privacy' AND version = _privacy_version AND status = 'active'
  LIMIT 1;

  IF terms_pid IS NOT NULL THEN
    INSERT INTO anthem.user_consents (user_id, policy_version_id, consent_type, locale)
    VALUES (uid, terms_pid, 'terms', _locale);
  END IF;

  IF privacy_pid IS NOT NULL THEN
    INSERT INTO anthem.user_consents (user_id, policy_version_id, consent_type, locale)
    VALUES (uid, privacy_pid, 'privacy_notice', _locale);
  END IF;

  INSERT INTO anthem.user_consents (user_id, consent_type, locale, metadata)
  VALUES (uid, 'age_parental_ack', _locale, '{"source":"signup"}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.record_signup_consents(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_signup_consents(text, text, text) TO authenticated;

-- Log cookie preference
CREATE OR REPLACE FUNCTION public.log_cookie_consent(
  _analytics boolean,
  _preferences boolean DEFAULT false,
  _marketing boolean DEFAULT false,
  _anonymous_id text DEFAULT NULL,
  _policy_version text DEFAULT '2026-07-03'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  pid uuid;
  row_id uuid;
BEGIN
  SELECT id INTO pid FROM anthem.policy_versions
  WHERE policy_type = 'cookies' AND version = _policy_version AND status = 'active'
  LIMIT 1;

  INSERT INTO anthem.cookie_consents (
    anonymous_id, user_id, policy_version_id,
    necessary, analytics, marketing, preferences
  ) VALUES (
    _anonymous_id, uid, pid,
    true, _analytics, _marketing, _preferences
  )
  RETURNING id INTO row_id;

  IF uid IS NOT NULL AND pid IS NOT NULL THEN
    INSERT INTO anthem.user_consents (user_id, policy_version_id, consent_type, metadata)
    VALUES (
      uid, pid, 'cookies',
      jsonb_build_object('analytics', _analytics, 'preferences', _preferences, 'marketing', _marketing)
    );
  END IF;

  RETURN row_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_cookie_consent(boolean, boolean, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_cookie_consent(boolean, boolean, boolean, text, text) TO authenticated, anon;

-- Copyright takedown report
CREATE OR REPLACE FUNCTION public.submit_copyright_report(
  _claimant_name text,
  _claimant_email text,
  _original_work_description text,
  _infringing_url text,
  _signature_text text,
  _claimant_role text DEFAULT NULL,
  _original_work_url text DEFAULT NULL,
  _good_faith_confirmed boolean DEFAULT false,
  _authority_confirmed boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  row_id uuid;
  recent int;
BEGIN
  IF trim(coalesce(_claimant_name, '')) = ''
     OR trim(coalesce(_claimant_email, '')) = ''
     OR trim(coalesce(_original_work_description, '')) = ''
     OR trim(coalesce(_infringing_url, '')) = ''
     OR trim(coalesce(_signature_text, '')) = '' THEN
    RAISE EXCEPTION 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ';
  END IF;

  IF NOT (_good_faith_confirmed AND _authority_confirmed) THEN
    RAISE EXCEPTION 'กรุณายืนยันคำแถลการณ์ก่อนส่ง';
  END IF;

  SELECT count(*) INTO recent
  FROM anthem.copyright_reports
  WHERE claimant_email = trim(_claimant_email)
    AND created_at > now() - interval '24 hours';

  IF recent >= 5 THEN
    RAISE EXCEPTION 'ส่งคำร้องได้ไม่เกิน 5 ครั้งต่อวัน — ลองใหม่พรุ่งนี้';
  END IF;

  INSERT INTO anthem.copyright_reports (
    claimant_name, claimant_email, claimant_role,
    original_work_description, original_work_url, infringing_url,
    good_faith_confirmed, authority_confirmed, signature_text,
    reporter_user_id
  ) VALUES (
    trim(_claimant_name), trim(_claimant_email), nullif(trim(_claimant_role), ''),
    trim(_original_work_description), nullif(trim(_original_work_url), ''), trim(_infringing_url),
    _good_faith_confirmed, _authority_confirmed, trim(_signature_text),
    auth.uid()
  )
  RETURNING id INTO row_id;

  RETURN row_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_copyright_report(text, text, text, text, text, text, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_copyright_report(text, text, text, text, text, text, text, boolean, boolean) TO authenticated, anon;

-- Privacy request (deletion, export, etc.)
CREATE OR REPLACE FUNCTION public.submit_privacy_request(
  _request_type text,
  _description text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  row_id uuid;
  open_dup boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน';
  END IF;

  IF _request_type NOT IN ('access', 'export', 'delete', 'correct', 'object', 'withdraw') THEN
    RAISE EXCEPTION 'ประเภทคำขอไม่ถูกต้อง';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM anthem.privacy_requests
    WHERE user_id = uid
      AND request_type = _request_type
      AND status IN ('new', 'reviewing', 'approved')
  ) INTO open_dup;

  IF open_dup THEN
    RAISE EXCEPTION 'มีคำขอประเภทนี้ที่รอดำเนินการอยู่แล้ว';
  END IF;

  INSERT INTO anthem.privacy_requests (user_id, request_type, description)
  VALUES (uid, _request_type, nullif(trim(_description), ''))
  RETURNING id INTO row_id;

  RETURN row_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_privacy_request(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_privacy_request(text, text) TO authenticated;

-- Check if user needs policy re-consent
CREATE OR REPLACE FUNCTION public.user_consent_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  missing text[] := '{}';
  terms_v text;
  privacy_v text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  FOR terms_v IN
    SELECT pv.version FROM anthem.policy_versions pv
    WHERE pv.policy_type = 'terms' AND pv.status = 'active' AND pv.requires_reconsent = true
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM anthem.user_consents uc
      JOIN anthem.policy_versions pv ON pv.id = uc.policy_version_id
      WHERE uc.user_id = uid AND uc.consent_type = 'terms' AND pv.version = terms_v
    ) THEN
      missing := array_append(missing, 'terms');
    END IF;
  END LOOP;

  FOR privacy_v IN
    SELECT pv.version FROM anthem.policy_versions pv
    WHERE pv.policy_type = 'privacy' AND pv.status = 'active' AND pv.requires_reconsent = true
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM anthem.user_consents uc
      JOIN anthem.policy_versions pv ON pv.id = uc.policy_version_id
      WHERE uc.user_id = uid AND uc.consent_type = 'privacy_notice' AND pv.version = privacy_v
    ) THEN
      missing := array_append(missing, 'privacy');
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'authenticated', true,
    'needs_reconsent', coalesce(array_length(missing, 1), 0) > 0,
    'missing', to_jsonb(missing)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.user_consent_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_consent_status() TO authenticated;

-- Re-acknowledge updated policies
CREATE OR REPLACE FUNCTION public.record_policy_reconsent(
  _terms_version text DEFAULT NULL,
  _privacy_version text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  pid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;

  IF _terms_version IS NOT NULL THEN
    SELECT id INTO pid FROM anthem.policy_versions
    WHERE policy_type = 'terms' AND version = _terms_version AND status = 'active' LIMIT 1;
    IF pid IS NOT NULL THEN
      INSERT INTO anthem.user_consents (user_id, policy_version_id, consent_type, metadata)
      VALUES (uid, pid, 'terms', '{"source":"reconsent"}'::jsonb);
    END IF;
  END IF;

  IF _privacy_version IS NOT NULL THEN
    SELECT id INTO pid FROM anthem.policy_versions
    WHERE policy_type = 'privacy' AND version = _privacy_version AND status = 'active' LIMIT 1;
    IF pid IS NOT NULL THEN
      INSERT INTO anthem.user_consents (user_id, policy_version_id, consent_type, metadata)
      VALUES (uid, pid, 'privacy_notice', '{"source":"reconsent"}'::jsonb);
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_policy_reconsent(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_policy_reconsent(text, text) TO authenticated;

-- Admin compliance overview
CREATE OR REPLACE FUNCTION public.admin_compliance_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  RETURN jsonb_build_object(
    'open_reports', (
      SELECT count(*)::int FROM anthem.user_reports WHERE status IN ('open', 'reviewing')
    ),
    'copyright_new', (
      SELECT count(*)::int FROM anthem.copyright_reports WHERE status IN ('new', 'reviewing')
    ),
    'privacy_new', (
      SELECT count(*)::int FROM anthem.privacy_requests WHERE status IN ('new', 'reviewing')
    ),
    'privacy_delete', (
      SELECT count(*)::int FROM anthem.privacy_requests
      WHERE request_type = 'delete' AND status IN ('new', 'reviewing', 'approved')
    ),
    'consents_7d', (
      SELECT count(*)::int FROM anthem.user_consents WHERE accepted_at > now() - interval '7 days'
    ),
    'cookie_logs_7d', (
      SELECT count(*)::int FROM anthem.cookie_consents WHERE created_at > now() - interval '7 days'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_compliance_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_compliance_overview() TO authenticated;
