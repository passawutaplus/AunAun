-- So1o: Feedback → Tickets + Mission Control (delta 2026-06-07)
-- Project: zkflkpbmbozrchqncpzi
-- ใช้เมื่อมี support_tickets แล้ว แต่ยังไม่มี rating / notify / activity feed
-- รันใน Dashboard → SQL Editor

-- ========== 20260607120000_feedback_ticket_fields.sql ==========
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  ADD COLUMN IF NOT EXISTS beta_feedback_id uuid REFERENCES public.beta_feedback(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_rating ON public.support_tickets(rating) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON public.support_tickets(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_beta_fb ON public.support_tickets(beta_feedback_id) WHERE beta_feedback_id IS NOT NULL;

-- ========== 20260607120100_ticket_feedback_notify.sql ==========
CREATE OR REPLACE FUNCTION public.notify_on_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _msg TEXT;
  _url TEXT := '/dashboard';
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.source = 'feedback_button' THEN
    IF NEW.status = 'in_progress' THEN
      _msg := 'เราได้รับฟีดแบ็กของคุณแล้ว กำลังดำเนินการแก้ไข';
    ELSIF NEW.status = 'resolved' THEN
      _msg := 'เราได้แก้ไขตามฟีดแบ็กของคุณแล้ว ขอบคุณที่ช่วยพัฒนา So1o';
      IF NEW.resolution_note IS NOT NULL AND btrim(NEW.resolution_note) <> '' THEN
        _msg := _msg || ' — ' || NEW.resolution_note;
      END IF;
    ELSIF NEW.status = 'closed' THEN
      _msg := 'ตั๋วฟีดแบ็กปิดงานแล้ว ขอบคุณที่ส่งความคิดเห็นมา';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    IF NEW.status = 'in_progress' THEN
      _msg := 'ตั๋ว ' || NEW.ticket_number || ' กำลังได้รับการแก้ไข';
    ELSIF NEW.status = 'resolved' THEN
      _msg := 'ตั๋ว ' || NEW.ticket_number || ' แก้ไขแล้ว — กำลังปล่อยอัปเดต';
      IF NEW.resolution_note IS NOT NULL AND btrim(NEW.resolution_note) <> '' THEN
        _msg := _msg || ' — ' || NEW.resolution_note;
      END IF;
    ELSIF NEW.status = 'closed' THEN
      _msg := 'ตั๋ว ' || NEW.ticket_number || ' ปิดงานเรียบร้อยแล้ว';
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, url)
  VALUES (NEW.user_id, 'ticket', _msg, _url);

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_on_ticket_status_change() FROM PUBLIC, anon, authenticated;

-- ========== 20260607130000_admin_activity_feed.sql ==========
CREATE OR REPLACE FUNCTION public.get_admin_activity_feed(
  _days integer DEFAULT 7,
  _category text DEFAULT 'all',
  _limit integer DEFAULT 80
)
RETURNS TABLE (
  occurred_at timestamptz,
  category text,
  event_type text,
  title text,
  detail text,
  user_id uuid,
  ref_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - make_interval(days => GREATEST(1, LEAST(_days, 90)));
  _lim integer := GREATEST(10, LEAST(_limit, 200));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT
      ual.created_at AS occurred_at,
      'user'::text AS category,
      ual.activity_type AS event_type,
      'เข้าใช้งาน'::text AS title,
      ual.activity_type AS detail,
      ual.user_id,
      ual.id::text AS ref_id
    FROM public.user_activity_logs ual
    WHERE ual.created_at >= _since

    UNION ALL

    SELECT
      fue.created_at,
      'user'::text,
      'feature_use',
      fue.feature,
      'ใช้ฟีเจอร์',
      fue.user_id,
      fue.id::text
    FROM public.feature_usage_events fue
    WHERE fue.created_at >= _since

    UNION ALL

    SELECT
      bf.created_at,
      'feedback'::text,
      'beta_feedback',
      bf.feature,
      LEFT(bf.message, 120),
      bf.user_id,
      bf.id::text
    FROM public.beta_feedback bf
    WHERE bf.created_at >= _since

    UNION ALL

    SELECT
      st.created_at,
      'feedback'::text,
      'ticket_created',
      st.ticket_number || ' — ' || st.title,
      COALESCE(st.source_feature, st.source),
      st.user_id,
      st.id::text
    FROM public.support_tickets st
    WHERE st.created_at >= _since

    UNION ALL

    SELECT
      te.created_at,
      'feedback'::text,
      te.event_type,
      'ตั๋ว ' || st.ticket_number,
      COALESCE(te.body, te.new_value, te.old_value),
      te.actor_id,
      te.id::text
    FROM public.ticket_events te
    JOIN public.support_tickets st ON st.id = te.ticket_id
    WHERE te.created_at >= _since
      AND te.event_type IN ('status_change', 'comment')

    UNION ALL

    SELECT
      cm.created_at,
      'user'::text,
      'chat_message',
      'แชท Support',
      LEFT(cm.body, 120),
      cm.user_id,
      cm.id::text
    FROM public.chat_messages cm
    WHERE cm.created_at >= _since

    UNION ALL

    SELECT
      q.created_at,
      'business'::text,
      'quotation',
      COALESCE(q.number, 'ใบเสนอราคา'),
      COALESCE(q.client_name, q.status),
      q.user_id,
      q.id::text
    FROM public.quotations q
    WHERE q.created_at >= _since

    UNION ALL

    SELECT
      pn.created_at,
      'system'::text,
      pn.event_type,
      'การชำระเงิน',
      pn.message,
      pn.user_id,
      pn.id::text
    FROM public.payment_notifications pn
    WHERE pn.created_at >= _since
  ) feed
  WHERE _category = 'all' OR feed.category = _category
  ORDER BY feed.occurred_at DESC
  LIMIT _lim;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_activity_feed(integer, text, integer) TO authenticated;

-- Refresh PostgREST schema cache so API sees new columns/RPC immediately
NOTIFY pgrst, 'reload schema';
