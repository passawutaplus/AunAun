-- Notification deep links, gift/follow/cashout alerts, cashout pending (pre-Stripe)

-- 1) Fix hire/collab notification links
CREATE OR REPLACE FUNCTION public.notify_on_hire_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
BEGIN
  PERFORM shared.push_notification(
    NEW.freelancer_id,
    'anthem',
    'hire_request',
    'มีคำขอจ้างงานใหม่',
    COALESCE(NEW.client_name, '') || ' ส่งคำขอจ้างงาน: ' || COALESCE(NEW.project_title, ''),
    '/portfolio/manage?focus=hiring',
    jsonb_build_object('request_id', NEW.id, 'project_title', NEW.project_title)
  );
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_collab_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  v_sender_name text;
BEGIN
  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  PERFORM shared.push_notification(
    NEW.recipient_id,
    'anthem',
    'collab_request',
    'มีคำขอร่วมงานใหม่',
    COALESCE(v_sender_name, 'มีคน') || ' ส่งคำขอร่วมงานถึงคุณ',
    '/portfolio/manage?focus=collab',
    jsonb_build_object('request_id', NEW.id, 'sender_id', NEW.sender_id)
  );
  RETURN NEW;
END $$;

-- 2) Gift received
CREATE OR REPLACE FUNCTION public.notify_on_gift()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  v_sender_name text;
  v_gift_name text;
  v_link text;
BEGIN
  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  SELECT name_th INTO v_gift_name FROM public.gifts WHERE id = NEW.gift_id;
  v_link := CASE
    WHEN NEW.project_id IS NOT NULL THEN '/project/' || NEW.project_id::text
    ELSE '/u/' || NEW.sender_id::text
  END;
  PERFORM shared.push_notification(
    NEW.recipient_id,
    'anthem',
    'gift_received',
    'ได้รับของขวัญใหม่',
    COALESCE(v_sender_name, 'มีคน') || ' ส่ง ' || COALESCE(v_gift_name, 'ของขวัญ') || ' (' || NEW.price_px::text || ' px)',
    v_link,
    jsonb_build_object(
      'transaction_id', NEW.id,
      'sender_id', NEW.sender_id,
      'gift_id', NEW.gift_id,
      'project_id', NEW.project_id,
      'price_px', NEW.price_px
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_gift ON public.gift_transactions;
CREATE TRIGGER trg_notify_gift
  AFTER INSERT ON public.gift_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_gift();

-- 3) New follower
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  v_follower_name text;
BEGIN
  SELECT display_name INTO v_follower_name FROM public.profiles WHERE id = NEW.follower_id;
  PERFORM shared.push_notification(
    NEW.following_id,
    'anthem',
    'new_follower',
    'มีผู้ติดตามใหม่',
    COALESCE(v_follower_name, 'มีคน') || ' เริ่มติดตามคุณแล้ว',
    '/u/' || NEW.follower_id::text,
    jsonb_build_object('follower_id', NEW.follower_id)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_follow ON public.follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- 4) Cashout: queue as pending (admin marks paid later)
CREATE OR REPLACE FUNCTION public.request_cashout(_amount_px integer, _bank_info jsonb)
RETURNS cashout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    VALUES (uid, _amount_px, fee, net, COALESCE(_bank_info, '{}'::jsonb), 'pending', NULL)
    RETURNING * INTO c;
  RETURN c;
END $$;

-- 5) Notify user when admin marks cashout paid
CREATE OR REPLACE FUNCTION public.notify_on_cashout_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'mock_paid' THEN
    PERFORM shared.push_notification(
      NEW.user_id,
      'anthem',
      'cashout_paid',
      'ถอนเงินสำเร็จ',
      'โอน ฿' || NEW.net_px::text || ' เข้าบัญชีของคุณแล้ว',
      '/earnings',
      jsonb_build_object('cashout_id', NEW.id, 'net_px', NEW.net_px)
    );
  ELSIF NEW.status = 'rejected' THEN
    PERFORM shared.push_notification(
      NEW.user_id,
      'anthem',
      'cashout_rejected',
      'คำขอถอนถูกปฏิเสธ',
      'ยอด ' || NEW.gross_px::text || ' px ถูกคืนเข้ากระเป๋า earned แล้ว — ติดต่อทีมงานหากมีคำถาม',
      '/earnings',
      jsonb_build_object('cashout_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_cashout_status ON public.cashout_requests;
CREATE TRIGGER trg_notify_cashout_status
  AFTER UPDATE OF status ON public.cashout_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_cashout_status();

-- 6) Notify admins on new pending cashout
CREATE OR REPLACE FUNCTION public.notify_admins_on_cashout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  v_admin uuid;
  v_name text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;
  SELECT display_name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
    PERFORM shared.push_notification(
      v_admin,
      'anthem',
      'cashout_pending',
      'คำขอถอนใหม่',
      COALESCE(v_name, 'ผู้ใช้') || ' ขอถอน ' || NEW.gross_px::text || ' px (สุทธิ ฿' || NEW.net_px::text || ')',
      '/admin/gifts',
      jsonb_build_object('cashout_id', NEW.id, 'user_id', NEW.user_id)
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_cashout ON public.cashout_requests;
CREATE TRIGGER trg_notify_admins_cashout
  AFTER INSERT ON public.cashout_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_cashout();

-- 7) Notify user their cashout request was queued
CREATE OR REPLACE FUNCTION public.notify_on_cashout_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;
  PERFORM shared.push_notification(
    NEW.user_id,
    'anthem',
    'cashout_pending',
    'รับคำขอถอนแล้ว',
    'คำขอถอน ' || NEW.gross_px::text || ' px อยู่ในคิว — ทีมงานจะดำเนินการเมื่อระบบชำระเงินเปิดใช้งาน',
    '/earnings',
    jsonb_build_object('cashout_id', NEW.id)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_cashout_requested ON public.cashout_requests;
CREATE TRIGGER trg_notify_cashout_requested
  AFTER INSERT ON public.cashout_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_cashout_requested();

REVOKE ALL ON FUNCTION public.notify_on_gift() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_cashout_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_on_cashout() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_cashout_requested() FROM PUBLIC, anon, authenticated;
