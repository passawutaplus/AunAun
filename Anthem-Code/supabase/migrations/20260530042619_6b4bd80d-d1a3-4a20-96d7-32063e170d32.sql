-- Overview KPI
CREATE OR REPLACE FUNCTION public.admin_gift_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'gift_count', (SELECT COUNT(*) FROM public.gift_transactions),
    'gift_volume_px', COALESCE((SELECT SUM(price_px) FROM public.gift_transactions),0),
    'unique_senders', (SELECT COUNT(DISTINCT sender_id) FROM public.gift_transactions),
    'unique_recipients', (SELECT COUNT(DISTINCT recipient_id) FROM public.gift_transactions),
    'projects_supported', (SELECT COUNT(DISTINCT project_id) FROM public.gift_transactions WHERE project_id IS NOT NULL),
    'topup_total_px', COALESCE((SELECT SUM(amount_px) FROM public.wallet_topups),0),
    'topup_count', (SELECT COUNT(*) FROM public.wallet_topups),
    'cashout_pending', (SELECT COUNT(*) FROM public.cashout_requests WHERE status = 'pending'),
    'cashout_paid', (SELECT COUNT(*) FROM public.cashout_requests WHERE status = 'mock_paid'),
    'cashout_net_total_px', COALESCE((SELECT SUM(net_px) FROM public.cashout_requests),0),
    'gift_count_7d', (SELECT COUNT(*) FROM public.gift_transactions WHERE created_at >= now() - interval '7 days'),
    'gift_volume_7d_px', COALESCE((SELECT SUM(price_px) FROM public.gift_transactions WHERE created_at >= now() - interval '7 days'),0)
  ) INTO result;
  RETURN result;
END $$;

-- Top recipients
CREATE OR REPLACE FUNCTION public.admin_top_gift_recipients(_limit int DEFAULT 10)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, total_px bigint, gift_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT p.id, p.display_name, p.username, p.avatar_url,
           SUM(g.price_px)::bigint, COUNT(*)::bigint
    FROM public.gift_transactions g
    JOIN public.profiles p ON p.id = g.recipient_id
    GROUP BY p.id
    ORDER BY SUM(g.price_px) DESC
    LIMIT _limit;
END $$;

-- Top senders
CREATE OR REPLACE FUNCTION public.admin_top_gift_senders(_limit int DEFAULT 10)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, total_px bigint, gift_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT p.id, p.display_name, p.username, p.avatar_url,
           SUM(g.price_px)::bigint, COUNT(*)::bigint
    FROM public.gift_transactions g
    JOIN public.profiles p ON p.id = g.sender_id
    GROUP BY p.id
    ORDER BY SUM(g.price_px) DESC
    LIMIT _limit;
END $$;

-- Top projects
CREATE OR REPLACE FUNCTION public.admin_top_gift_projects(_limit int DEFAULT 10)
RETURNS TABLE(project_id uuid, title text, cover_url text, owner_id uuid, owner_name text, total_px bigint, gift_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT pr.id, pr.title, pr.cover_url, pr.owner_id, p.display_name,
           SUM(g.price_px)::bigint, COUNT(*)::bigint
    FROM public.gift_transactions g
    JOIN public.projects pr ON pr.id = g.project_id
    LEFT JOIN public.profiles p ON p.id = pr.owner_id
    WHERE g.project_id IS NOT NULL
    GROUP BY pr.id, p.display_name
    ORDER BY SUM(g.price_px) DESC
    LIMIT _limit;
END $$;

-- Recent gift transactions with joined info
CREATE OR REPLACE FUNCTION public.admin_recent_gifts(_limit int DEFAULT 100, _days int DEFAULT 90)
RETURNS TABLE(
  id uuid, created_at timestamptz, price_px integer, message text,
  sender_id uuid, sender_name text, sender_avatar text,
  recipient_id uuid, recipient_name text, recipient_avatar text,
  gift_name text, gift_icon text,
  project_id uuid, project_title text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT g.id, g.created_at, g.price_px, g.message,
           g.sender_id, sp.display_name, sp.avatar_url,
           g.recipient_id, rp.display_name, rp.avatar_url,
           gi.name_th, gi.icon,
           g.project_id, pr.title
    FROM public.gift_transactions g
    LEFT JOIN public.profiles sp ON sp.id = g.sender_id
    LEFT JOIN public.profiles rp ON rp.id = g.recipient_id
    LEFT JOIN public.gifts gi ON gi.id = g.gift_id
    LEFT JOIN public.projects pr ON pr.id = g.project_id
    WHERE g.created_at >= now() - make_interval(days => _days)
    ORDER BY g.created_at DESC
    LIMIT _limit;
END $$;

-- Cashouts (admin list)
CREATE OR REPLACE FUNCTION public.admin_list_cashouts(_limit int DEFAULT 100)
RETURNS TABLE(
  id uuid, created_at timestamptz, processed_at timestamptz, status text,
  gross_px integer, fee_px integer, net_px integer, bank_info jsonb,
  user_id uuid, user_name text, user_avatar text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT c.id, c.created_at, c.processed_at, c.status,
           c.gross_px, c.fee_px, c.net_px, c.bank_info,
           c.user_id, p.display_name, p.avatar_url
    FROM public.cashout_requests c
    LEFT JOIN public.profiles p ON p.id = c.user_id
    ORDER BY c.created_at DESC
    LIMIT _limit;
END $$;

-- Top-ups (admin list)
CREATE OR REPLACE FUNCTION public.admin_list_topups(_limit int DEFAULT 100)
RETURNS TABLE(
  id uuid, created_at timestamptz, amount_px integer, method text, status text,
  user_id uuid, user_name text, user_avatar text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT t.id, t.created_at, t.amount_px, t.method, t.status,
           t.user_id, p.display_name, p.avatar_url
    FROM public.wallet_topups t
    LEFT JOIN public.profiles p ON p.id = t.user_id
    ORDER BY t.created_at DESC
    LIMIT _limit;
END $$;

-- Mark cashout paid
CREATE OR REPLACE FUNCTION public.admin_mark_cashout_paid(_id uuid)
RETURNS public.cashout_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cashout_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.cashout_requests
    SET status = 'mock_paid', processed_at = now()
    WHERE id = _id
    RETURNING * INTO c;
  IF NOT FOUND THEN RAISE EXCEPTION 'cashout not found'; END IF;
  RETURN c;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_gift_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_gift_recipients(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_gift_senders(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_gift_projects(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_gifts(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_cashouts(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_topups(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_cashout_paid(uuid) TO authenticated;