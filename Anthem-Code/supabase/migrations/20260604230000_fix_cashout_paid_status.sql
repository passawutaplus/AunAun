-- Align admin cashout "paid" with pending flow (not only mock_paid)

CREATE OR REPLACE FUNCTION public.admin_mark_cashout_paid(_id uuid)
RETURNS public.cashout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.cashout_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO c FROM public.cashout_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cashout not found'; END IF;
  IF c.status NOT IN ('pending', 'mock_paid') THEN
    RAISE EXCEPTION 'INVALID: เฉพาะคำขอ pending';
  END IF;
  UPDATE public.cashout_requests
    SET status = 'paid', processed_at = now()
    WHERE id = _id
    RETURNING * INTO c;
  PERFORM public._admin_audit('cashout.mark_paid', 'cashout_request', _id, jsonb_build_object('net_px', c.net_px));
  RETURN c;
END;
$$;
