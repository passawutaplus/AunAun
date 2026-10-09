
-- ============================================================
-- 1. PROFILES: KYC + account status + risk score
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','frozen','under_review')),
  ADD COLUMN IF NOT EXISTS frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS frozen_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS risk_score int NOT NULL DEFAULT 0;

-- ============================================================
-- 2. WALLETS: split balance into purchased + earned
-- ============================================================
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS purchased_px integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earned_px integer NOT NULL DEFAULT 0;

-- Migrate existing balance into purchased (safer per plan)
UPDATE public.wallets SET purchased_px = balance_px WHERE balance_px > 0 AND purchased_px = 0;

-- Drop & recreate balance_px as generated column
ALTER TABLE public.wallets DROP COLUMN IF EXISTS balance_px;
ALTER TABLE public.wallets ADD COLUMN balance_px integer GENERATED ALWAYS AS (purchased_px + earned_px) STORED;

-- ============================================================
-- 3. WALLET_TOPUPS: holding period
-- ============================================================
ALTER TABLE public.wallet_topups
  ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours');

-- Backfill: existing topups already available
UPDATE public.wallet_topups SET available_at = created_at WHERE available_at > created_at + interval '23 hours';

-- ============================================================
-- 4. gift_limits_config (singleton)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gift_limits_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_limit_unverified int NOT NULL DEFAULT 500,
  daily_limit_verified int NOT NULL DEFAULT 5000,
  velocity_per_hour int NOT NULL DEFAULT 10,
  hold_hours int NOT NULL DEFAULT 24,
  min_account_age_hours int NOT NULL DEFAULT 1,
  max_topup_per_tx int NOT NULL DEFAULT 100000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.gift_limits_config(id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT ON public.gift_limits_config TO authenticated, anon;
GRANT ALL ON public.gift_limits_config TO service_role;
ALTER TABLE public.gift_limits_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read limits config" ON public.gift_limits_config FOR SELECT USING (true);
CREATE POLICY "Admins update limits" ON public.gift_limits_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- ============================================================
-- 5. aml_flags
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aml_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_type text NOT NULL CHECK (flag_type IN ('velocity','circular_transfer','new_account_burst','large_amount','self_network','manual')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','dismissed','actioned')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aml_flags_status_created ON public.aml_flags(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aml_flags_user ON public.aml_flags(user_id);

GRANT SELECT, INSERT, UPDATE ON public.aml_flags TO authenticated;
GRANT ALL ON public.aml_flags TO service_role;
ALTER TABLE public.aml_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read aml_flags" ON public.aml_flags FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update aml_flags" ON public.aml_flags FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
-- INSERT happens only via SECURITY DEFINER functions/triggers

-- ============================================================
-- 6. kyc_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kyc_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  contact_note text NOT NULL DEFAULT '',
  admin_note text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kyc_one_pending_per_user EXCLUDE (user_id WITH =) WHERE (status = 'pending')
);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON public.kyc_requests(status, submitted_at DESC);

GRANT SELECT, INSERT ON public.kyc_requests TO authenticated;
GRANT ALL ON public.kyc_requests TO service_role;
ALTER TABLE public.kyc_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own kyc" ON public.kyc_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users insert own kyc" ON public.kyc_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update kyc" ON public.kyc_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- ============================================================
-- 7. Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION public.available_purchased_px(_uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH released AS (
    SELECT COALESCE(SUM(amount_px),0)::int AS amt FROM public.wallet_topups
    WHERE user_id = _uid AND available_at <= now()
  ),
  spent AS (
    -- amount of purchased_px already consumed = total topups - current purchased_px
    SELECT COALESCE(SUM(amount_px),0)::int AS total FROM public.wallet_topups WHERE user_id = _uid
  ),
  cur AS (SELECT purchased_px FROM public.wallets WHERE user_id = _uid)
  SELECT GREATEST(
    LEAST(
      (SELECT purchased_px FROM cur),
      (SELECT amt FROM released) - ((SELECT total FROM spent) - (SELECT purchased_px FROM cur))
    ),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.daily_gift_total(_uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(SUM(price_px),0)::int FROM public.gift_transactions
  WHERE sender_id = _uid AND created_at >= date_trunc('day', now());
$$;

-- ============================================================
-- 8. send_gift v2: full AML checks
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_gift(_recipient_id uuid, _gift_id uuid, _message text DEFAULT '', _project_id uuid DEFAULT NULL)
RETURNS gift_transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid := auth.uid();
  g public.gifts;
  tx public.gift_transactions;
  cfg public.gift_limits_config;
  sender_profile public.profiles;
  recipient_profile public.profiles;
  available int;
  daily int;
  velocity int;
  daily_cap int;
  circular_count int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  IF uid = _recipient_id THEN RAISE EXCEPTION 'INVALID: ส่งให้ตัวเองไม่ได้'; END IF;

  SELECT * INTO cfg FROM public.gift_limits_config WHERE id = 1;
  SELECT * INTO g FROM public.gifts WHERE id = _gift_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID: ไม่พบของขวัญ'; END IF;

  SELECT * INTO sender_profile FROM public.profiles WHERE id = uid;
  SELECT * INTO recipient_profile FROM public.profiles WHERE id = _recipient_id;
  IF recipient_profile.id IS NULL THEN RAISE EXCEPTION 'INVALID: ไม่พบผู้รับ'; END IF;

  -- 1. Frozen check
  IF sender_profile.account_status <> 'active' THEN
    RAISE EXCEPTION 'ACCOUNT_FROZEN: บัญชีของคุณถูกระงับชั่วคราว';
  END IF;
  IF recipient_profile.account_status = 'frozen' THEN
    RAISE EXCEPTION 'RECIPIENT_FROZEN: ผู้รับถูกระงับบัญชี';
  END IF;

  -- 2. Account age
  IF sender_profile.created_at > now() - make_interval(hours => cfg.min_account_age_hours) THEN
    RAISE EXCEPTION 'NEW_ACCOUNT: บัญชีใหม่เกินไป กรุณารออย่างน้อย % ชั่วโมง', cfg.min_account_age_hours;
  END IF;

  PERFORM public.ensure_wallet(uid);
  PERFORM public.ensure_wallet(_recipient_id);

  -- 3. Available balance (purchased_px past holding)
  available := public.available_purchased_px(uid);
  IF available < g.price_px THEN
    RAISE EXCEPTION 'HOLDING_PERIOD: ยอดพร้อมใช้ % px ไม่พอ (รอ holding 24 ชม.)', available;
  END IF;

  -- 4. Daily limit
  daily := public.daily_gift_total(uid);
  daily_cap := CASE WHEN sender_profile.is_verified THEN cfg.daily_limit_verified ELSE cfg.daily_limit_unverified END;
  IF daily + g.price_px > daily_cap THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED: เกินเพดานต่อวัน (% px)%', daily_cap,
      CASE WHEN sender_profile.is_verified THEN '' ELSE ' — ยืนยันตัวตนเพื่อเพิ่มเพดาน' END;
  END IF;

  -- 5. Velocity
  SELECT COUNT(*) INTO velocity FROM public.gift_transactions
    WHERE sender_id = uid AND created_at > now() - interval '1 hour';
  IF velocity >= cfg.velocity_per_hour THEN
    RAISE EXCEPTION 'VELOCITY: ส่งของขวัญถี่เกินไป กรุณารอสักครู่';
  END IF;

  -- 6. Circular pattern flag (non-blocking)
  SELECT COUNT(*) INTO circular_count FROM public.gift_transactions
    WHERE sender_id = _recipient_id AND recipient_id = uid
      AND created_at > now() - interval '7 days';
  IF circular_count > 0 THEN
    INSERT INTO public.aml_flags(user_id, flag_type, severity, details)
    VALUES (uid, 'circular_transfer', 'medium',
      jsonb_build_object('counterparty', _recipient_id, 'reverse_count', circular_count, 'amount_px', g.price_px));
  END IF;

  -- 7. Execute transfer
  UPDATE public.wallets
    SET purchased_px = purchased_px - g.price_px,
        lifetime_spent_px = lifetime_spent_px + g.price_px,
        updated_at = now()
    WHERE user_id = uid;
  UPDATE public.wallets
    SET earned_px = earned_px + g.price_px,
        lifetime_earned_px = lifetime_earned_px + g.price_px,
        updated_at = now()
    WHERE user_id = _recipient_id;

  INSERT INTO public.gift_transactions(sender_id, recipient_id, gift_id, price_px, message, project_id)
    VALUES (uid, _recipient_id, _gift_id, g.price_px, COALESCE(_message,''), _project_id)
    RETURNING * INTO tx;
  RETURN tx;
END $$;

-- ============================================================
-- 9. request_cashout v2: earned_px only + KYC required
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_cashout(_amount_px integer, _bank_info jsonb)
RETURNS cashout_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid := auth.uid();
  prof public.profiles;
  earned int;
  fee int;
  net int;
  c public.cashout_requests;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  IF _amount_px < 1000 THEN RAISE EXCEPTION 'INVALID: ขั้นต่ำ 1000 px'; END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = uid;
  IF NOT prof.is_verified THEN
    RAISE EXCEPTION 'KYC_REQUIRED: ต้องยืนยันตัวตนก่อน cashout';
  END IF;
  IF prof.account_status <> 'active' THEN
    RAISE EXCEPTION 'ACCOUNT_FROZEN: บัญชีถูกระงับ';
  END IF;

  PERFORM public.ensure_wallet(uid);
  SELECT earned_px INTO earned FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF earned < _amount_px THEN
    RAISE EXCEPTION 'INSUFFICIENT_EARNED: ยอด earned %px ไม่พอ (cashout เฉพาะ px ที่ได้รับจากของขวัญ)', earned;
  END IF;

  fee := FLOOR(_amount_px * 0.15)::int;
  net := _amount_px - fee;

  UPDATE public.wallets SET earned_px = earned_px - _amount_px, updated_at = now() WHERE user_id = uid;
  INSERT INTO public.cashout_requests(user_id, gross_px, fee_px, net_px, bank_info, status, processed_at)
    VALUES (uid, _amount_px, fee, net, COALESCE(_bank_info,'{}'::jsonb), 'mock_paid', now())
    RETURNING * INTO c;
  RETURN c;
END $$;

-- ============================================================
-- 10. topup_wallet_mock v2: enforce max + holding
-- ============================================================
CREATE OR REPLACE FUNCTION public.topup_wallet_mock(_amount_px integer)
RETURNS wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid := auth.uid();
  cfg public.gift_limits_config;
  prof public.profiles;
  w public.wallets;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  SELECT * INTO cfg FROM public.gift_limits_config WHERE id = 1;
  IF _amount_px IS NULL OR _amount_px <= 0 OR _amount_px > cfg.max_topup_per_tx THEN
    RAISE EXCEPTION 'INVALID: จำนวนไม่ถูกต้อง (สูงสุด % px/ครั้ง)', cfg.max_topup_per_tx;
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = uid;
  IF prof.account_status <> 'active' THEN RAISE EXCEPTION 'ACCOUNT_FROZEN: บัญชีถูกระงับ'; END IF;

  PERFORM public.ensure_wallet(uid);
  UPDATE public.wallets
    SET purchased_px = purchased_px + _amount_px, updated_at = now()
    WHERE user_id = uid
    RETURNING * INTO w;
  INSERT INTO public.wallet_topups(user_id, amount_px, available_at)
    VALUES (uid, _amount_px, now() + make_interval(hours => cfg.hold_hours));
  RETURN w;
END $$;

-- ============================================================
-- 11. KYC RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_kyc_request(_contact_note text DEFAULT '')
RETURNS kyc_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); r public.kyc_requests;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ'; END IF;
  INSERT INTO public.kyc_requests(user_id, contact_note)
    VALUES (uid, COALESCE(_contact_note,''))
    RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_approve_kyc(_request_id uuid, _note text DEFAULT '')
RETURNS kyc_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.kyc_requests;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.kyc_requests
    SET status='approved', reviewed_by=auth.uid(), reviewed_at=now(), admin_note=COALESCE(_note,'')
    WHERE id=_request_id RETURNING * INTO r;
  UPDATE public.profiles SET is_verified=true, verified_at=now(), verified_by=auth.uid() WHERE id = r.user_id;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'kyc_approve', 'kyc_request', _request_id::text, jsonb_build_object('user_id', r.user_id));
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reject_kyc(_request_id uuid, _note text DEFAULT '')
RETURNS kyc_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.kyc_requests;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.kyc_requests
    SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), admin_note=COALESCE(_note,'')
    WHERE id=_request_id RETURNING * INTO r;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'kyc_reject', 'kyc_request', _request_id::text, jsonb_build_object('user_id', r.user_id, 'note', _note));
  RETURN r;
