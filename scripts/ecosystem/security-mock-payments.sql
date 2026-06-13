-- Security hardening: payment_settings RLS, mock payment defaults, mock_pay_ad_application RPC.
-- Apply after stripe-payments.sql. For production also run security-mock-payments-prod-revoke.sql.

-- ---------------------------------------------------------------------------
-- payment_settings — safer defaults + ad mock flag
-- ---------------------------------------------------------------------------

ALTER TABLE public.payment_settings
  ADD COLUMN IF NOT EXISTS mock_ad_pay_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.payment_settings
  ALTER COLUMN mock_topup_enabled SET DEFAULT false;

-- New installs only get mock disabled; existing rows unchanged until prod-revoke script.
INSERT INTO public.payment_settings (id, mock_topup_enabled, mock_ad_pay_enabled, stripe_px_enabled)
VALUES (1, false, false, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_settings_admin_select ON public.payment_settings;
CREATE POLICY payment_settings_admin_select ON public.payment_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS payment_settings_admin_update ON public.payment_settings;
CREATE POLICY payment_settings_admin_update ON public.payment_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON TABLE public.payment_settings FROM anon;
GRANT SELECT, UPDATE ON TABLE public.payment_settings TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: mock ad application payment (demo/staging only when mock_ad_pay_enabled)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mock_pay_ad_application(_id uuid)
RETURNS public.ad_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.ad_applications%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF NOT COALESCE(
    (SELECT mock_ad_pay_enabled FROM public.payment_settings WHERE id = 1),
    false
  ) THEN
    RAISE EXCEPTION 'MOCK_AD_PAY_DISABLED';
  END IF;

  SELECT * INTO _row
  FROM public.ad_applications
  WHERE id = _id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF _row.user_id IS DISTINCT FROM _uid THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF _row.status IS DISTINCT FROM 'pending_payment' THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  UPDATE public.ad_applications SET
    status = 'paid',
    paid_at = now(),
    updated_at = now()
  WHERE id = _id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.mock_pay_ad_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mock_pay_ad_application(uuid) TO authenticated;
