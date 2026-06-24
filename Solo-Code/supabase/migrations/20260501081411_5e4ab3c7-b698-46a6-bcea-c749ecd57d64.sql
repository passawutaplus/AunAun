-- Top subscriptions report for admins (across all users)
CREATE OR REPLACE FUNCTION public.get_top_subscriptions(_limit integer DEFAULT 50)
RETURNS TABLE(
  name text,
  category text,
  user_count bigint,
  total_subscriptions bigint,
  avg_price numeric,
  total_monthly_value numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- normalize names so "Netflix" / "netflix " merge
    initcap(btrim(lower(s.name)))::text AS name,
    (array_agg(s.category ORDER BY s.created_at DESC) FILTER (WHERE s.category IS NOT NULL))[1] AS category,
    COUNT(DISTINCT s.user_id)::bigint AS user_count,
    COUNT(*)::bigint AS total_subscriptions,
    ROUND(AVG(s.price)::numeric, 2) AS avg_price,
    ROUND(SUM(
      CASE
        WHEN s.cycle = 'yearly' THEN s.price / 12.0
        WHEN s.cycle = 'weekly' THEN s.price * 4.33
        WHEN s.cycle = 'one-time' THEN 0
        ELSE s.price
      END
    )::numeric, 2) AS total_monthly_value
  FROM public.finance_subscriptions s
  WHERE s.is_active = true
    AND public.has_role(auth.uid(), 'admin')
  GROUP BY initcap(btrim(lower(s.name)))
  ORDER BY user_count DESC, total_subscriptions DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_subscriptions(integer) TO authenticated;