END $$;

-- ============================================================
-- 12. Account freeze
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_freeze_account(_user_id uuid, _reason text)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.profiles;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles
    SET account_status='frozen', frozen_at=now(), frozen_reason=COALESCE(_reason,'')
    WHERE id=_user_id RETURNING * INTO p;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'account_freeze', 'profile', _user_id::text, jsonb_build_object('reason', _reason));
  RETURN p;
END $$;

CREATE OR REPLACE FUNCTION public.admin_unfreeze_account(_user_id uuid)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.profiles;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles
    SET account_status='active', frozen_at=NULL, frozen_reason=''
    WHERE id=_user_id RETURNING * INTO p;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'account_unfreeze', 'profile', _user_id::text, '{}'::jsonb);
  RETURN p;
END $$;

-- ============================================================
-- 13. AML flag resolution
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_resolve_aml_flag(_flag_id uuid, _action text, _note text DEFAULT '')
RETURNS aml_flags LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.aml_flags; new_status text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _action NOT IN ('dismiss','escalate','freeze') THEN RAISE EXCEPTION 'invalid action'; END IF;
  new_status := CASE WHEN _action='dismiss' THEN 'dismissed' ELSE 'actioned' END;
  UPDATE public.aml_flags
    SET status=new_status, reviewed_by=auth.uid(), reviewed_at=now(), admin_note=COALESCE(_note,'')
    WHERE id=_flag_id RETURNING * INTO f;
  IF _action = 'freeze' THEN
    UPDATE public.profiles SET account_status='frozen', frozen_at=now(), frozen_reason='AML: '||f.flag_type WHERE id=f.user_id;
  ELSIF _action = 'escalate' THEN
    UPDATE public.profiles SET account_status='under_review' WHERE id=f.user_id;
  END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'aml_'||_action, 'aml_flag', _flag_id::text, jsonb_build_object('user_id', f.user_id, 'type', f.flag_type));
  RETURN f;
