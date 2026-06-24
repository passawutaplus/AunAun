-- Client job payments via Stripe Checkout (destination charge → freelancer Connect account).
-- Run after stripe-payments.sql on unified project rvnzjiskqliexysicfmh.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_client_payments_enabled boolean NOT NULL DEFAULT true;

-- Extend fulfillment kinds
ALTER TABLE public.stripe_checkout_fulfillments
  DROP CONSTRAINT IF EXISTS stripe_checkout_fulfillments_kind_check;

ALTER TABLE public.stripe_checkout_fulfillments
  ADD CONSTRAINT stripe_checkout_fulfillments_kind_check
  CHECK (kind IN ('credits', 'px', 'client_job'));

CREATE TABLE IF NOT EXISTS public.job_stripe_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_trackers(id) ON DELETE CASCADE,
  freelancer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_type text NOT NULL CHECK (payment_type IN ('deposit', 'final')),
  amount_thb numeric NOT NULL CHECK (amount_thb > 0),
  stripe_session_id text NOT NULL UNIQUE,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_stripe_payments_job_id_idx
  ON public.job_stripe_payments (job_id);

ALTER TABLE public.job_stripe_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_stripe_payments_owner_select ON public.job_stripe_payments;
CREATE POLICY job_stripe_payments_owner_select ON public.job_stripe_payments
  FOR SELECT TO authenticated
  USING (freelancer_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON TABLE public.job_stripe_payments FROM anon;
GRANT SELECT ON TABLE public.job_stripe_payments TO authenticated;

CREATE OR REPLACE FUNCTION public.fulfill_client_job_payment_stripe(
  _stripe_session_id text,
  _job_id uuid,
  _freelancer_user_id uuid,
  _payment_type text,
  _amount_thb numeric,
  _environment text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job public.job_trackers%ROWTYPE;
  _deposit_amt numeric;
  _event_kind text;
  _event_title text;
BEGIN
  IF _payment_type NOT IN ('deposit', 'final') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_TYPE';
  END IF;
  IF _environment NOT IN ('sandbox', 'live') THEN
    RAISE EXCEPTION 'INVALID_ENVIRONMENT';
  END IF;
  IF _amount_thb IS NULL OR _amount_thb <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_checkout_fulfillments
    WHERE stripe_session_id = _stripe_session_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;

  SELECT * INTO _job
  FROM public.job_trackers
  WHERE id = _job_id AND user_id = _freelancer_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND';
  END IF;

  _deposit_amt := round(_job.total_amount * (_job.deposit_percent::numeric / 100), 2);

  IF _payment_type = 'deposit' THEN
    IF _job.deposit_paid THEN
      RAISE EXCEPTION 'DEPOSIT_ALREADY_PAID';
    END IF;
    IF abs(_amount_thb - _deposit_amt) > 0.01 THEN
      RAISE EXCEPTION 'DEPOSIT_AMOUNT_MISMATCH';
    END IF;

    UPDATE public.job_trackers
    SET
      deposit_paid = true,
      status = CASE WHEN status = 'pending' THEN 'in-progress' ELSE status END,
      current_step = CASE WHEN current_step = 0 THEN 1 ELSE current_step END,
      progress_percent = CASE
        WHEN current_step = 0 THEN round((1::numeric / 5) * 100)
        ELSE progress_percent
      END,
      updated_at = now()
    WHERE id = _job_id;

    _event_kind := 'deposit_paid';
    _event_title := 'รับมัดจำผ่าน Stripe';
  ELSE
    IF NOT _job.deposit_paid THEN
      RAISE EXCEPTION 'DEPOSIT_REQUIRED_FIRST';
    END IF;
    IF _job.final_paid THEN
      RAISE EXCEPTION 'FINAL_ALREADY_PAID';
    END IF;
    IF _job.amount_due IS NULL OR _job.amount_due <= 0 THEN
      RAISE EXCEPTION 'NO_AMOUNT_DUE';
    END IF;
    IF abs(_amount_thb - _job.amount_due) > 0.01 THEN
      RAISE EXCEPTION 'FINAL_AMOUNT_MISMATCH';
    END IF;

    UPDATE public.job_trackers
    SET
      final_paid = true,
      amount_due = 0,
      status = CASE WHEN status IN ('pending', 'review', 'in-progress') THEN 'in-progress' ELSE status END,
      current_step = CASE WHEN current_step <= 3 THEN 4 ELSE current_step END,
      progress_percent = CASE
        WHEN current_step <= 3 THEN round((4::numeric / 5) * 100)
        ELSE progress_percent
      END,
      updated_at = now()
    WHERE id = _job_id;

    _event_kind := 'final_paid';
    _event_title := 'รับชำระยอดสุดท้ายผ่าน Stripe';
  END IF;

  INSERT INTO public.job_events (job_id, kind, title, note, amount)
  VALUES (
    _job_id,
    _event_kind,
    _event_title,
    'Stripe Checkout ' || _stripe_session_id,
    _amount_thb
  );

  INSERT INTO public.job_stripe_payments (
    job_id, freelancer_user_id, payment_type, amount_thb, stripe_session_id, environment
  ) VALUES (
    _job_id, _freelancer_user_id, _payment_type, _amount_thb, _stripe_session_id, _environment
  );

  INSERT INTO public.stripe_checkout_fulfillments (
    stripe_session_id, user_id, kind, price_id, quantity, environment
  ) VALUES (
    _stripe_session_id,
    _freelancer_user_id,
    'client_job',
    'client_job_' || _payment_type,
    1,
    _environment
  );

  RETURN jsonb_build_object(
    'ok', true,
    'payment_type', _payment_type,
    'job_id', _job_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_client_job_payment_stripe(text, uuid, uuid, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_client_job_payment_stripe(text, uuid, uuid, text, numeric, text) TO service_role;
