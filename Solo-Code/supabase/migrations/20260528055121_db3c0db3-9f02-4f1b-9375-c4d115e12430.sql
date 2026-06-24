
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  usage_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Bangkok')::date),
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature, usage_date)
);

GRANT SELECT ON public.ai_usage_daily TO authenticated;
GRANT ALL ON public.ai_usage_daily TO service_role;

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai usage daily"
  ON public.ai_usage_daily FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_user_date
  ON public.ai_usage_daily (user_id, usage_date);

-- Atomic check-and-increment. Returns jsonb {allowed, count, limit}.
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(
  _user_id uuid,
  _feature text,
  _limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  current_count integer;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'count', 0, 'limit', _limit, 'reason', 'unauthenticated');
  END IF;

  INSERT INTO public.ai_usage_daily (user_id, feature, usage_date, count)
  VALUES (_user_id, _feature, today, 0)
  ON CONFLICT (user_id, feature, usage_date) DO NOTHING;

  SELECT count INTO current_count
    FROM public.ai_usage_daily
   WHERE user_id = _user_id AND feature = _feature AND usage_date = today
   FOR UPDATE;

  IF current_count >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'count', current_count, 'limit', _limit, 'reason', 'quota_exceeded');
  END IF;

  UPDATE public.ai_usage_daily
     SET count = count + 1, updated_at = now()
   WHERE user_id = _user_id AND feature = _feature AND usage_date = today;

  RETURN jsonb_build_object('allowed', true, 'count', current_count + 1, 'limit', _limit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) TO authenticated, service_role;
