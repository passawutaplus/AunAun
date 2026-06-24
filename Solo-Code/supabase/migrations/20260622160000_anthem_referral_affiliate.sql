-- Anthem referral and affiliate rewards.
-- Referrer: 50 earned PX after the referred user publishes first content.
-- Referred user: 20 welcome PX after registration and 100 welcome PX after activation.

ALTER TABLE shared.wallets
  ADD COLUMN IF NOT EXISTS welcome_px integer NOT NULL DEFAULT 0 CHECK (welcome_px >= 0),
  ADD COLUMN IF NOT EXISTS lifetime_welcome_px integer NOT NULL DEFAULT 0 CHECK (lifetime_welcome_px >= 0),
  ADD COLUMN IF NOT EXISTS lifetime_earned_px integer NOT NULL DEFAULT 0 CHECK (lifetime_earned_px >= 0);

UPDATE shared.gift_limits_config
SET welcome_px_cap = GREATEST(COALESCE(welcome_px_cap, 100), 220),
    updated_at = now()
WHERE id = 1;

CREATE TABLE IF NOT EXISTS shared.referral_program_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  signup_reward_px integer NOT NULL DEFAULT 20 CHECK (signup_reward_px >= 0),
  activation_reward_px integer NOT NULL DEFAULT 100 CHECK (activation_reward_px >= 0),
  referrer_reward_px integer NOT NULL DEFAULT 50 CHECK (referrer_reward_px >= 0),
  registration_window_days integer NOT NULL DEFAULT 7 CHECK (registration_window_days BETWEEN 1 AND 30),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO shared.referral_program_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS shared.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{8,16}$'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'qualified', 'rejected')),
  signup_reward_px integer NOT NULL DEFAULT 0,
  activation_reward_px integer NOT NULL DEFAULT 0,
  referrer_reward_px integer NOT NULL DEFAULT 0,
  registered_at timestamptz NOT NULL DEFAULT now(),
  qualified_at timestamptz,
  qualification_kind text CHECK (qualification_kind IN ('project', 'community_post')),
  qualification_id uuid,
  rejected_reason text,
  CHECK (referrer_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_created
  ON shared.referrals (referrer_id, registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_status_created
  ON shared.referrals (status, registered_at DESC);

CREATE TABLE IF NOT EXISTS shared.referral_reward_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES shared.referrals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_kind text NOT NULL
    CHECK (reward_kind IN ('referred_signup', 'referred_activation', 'referrer_activation')),
  wallet_bucket text NOT NULL CHECK (wallet_bucket IN ('welcome', 'earned')),
  amount_px integer NOT NULL CHECK (amount_px > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referral_id, reward_kind)
);

ALTER TABLE shared.referral_program_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.referral_reward_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_config_public_read ON shared.referral_program_config;
CREATE POLICY referral_config_public_read
  ON shared.referral_program_config FOR SELECT
  USING (true);
DROP POLICY IF EXISTS referral_config_admin_update ON shared.referral_program_config;
CREATE POLICY referral_config_admin_update
  ON shared.referral_program_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS referral_codes_owner_read ON shared.referral_codes;
CREATE POLICY referral_codes_owner_read
  ON shared.referral_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS referrals_participant_read ON shared.referrals;
CREATE POLICY referrals_participant_read
  ON shared.referrals FOR SELECT TO authenticated
  USING (
    referrer_id = auth.uid()
    OR referred_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS referral_ledger_owner_read ON shared.referral_reward_ledger;
CREATE POLICY referral_ledger_owner_read
  ON shared.referral_reward_ledger FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

GRANT SELECT ON shared.referral_program_config TO anon, authenticated;
GRANT UPDATE ON shared.referral_program_config TO authenticated;
GRANT SELECT ON shared.referral_codes, shared.referrals, shared.referral_reward_ledger TO authenticated;
GRANT ALL ON shared.referral_program_config, shared.referral_codes, shared.referrals,
  shared.referral_reward_ledger TO service_role;

CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  result_code text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  SELECT code INTO result_code
  FROM shared.referral_codes
  WHERE user_id = uid AND active = true;
  IF result_code IS NOT NULL THEN RETURN result_code; END IF;

  LOOP
    result_code := upper(encode(gen_random_bytes(6), 'hex'));
    BEGIN
      INSERT INTO shared.referral_codes (user_id, code)
      VALUES (uid, result_code);
      RETURN result_code;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO result_code
      FROM shared.referral_codes
      WHERE user_id = uid AND active = true;
      IF result_code IS NOT NULL THEN RETURN result_code; END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_referral(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized_code text := upper(btrim(coalesce(p_code, '')));
  referrer uuid;
  account_created_at timestamptz;
  email_confirmed_at timestamptz;
  cfg shared.referral_program_config%ROWTYPE;
  referral_row shared.referrals%ROWTYPE;
  existing_content_id uuid;
  existing_content_kind text;
  qualification_result boolean;
  registered_referral_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF normalized_code !~ '^[A-Z0-9]{8,16}$' THEN RAISE EXCEPTION 'INVALID_REFERRAL_CODE'; END IF;

  SELECT * INTO cfg FROM shared.referral_program_config WHERE id = 1;
  IF NOT COALESCE(cfg.enabled, false) THEN RAISE EXCEPTION 'REFERRAL_DISABLED'; END IF;

  SELECT u.created_at, u.email_confirmed_at
  INTO account_created_at, email_confirmed_at
  FROM auth.users u WHERE u.id = uid;
  IF email_confirmed_at IS NULL THEN RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED'; END IF;
  IF account_created_at < now() - make_interval(days => cfg.registration_window_days) THEN
    RAISE EXCEPTION 'REFERRAL_WINDOW_EXPIRED';
  END IF;

  SELECT user_id INTO referrer
  FROM shared.referral_codes
  WHERE code = normalized_code AND active = true;
  IF referrer IS NULL THEN RAISE EXCEPTION 'REFERRAL_CODE_NOT_FOUND'; END IF;
  IF referrer = uid THEN RAISE EXCEPTION 'SELF_REFERRAL'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 11));
  SELECT * INTO referral_row
  FROM shared.referrals
  WHERE referred_user_id = uid;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', referral_row.status,
      'signup_reward_px', referral_row.signup_reward_px,
      'already_registered', true
    );
  END IF;

  INSERT INTO shared.referrals (
    referrer_id, referred_user_id, referral_code, signup_reward_px
  ) VALUES (
    referrer, uid, normalized_code, cfg.signup_reward_px
  )
  RETURNING * INTO referral_row;
  registered_referral_id := referral_row.id;

  INSERT INTO shared.wallets (user_id, welcome_px, lifetime_welcome_px)
  VALUES (uid, cfg.signup_reward_px, cfg.signup_reward_px)
  ON CONFLICT (user_id) DO UPDATE SET
    welcome_px = shared.wallets.welcome_px + EXCLUDED.welcome_px,
    lifetime_welcome_px = shared.wallets.lifetime_welcome_px + EXCLUDED.lifetime_welcome_px,
    updated_at = now();

  IF cfg.signup_reward_px > 0 THEN
    INSERT INTO shared.referral_reward_ledger (
      referral_id, user_id, reward_kind, wallet_bucket, amount_px
    ) VALUES (
      referral_row.id, uid, 'referred_signup', 'welcome', cfg.signup_reward_px
    );
  END IF;

  SELECT content_id, content_kind
  INTO existing_content_id, existing_content_kind
  FROM (
    SELECT p.id AS content_id, 'project'::text AS content_kind, p.created_at
    FROM anthem.projects p
    WHERE p.owner_id = uid AND lower(p.status) = 'published'
    UNION ALL
    SELECT c.id, 'community_post'::text, c.created_at
    FROM anthem.community_posts c
    WHERE c.author_id = uid AND lower(c.status) = 'published'
  ) content
  ORDER BY created_at ASC
  LIMIT 1;

  IF existing_content_id IS NOT NULL THEN
    EXECUTE 'SELECT shared.qualify_referral_for_content($1, $2, $3)'
      INTO qualification_result
      USING uid, existing_content_kind, existing_content_id;
    SELECT * INTO referral_row
    FROM shared.referrals r
    WHERE r.id = registered_referral_id;
  END IF;

  RETURN jsonb_build_object(
    'status', referral_row.status,
    'signup_reward_px', cfg.signup_reward_px,
    'already_registered', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION shared.qualify_referral_for_content(
  p_user_id uuid,
  p_kind text,
  p_content_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  referral_row shared.referrals%ROWTYPE;
  cfg shared.referral_program_config%ROWTYPE;
  email_confirmed_at timestamptz;
BEGIN
  IF p_kind NOT IN ('project', 'community_post') THEN RETURN false; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 12));
  SELECT * INTO referral_row
  FROM shared.referrals
  WHERE referred_user_id = p_user_id AND status = 'registered'
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT * INTO cfg FROM shared.referral_program_config WHERE id = 1;
  IF NOT COALESCE(cfg.enabled, false) THEN RETURN false; END IF;
  SELECT u.email_confirmed_at
  INTO email_confirmed_at
  FROM auth.users u WHERE u.id = p_user_id;

  IF email_confirmed_at IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO shared.wallets (user_id, welcome_px, lifetime_welcome_px)
  VALUES (p_user_id, cfg.activation_reward_px, cfg.activation_reward_px)
  ON CONFLICT (user_id) DO UPDATE SET
    welcome_px = shared.wallets.welcome_px + EXCLUDED.welcome_px,
    lifetime_welcome_px = shared.wallets.lifetime_welcome_px + EXCLUDED.lifetime_welcome_px,
    updated_at = now();

  INSERT INTO shared.wallets (user_id, earned_px, lifetime_earned_px)
  VALUES (referral_row.referrer_id, cfg.referrer_reward_px, cfg.referrer_reward_px)
  ON CONFLICT (user_id) DO UPDATE SET
    earned_px = shared.wallets.earned_px + EXCLUDED.earned_px,
    lifetime_earned_px = shared.wallets.lifetime_earned_px + EXCLUDED.lifetime_earned_px,
    updated_at = now();

  UPDATE shared.referrals
  SET status = 'qualified',
      activation_reward_px = cfg.activation_reward_px,
      referrer_reward_px = cfg.referrer_reward_px,
      qualified_at = now(),
      qualification_kind = p_kind,
      qualification_id = p_content_id
  WHERE id = referral_row.id;

  IF cfg.activation_reward_px > 0 THEN
    INSERT INTO shared.referral_reward_ledger (
      referral_id, user_id, reward_kind, wallet_bucket, amount_px
    ) VALUES (
      referral_row.id, p_user_id, 'referred_activation', 'welcome', cfg.activation_reward_px
    );
  END IF;
  IF cfg.referrer_reward_px > 0 THEN
    INSERT INTO shared.referral_reward_ledger (
      referral_id, user_id, reward_kind, wallet_bucket, amount_px
    ) VALUES (
      referral_row.id, referral_row.referrer_id, 'referrer_activation', 'earned',
      cfg.referrer_reward_px
    );
  END IF;

  INSERT INTO shared.notifications (
    user_id, app, kind, title, body, link, metadata
  ) VALUES
    (
      p_user_id, 'anthem', 'referral_qualified',
      'รับรางวัลภารกิจแรกแล้ว',
      format('คุณได้รับ %s px จากการเผยแพร่ครั้งแรก', cfg.activation_reward_px),
      '/referrals',
      jsonb_build_object('referral_id', referral_row.id, 'amount_px', cfg.activation_reward_px)
    ),
    (
      referral_row.referrer_id, 'anthem', 'referral_reward',
      'เพื่อนทำภารกิจแรกสำเร็จ',
      format('คุณได้รับ %s px จากการชวนเพื่อน', cfg.referrer_reward_px),
      '/referrals',
      jsonb_build_object('referral_id', referral_row.id, 'amount_px', cfg.referrer_reward_px)
    );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION shared.trigger_referral_content_qualification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  row_data jsonb := to_jsonb(NEW);
  content_owner uuid;
  content_status text;
  content_kind text;
