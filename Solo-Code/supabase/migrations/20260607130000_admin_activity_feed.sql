-- Unified admin activity feed RPC

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

NOTIFY pgrst, 'reload schema';
