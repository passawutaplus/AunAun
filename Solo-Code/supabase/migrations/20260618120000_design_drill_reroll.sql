-- Design Drill: daily free reroll quota + paid reroll feature cost

CREATE TABLE IF NOT EXISTS public.design_drill_reroll_usage (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key    text NOT NULL,
  used_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_key)
);

ALTER TABLE public.design_drill_reroll_usage ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.design_drill_reroll_usage TO authenticated;
GRANT ALL ON public.design_drill_reroll_usage TO service_role;

CREATE OR REPLACE FUNCTION public._design_drill_day_key()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT to_char(now() AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD');
$$;

CREATE OR REPLACE FUNCTION public.get_design_drill_reroll_status(_user_id uuid, _daily_limit integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _day text := public._design_drill_day_key();
  _count integer := 0;
BEGIN
  SELECT used_count INTO _count
  FROM public.design_drill_reroll_usage
  WHERE user_id = _user_id AND day_key = _day;
  _count := COALESCE(_count, 0);
  RETURN jsonb_build_object(
    'used', _count,
    'limit', _daily_limit,
    'remaining', GREATEST(_daily_limit - _count, 0),
    'day_key', _day
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_design_drill_reroll(_user_id uuid, _daily_limit integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _day text := public._design_drill_day_key();
  _count integer;
BEGIN
  INSERT INTO public.design_drill_reroll_usage (user_id, day_key, used_count)
  VALUES (_user_id, _day, 0)
  ON CONFLICT (user_id, day_key) DO NOTHING;

  SELECT used_count INTO _count
  FROM public.design_drill_reroll_usage
  WHERE user_id = _user_id AND day_key = _day
  FOR UPDATE;

  IF _count >= _daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit_reached',
      'used', _count,
      'limit', _daily_limit,
      'day_key', _day
    );
  END IF;

  UPDATE public.design_drill_reroll_usage
  SET used_count = used_count + 1, updated_at = now()
  WHERE user_id = _user_id AND day_key = _day;

  RETURN jsonb_build_object(
    'allowed', true,
    'used', _count + 1,
    'limit', _daily_limit,
    'remaining', GREATEST(_daily_limit - (_count + 1), 0),
    'day_key', _day
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_design_drill_reroll_status(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_design_drill_reroll(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_design_drill_reroll_status(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_design_drill_reroll(uuid, integer) TO service_role;

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('design_drill_reroll', 1, 'Design Drill — สุ่มโจทย์ใหม่')
ON CONFLICT (feature) DO UPDATE SET cost = EXCLUDED.cost, label = EXCLUDED.label;

DROP POLICY IF EXISTS design_drill_reroll_admin_select ON public.design_drill_reroll_usage;
CREATE POLICY design_drill_reroll_admin_select ON public.design_drill_reroll_usage
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