END $$;

-- ============================================================
-- 14. Risk score
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_risk_score(_uid uuid)
RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  age_hours numeric;
  velocity_7d int;
  flag_count int;
  new_recipients int;
  score int := 0;
BEGIN
  SELECT EXTRACT(EPOCH FROM (now() - created_at))/3600 INTO age_hours FROM public.profiles WHERE id=_uid;
  IF age_hours < 24 THEN score := score + 30;
  ELSIF age_hours < 168 THEN score := score + 15; END IF;

  SELECT COUNT(*) INTO velocity_7d FROM public.gift_transactions
    WHERE sender_id=_uid AND created_at > now() - interval '7 days';
  IF velocity_7d > 50 THEN score := score + 25;
  ELSIF velocity_7d > 20 THEN score := score + 10; END IF;

  SELECT COUNT(*) INTO flag_count FROM public.aml_flags
    WHERE user_id=_uid AND status IN ('open','reviewing');
  score := score + LEAST(flag_count * 15, 30);

  SELECT COUNT(DISTINCT recipient_id) INTO new_recipients FROM public.gift_transactions g
    JOIN public.profiles p ON p.id = g.recipient_id
    WHERE g.sender_id=_uid AND g.created_at > now() - interval '7 days'
      AND p.created_at > now() - interval '7 days';
  IF new_recipients >= 5 THEN score := score + 15; END IF;

  RETURN LEAST(score, 100);