BEGIN
  content_status := coalesce(row_data->>'status', '');
  IF TG_TABLE_NAME = 'projects' THEN
    content_owner := nullif(row_data->>'owner_id', '')::uuid;
    content_kind := 'project';
    IF lower(content_status) <> 'published' THEN RETURN NEW; END IF;
  ELSE
    content_owner := nullif(row_data->>'author_id', '')::uuid;
    content_kind := 'community_post';
    IF lower(content_status) <> 'published' THEN RETURN NEW; END IF;
  END IF;

  IF content_owner IS NOT NULL THEN
    PERFORM shared.qualify_referral_for_content(content_owner, content_kind, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_project_qualification ON anthem.projects;
CREATE TRIGGER trg_referral_project_qualification
  AFTER INSERT OR UPDATE OF status ON anthem.projects
  FOR EACH ROW EXECUTE FUNCTION shared.trigger_referral_content_qualification();

DROP TRIGGER IF EXISTS trg_referral_community_qualification ON anthem.community_posts;
CREATE TRIGGER trg_referral_community_qualification
  AFTER INSERT OR UPDATE OF status ON anthem.community_posts
  FOR EACH ROW EXECUTE FUNCTION shared.trigger_referral_content_qualification();

CREATE OR REPLACE FUNCTION public.get_referral_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  code_value text;
  cfg shared.referral_program_config%ROWTYPE;
  referred_record shared.referrals%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  code_value := public.get_or_create_referral_code();
  SELECT * INTO cfg FROM shared.referral_program_config WHERE id = 1;
  SELECT * INTO referred_record FROM shared.referrals WHERE referred_user_id = uid;

  RETURN jsonb_build_object(
    'code', code_value,
    'signup_reward_px', cfg.signup_reward_px,
    'activation_reward_px', cfg.activation_reward_px,
    'referrer_reward_px', cfg.referrer_reward_px,
    'invited_count', (
      SELECT count(*) FROM shared.referrals WHERE referrer_id = uid
    ),
    'qualified_count', (
      SELECT count(*) FROM shared.referrals WHERE referrer_id = uid AND status = 'qualified'
    ),
    'earned_px', (
      SELECT coalesce(sum(amount_px), 0)
      FROM shared.referral_reward_ledger
      WHERE user_id = uid AND reward_kind = 'referrer_activation'
    ),
    'my_referral_status', CASE WHEN referred_record.id IS NULL THEN null ELSE referred_record.status END,
    'my_signup_reward_px', coalesce(referred_record.signup_reward_px, 0),
    'my_activation_reward_px', coalesce(referred_record.activation_reward_px, 0),
    'recent', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'registered_at', r.registered_at,
        'qualified_at', r.qualified_at,
        'display_name', coalesce(p.display_name, 'สมาชิกใหม่')
      ) ORDER BY r.registered_at DESC)
      FROM (
        SELECT * FROM shared.referrals
        WHERE referrer_id = uid
        ORDER BY registered_at DESC
        LIMIT 20
      ) r
      LEFT JOIN public.profiles p ON p.user_id = r.referred_user_id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_referral_code() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.register_referral(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_referral_dashboard() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION shared.qualify_referral_for_content(uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION shared.qualify_referral_for_content(uuid, text, uuid) TO service_role;
