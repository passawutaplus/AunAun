-- Review fix (2026-10-07): hire order money is computed by the database, not the browser.
-- Before: on INSERT the guard only overwrote job_price_satang from the quote; buyer_pays_satang,
-- wht_satang, seller_net_satang, fees and balance came from the client. /api/hire-charge charges
-- buyer_pays_satang, so a buyer could insert a cheaper order.
-- Mirrors Anthem-Code/src/lib/payments/fees.ts: platform fee % and version come from the active row of
-- shared.aplus1_fee_configs (10% / aplus1-v1 today; falls back to 10% if no row is active),
-- PromptPay buyer pays (job − WHT) × deposit%, card surcharge stored as 0 (added at charge time). WHT clamped to ≤ 5%.

CREATE OR REPLACE FUNCTION shared.enforce_hire_order_money_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  q_amount bigint;
  v_job bigint;
  v_wht bigint;
  v_dep numeric;
  v_after_wht bigint;
  v_fee bigint;
  v_pays bigint;
  v_fee_pct numeric;
  v_fee_ver text;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role'
     OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
     OR current_setting('aplus1.allow_hire_paid', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL OR NEW.status NOT IN ('draft', 'awaiting_payment') THEN
      RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_STATUS';
    END IF;
    NEW.paid_at := NULL;
    NEW.amount_paid_satang := 0;

    IF NEW.quote_id IS NOT NULL THEN
      SELECT amount_satang INTO q_amount FROM shared.hire_quotes WHERE id = NEW.quote_id;
      IF q_amount IS NOT NULL AND q_amount > 0 THEN
        NEW.job_price_satang := q_amount;
      END IF;
    END IF;

    v_job := greatest(coalesce(NEW.job_price_satang, 0), 0);
    v_wht := least(greatest(coalesce(NEW.wht_satang, 0), 0), round(v_job * 0.05)::bigint);
    v_dep := least(greatest(round(coalesce(NEW.deposit_percent, 100)), 1), 100);
    v_after_wht := v_job - v_wht;
    SELECT c.platform_fee_percent, c.version INTO v_fee_pct, v_fee_ver
      FROM shared.aplus1_fee_configs c
     WHERE c.effective_from <= now() AND (c.effective_to IS NULL OR c.effective_to > now())
     ORDER BY c.effective_from DESC
     LIMIT 1;
    v_fee_pct := least(greatest(coalesce(v_fee_pct, 10), 0), 100);
    v_fee := round(v_job * v_fee_pct / 100)::bigint;
    v_pays := round(v_after_wht * v_dep / 100)::bigint;

    NEW.wht_satang := v_wht;
    NEW.deposit_percent := v_dep;
    NEW.platform_fee_percent := v_fee_pct;
    NEW.fee_version := coalesce(v_fee_ver, NEW.fee_version);
    NEW.platform_fee_satang := v_fee;
    NEW.card_surcharge_satang := 0;
    NEW.buyer_pays_satang := v_pays;
    NEW.seller_net_satang := v_job - v_fee - v_wht;
    NEW.balance_due_satang := CASE WHEN v_dep < 100 THEN v_after_wht - v_pays ELSE 0 END;
    RETURN NEW;
  END IF;

  IF NEW.job_price_satang IS DISTINCT FROM OLD.job_price_satang
     OR NEW.buyer_pays_satang IS DISTINCT FROM OLD.buyer_pays_satang
     OR NEW.seller_net_satang IS DISTINCT FROM OLD.seller_net_satang
     OR NEW.platform_fee_satang IS DISTINCT FROM OLD.platform_fee_satang
     OR NEW.card_surcharge_satang IS DISTINCT FROM OLD.card_surcharge_satang
     OR NEW.amount_paid_satang IS DISTINCT FROM OLD.amount_paid_satang
     OR NEW.balance_due_satang IS DISTINCT FROM OLD.balance_due_satang
     OR NEW.wht_satang IS DISTINCT FROM OLD.wht_satang
     OR NEW.deposit_percent IS DISTINCT FROM OLD.deposit_percent
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
  THEN
    RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_MONEY';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('paid_pending', 'deposit_paid')
     AND OLD.status NOT IN ('paid_pending', 'deposit_paid') THEN
    RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_PAID_STATUS';
  END IF;

  RETURN NEW;
END;
$$;