END $$;

-- ============================================================
-- 15. Velocity/burst triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.detect_gift_anomaly()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  sender_count int;
  recipient_new_senders int;
BEGIN
  -- Velocity: sender > 10/hour
  SELECT COUNT(*) INTO sender_count FROM public.gift_transactions
    WHERE sender_id=NEW.sender_id AND created_at > now() - interval '1 hour';
  IF sender_count > 10 THEN
    INSERT INTO public.aml_flags(user_id, flag_type, severity, details)
    VALUES (NEW.sender_id, 'velocity', 'high',
      jsonb_build_object('count_1h', sender_count, 'last_tx_id', NEW.id));
  END IF;

  -- New account burst: recipient gets from ≥5 senders created <24h
  SELECT COUNT(DISTINCT g.sender_id) INTO recipient_new_senders
    FROM public.gift_transactions g
    JOIN public.profiles p ON p.id = g.sender_id
    WHERE g.recipient_id=NEW.recipient_id
      AND g.created_at > now() - interval '24 hours'
      AND p.created_at > now() - interval '24 hours';
  IF recipient_new_senders >= 5 THEN
    INSERT INTO public.aml_flags(user_id, flag_type, severity, details)
    VALUES (NEW.recipient_id, 'new_account_burst', 'high',
      jsonb_build_object('new_senders_24h', recipient_new_senders));
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_detect_gift_anomaly ON public.gift_transactions;
CREATE TRIGGER trg_detect_gift_anomaly
  AFTER INSERT ON public.gift_transactions
  FOR EACH ROW EXECUTE FUNCTION public.detect_gift_anomaly();

-- ============================================================
-- 16. Realtime publication for aml_flags + kyc_requests
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.aml_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kyc_requests;

-- ============================================================
-- 17. Admin overview RPC for AML dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_aml_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'flags_open', (SELECT COUNT(*) FROM public.aml_flags WHERE status='open'),
    'flags_critical', (SELECT COUNT(*) FROM public.aml_flags WHERE status='open' AND severity IN ('high','critical')),
    'frozen_accounts', (SELECT COUNT(*) FROM public.profiles WHERE account_status='frozen'),
    'under_review', (SELECT COUNT(*) FROM public.profiles WHERE account_status='under_review'),
    'high_risk_users', (SELECT COUNT(*) FROM public.profiles WHERE risk_score >= 70),
    'kyc_pending', (SELECT COUNT(*) FROM public.kyc_requests WHERE status='pending'),
    'kyc_approved_total', (SELECT COUNT(*) FROM public.kyc_requests WHERE status='approved')
  ) INTO r;
  RETURN r;
END $$;
