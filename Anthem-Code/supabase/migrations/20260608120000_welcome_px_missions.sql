-- Welcome PX missions: up to 500 px (gift-only) unlocked via onboarding tasks

-- ─── wallets: welcome_px bucket ─────────────────────────────────────────────
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS welcome_px integer NOT NULL DEFAULT 0 CHECK (welcome_px >= 0),
  ADD COLUMN IF NOT EXISTS lifetime_welcome_px integer NOT NULL DEFAULT 0 CHECK (lifetime_welcome_px >= 0);

COMMENT ON COLUMN public.wallets.welcome_px IS 'Welcome bonus PX — send gifts only, no cashout';
COMMENT ON COLUMN public.wallets.lifetime_welcome_px IS 'Total welcome PX ever granted (cap 500)';

-- ─── profiles: server-side visit flags ────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_visits jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ─── mission catalog ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.welcome_mission_catalog (
  id text PRIMARY KEY,
  title_th text NOT NULL,
  description_th text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  reward_px integer NOT NULL CHECK (reward_px > 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO public.welcome_mission_catalog (id, title_th, description_th, difficulty, reward_px, sort_order)
VALUES
  ('explore_feed', 'สำรวจฟีดผลงาน', '', 'easy', 40, 1),
  ('like', 'กดถูกใจผลงาน', '', 'easy', 40, 2),
  ('follow', 'ติดตามครีเอเตอร์', '', 'easy', 50, 3),
  ('jobs', 'ดูบอร์ดงาน', '', 'easy', 50, 4),
  ('skills', 'ใส่ทักษะ', '', 'medium', 60, 5),
  ('share_profile', 'แชร์ลิงก์โปรไฟล์', '', 'medium', 70, 6),
  ('profile', 'ตั้งโปรไฟล์ให้พร้อม', '', 'medium', 80, 7),
  ('publish_project', 'เผยแพร่ผลงานชิ้นแรก', '', 'hard', 110, 8)
ON CONFLICT (id) DO UPDATE SET
  reward_px = EXCLUDED.reward_px,
  difficulty = EXCLUDED.difficulty,
  sort_order = EXCLUDED.sort_order;

-- ─── claims & ledger ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.welcome_mission_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id text NOT NULL REFERENCES public.welcome_mission_catalog(id),
  reward_px integer NOT NULL CHECK (reward_px > 0),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_welcome_mission_claims_user ON public.welcome_mission_claims(user_id);

CREATE TABLE IF NOT EXISTS public.welcome_px_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  mission_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_welcome_px_ledger_user ON public.welcome_px_ledger(user_id, created_at DESC);

ALTER TABLE public.welcome_mission_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_px_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_mission_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own welcome claims" ON public.welcome_mission_claims;
CREATE POLICY "Users view own welcome claims"
  ON public.welcome_mission_claims FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own welcome ledger" ON public.welcome_px_ledger;
CREATE POLICY "Users view own welcome ledger"
  ON public.welcome_px_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone reads welcome catalog" ON public.welcome_mission_catalog;
CREATE POLICY "Anyone reads welcome catalog"
  ON public.welcome_mission_catalog FOR SELECT TO authenticated
  USING (active = true);

GRANT SELECT ON public.welcome_mission_claims TO authenticated;
GRANT SELECT ON public.welcome_px_ledger TO authenticated;
GRANT SELECT ON public.welcome_mission_catalog TO authenticated;
GRANT ALL ON public.welcome_mission_claims TO service_role;
GRANT ALL ON public.welcome_px_ledger TO service_role;
GRANT ALL ON public.welcome_mission_catalog TO service_role;

-- ─── helpers ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._profile_auth_id(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT id FROM public.profiles WHERE id = _uid LIMIT 1),
    (SELECT user_id FROM public.profiles WHERE user_id = _uid LIMIT 1),
    _uid
  );
$$;

CREATE OR REPLACE FUNCTION public._welcome_visit(_uid uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT (onboarding_visits ->> _key)::boolean
     FROM public.profiles
     WHERE id = _uid OR user_id = _uid
     LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public._check_welcome_mission(_uid uuid, _mission_id text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.profiles%ROWTYPE;
  pub_count int;
  follow_count int;
  like_count int;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _uid OR user_id = _uid LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;

  CASE _mission_id
    WHEN 'profile' THEN
      RETURN COALESCE(length(trim(p.avatar_url)), 0) > 0
        AND COALESCE(length(trim(p.username)), 0) > 0
        AND COALESCE(length(trim(p.bio)), 0) >= 20;
    WHEN 'explore_feed' THEN
      RETURN public._welcome_visit(_uid, 'explore_feed');
    WHEN 'publish_project' THEN
      SELECT COUNT(*)::int INTO pub_count FROM public.projects
        WHERE owner_id = _uid AND status = 'Published';
      RETURN pub_count >= 1;
    WHEN 'skills' THEN
      RETURN COALESCE(array_length(p.skills, 1), 0) >= 1;
    WHEN 'follow' THEN
      SELECT COUNT(*)::int INTO follow_count FROM public.follows WHERE follower_id = _uid;
      RETURN follow_count >= 1;
    WHEN 'like' THEN
      SELECT COUNT(*)::int INTO like_count FROM public.project_likes WHERE user_id = _uid;
      RETURN like_count >= 1;
    WHEN 'jobs' THEN
      RETURN public._welcome_visit(_uid, 'jobs');
    WHEN 'share_profile' THEN
      RETURN public._welcome_visit(_uid, 'share_profile');
    ELSE
      RETURN false;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_onboarding_visit(_visit_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'anthem', 'shared', 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  allowed text[] := ARRAY['explore_feed', 'jobs', 'share_profile'];
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  IF NOT (_visit_id = ANY(allowed)) THEN
    RAISE EXCEPTION 'INVALID: visit id ไม่รองรับ';
  END IF;

  UPDATE public.profiles
  SET onboarding_visits = onboarding_visits || jsonb_build_object(_visit_id, true)
  WHERE id = uid OR user_id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE: ไม่พบโปรไฟล์';
  END IF;

  RETURN jsonb_build_object('visit_id', _visit_id, 'ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_welcome_mission(_mission_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'anthem', 'shared', 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  min_account_age_hours int;
  prof public.profiles%ROWTYPE;
  cat public.welcome_mission_catalog%ROWTYPE;
  w public.wallets%ROWTYPE;
  cap constant int := 500;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;

  SELECT * INTO cat FROM public.welcome_mission_catalog
    WHERE id = _mission_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID: ไม่พบภารกิจ'; END IF;

  IF EXISTS (SELECT 1 FROM public.welcome_mission_claims WHERE user_id = uid AND mission_id = _mission_id) THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED: รับรางวัลภารกิจนี้แล้ว';
  END IF;

  min_account_age_hours := 1;
  SELECT glc.min_account_age_hours INTO min_account_age_hours
    FROM shared.gift_limits_config glc WHERE glc.id = 1;
  min_account_age_hours := COALESCE(min_account_age_hours, 1);

  SELECT * INTO prof FROM public.profiles WHERE id = uid OR user_id = uid LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE: ไม่พบโปรไฟล์'; END IF;

  IF prof.created_at > now() - make_interval(hours => min_account_age_hours) THEN
    RAISE EXCEPTION 'NEW_ACCOUNT: บัญชีใหม่เกินไป กรุณารออย่างน้อย % ชั่วโมง', min_account_age_hours;
  END IF;

  IF NOT public._check_welcome_mission(uid, _mission_id) THEN
    RAISE EXCEPTION 'NOT_COMPLETE: ยังทำภารกิจไม่ครบ';
  END IF;

  PERFORM public.ensure_wallet(uid);
  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;

  IF w.lifetime_welcome_px + cat.reward_px > cap THEN
    RAISE EXCEPTION 'CAP_EXCEEDED: เกินเพดาน Welcome Bonus % px', cap;
  END IF;

  UPDATE public.wallets
  SET welcome_px = welcome_px + cat.reward_px,
      lifetime_welcome_px = lifetime_welcome_px + cat.reward_px,
      updated_at = now()
  WHERE user_id = uid;

  INSERT INTO public.welcome_mission_claims (user_id, mission_id, reward_px)
  VALUES (uid, _mission_id, cat.reward_px);

  INSERT INTO public.welcome_px_ledger (user_id, delta, reason, mission_id)
  VALUES (uid, cat.reward_px, 'mission_reward', _mission_id);

  RETURN jsonb_build_object(
    'mission_id', _mission_id,
    'reward_px', cat.reward_px,
    'welcome_px', (SELECT welcome_px FROM public.wallets WHERE user_id = uid),
    'lifetime_welcome_px', (SELECT lifetime_welcome_px FROM public.wallets WHERE user_id = uid),
    'cap', cap
  );
END;
$$;

-- Gift balance: welcome (no holding) + purchased (with holding)
CREATE OR REPLACE FUNCTION public.available_gift_px(_uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'anthem', 'shared', 'public' AS $$
  SELECT COALESCE(
    (SELECT welcome_px FROM public.wallets WHERE user_id = _uid),
    0
  ) + public.available_purchased_px(_uid);
$$;

-- ─── send_gift v3: spend welcome_px first ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_gift(_recipient_id uuid, _gift_id uuid, _message text DEFAULT '', _project_id uuid DEFAULT NULL)
RETURNS gift_transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'anthem', 'shared', 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  g public.gifts;
  tx public.gift_transactions;
  min_account_age_hours int;
  daily_limit_verified int;
  daily_limit_unverified int;
  velocity_per_hour int;
  sender_profile public.profiles;
  recipient_profile public.profiles;
  available int;
  daily int;
  velocity int;
  daily_cap int;
  circular_count int;
  w public.wallets%ROWTYPE;
  price int;
  from_welcome int;
  from_purchased int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  IF uid = _recipient_id THEN RAISE EXCEPTION 'INVALID: ส่งให้ตัวเองไม่ได้'; END IF;

  min_account_age_hours := 1;
  daily_limit_verified := 5000;
  daily_limit_unverified := 500;
  velocity_per_hour := 10;
  SELECT glc.min_account_age_hours, glc.daily_limit_verified, glc.daily_limit_unverified, glc.velocity_per_hour
    INTO min_account_age_hours, daily_limit_verified, daily_limit_unverified, velocity_per_hour
    FROM shared.gift_limits_config glc WHERE glc.id = 1;
  min_account_age_hours := COALESCE(min_account_age_hours, 1);
  daily_limit_verified := COALESCE(daily_limit_verified, 5000);
  daily_limit_unverified := COALESCE(daily_limit_unverified, 500);
  velocity_per_hour := COALESCE(velocity_per_hour, 10);

  SELECT * INTO g FROM public.gifts WHERE id = _gift_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID: ไม่พบของขวัญ'; END IF;
  price := g.price_px;

  SELECT * INTO sender_profile FROM public.profiles WHERE id = uid OR user_id = uid LIMIT 1;
  SELECT * INTO recipient_profile FROM public.profiles WHERE id = _recipient_id OR user_id = _recipient_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID: ไม่พบผู้รับ';
  END IF;

  IF sender_profile.account_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'ACCOUNT_FROZEN: บัญชีของคุณถูกระงับชั่วคราว';
  END IF;
  IF recipient_profile.account_status = 'frozen' THEN
    RAISE EXCEPTION 'RECIPIENT_FROZEN: ผู้รับถูกระงับบัญชี';
  END IF;

  IF sender_profile.created_at > now() - make_interval(hours => min_account_age_hours) THEN
    RAISE EXCEPTION 'NEW_ACCOUNT: บัญชีใหม่เกินไป กรุณารออย่างน้อย % ชั่วโมง', min_account_age_hours;
  END IF;

  PERFORM public.ensure_wallet(uid);
  PERFORM public.ensure_wallet(_recipient_id);

  available := public.available_gift_px(uid);
  IF available < price THEN
    RAISE EXCEPTION 'INSUFFICIENT: ยอดพร้อมส่งของขวัญ % px ไม่พอ (มี % px)', price, available;
  END IF;

  daily := public.daily_gift_total(uid);
  daily_cap := CASE WHEN sender_profile.is_verified THEN daily_limit_verified ELSE daily_limit_unverified END;
  IF daily + price > daily_cap THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED: เกินเพดานต่อวัน (% px)%', daily_cap,
      CASE WHEN sender_profile.is_verified THEN '' ELSE ' — ยืนยันตัวตนเพื่อเพิ่มเพดาน' END;
  END IF;

  SELECT COUNT(*) INTO velocity FROM public.gift_transactions
    WHERE sender_id = uid AND created_at > now() - interval '1 hour';
  IF velocity >= velocity_per_hour THEN
    RAISE EXCEPTION 'VELOCITY: ส่งของขวัญถี่เกินไป กรุณารอสักครู่';
  END IF;

  SELECT COUNT(*) INTO circular_count FROM public.gift_transactions
    WHERE sender_id = _recipient_id AND recipient_id = uid
      AND created_at > now() - interval '7 days';
  IF circular_count > 0 THEN
    INSERT INTO public.aml_flags(user_id, flag_type, severity, details)
    VALUES (uid, 'circular_transfer', 'medium',
      jsonb_build_object('counterparty', _recipient_id, 'reverse_count', circular_count, 'amount_px', price));
  END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  from_welcome := LEAST(w.welcome_px, price);
  from_purchased := price - from_welcome;

  IF from_purchased > 0 AND public.available_purchased_px(uid) < from_purchased THEN
    RAISE EXCEPTION 'HOLDING_PERIOD: ยอด purchased พร้อมใช้ไม่พอ';
  END IF;

  UPDATE public.wallets
  SET welcome_px = welcome_px - from_welcome,
      purchased_px = purchased_px - from_purchased,
      lifetime_spent_px = lifetime_spent_px + price,
      updated_at = now()
  WHERE user_id = uid;

  IF from_welcome > 0 THEN
    INSERT INTO public.welcome_px_ledger (user_id, delta, reason, mission_id)
    VALUES (uid, -from_welcome, 'gift_sent', NULL);
  END IF;

  UPDATE public.wallets
  SET earned_px = earned_px + price,
      lifetime_earned_px = lifetime_earned_px + price,
      updated_at = now()
  WHERE user_id = _recipient_id;

  INSERT INTO public.gift_transactions(sender_id, recipient_id, gift_id, price_px, message, project_id)
    VALUES (uid, _recipient_id, _gift_id, price, COALESCE(_message,''), _project_id)
    RETURNING * INTO tx;
  RETURN tx;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_onboarding_visit(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_welcome_mission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.available_gift_px(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public._check_welcome_mission(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._welcome_visit(uuid, text) FROM PUBLIC, anon, authenticated;
