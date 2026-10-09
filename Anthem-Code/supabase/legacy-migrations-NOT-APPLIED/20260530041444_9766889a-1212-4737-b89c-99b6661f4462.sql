
-- WALLETS
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY,
  balance_px integer NOT NULL DEFAULT 0 CHECK (balance_px >= 0),
  lifetime_earned_px integer NOT NULL DEFAULT 0,
  lifetime_spent_px integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets public read" ON public.wallets FOR SELECT USING (true);
CREATE POLICY "wallets self insert" ON public.wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- GIFTS catalog
CREATE TABLE public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_th text NOT NULL,
  name_en text NOT NULL,
  price_px integer NOT NULL CHECK (price_px > 0),
  icon text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gifts TO anon, authenticated;
GRANT ALL ON public.gifts TO service_role;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gifts public read" ON public.gifts FOR SELECT USING (true);

INSERT INTO public.gifts (code, name_th, name_en, price_px, icon, display_order) VALUES
  ('hb_pencil',    'ดินสอ HB',       'HB Pencil',         5,   'Pencil',      1),
  ('drip_coffee',  'กาแฟดริป',       'Drip Coffee',       20,  'Coffee',      2),
  ('copic_marker', 'ปากกาโคปิก',     'Copic Marker',      50,  'Highlighter', 3),
  ('stylus_nib',   'หัวปากกาเมาส์',  'Stylus Nib',        100, 'PenTool',     4),
  ('pantone',      'สมุดสีแพนโทน',   'Pantone Swatch',    300, 'Palette',     5),
  ('software',     'ค่าโปรแกรม',     'Software License',  500, 'Laptop',      6);

-- GIFT TRANSACTIONS
CREATE TABLE public.gift_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  gift_id uuid NOT NULL REFERENCES public.gifts(id),
  price_px integer NOT NULL CHECK (price_px > 0),
  message text NOT NULL DEFAULT '',
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX idx_gift_tx_recipient ON public.gift_transactions(recipient_id, created_at DESC);
CREATE INDEX idx_gift_tx_sender ON public.gift_transactions(sender_id, created_at DESC);
GRANT SELECT ON public.gift_transactions TO authenticated;
GRANT ALL ON public.gift_transactions TO service_role;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gift tx participants read" ON public.gift_transactions
  FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- WALLET TOPUPS (mock log)
CREATE TABLE public.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_px integer NOT NULL CHECK (amount_px > 0),
  method text NOT NULL DEFAULT 'mock',
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_topups_user ON public.wallet_topups(user_id, created_at DESC);
GRANT SELECT ON public.wallet_topups TO authenticated;
GRANT ALL ON public.wallet_topups TO service_role;
ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topups owner read" ON public.wallet_topups FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- CASHOUT REQUESTS
CREATE TABLE public.cashout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gross_px integer NOT NULL CHECK (gross_px >= 1000),
  fee_px integer NOT NULL DEFAULT 0,
  net_px integer NOT NULL,
  bank_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX idx_cashout_user ON public.cashout_requests(user_id, created_at DESC);
GRANT SELECT ON public.cashout_requests TO authenticated;
GRANT ALL ON public.cashout_requests TO service_role;
ALTER TABLE public.cashout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashout owner read" ON public.cashout_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Helper: ensure wallet row exists
CREATE OR REPLACE FUNCTION public.ensure_wallet(_uid uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.wallets(user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
$$;

-- RPC: top-up (mock)
CREATE OR REPLACE FUNCTION public.topup_wallet_mock(_amount_px integer)
RETURNS public.wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  w public.wallets;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount_px IS NULL OR _amount_px <= 0 OR _amount_px > 1000000 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;
  PERFORM public.ensure_wallet(uid);
  UPDATE public.wallets
    SET balance_px = balance_px + _amount_px, updated_at = now()
    WHERE user_id = uid
    RETURNING * INTO w;
  INSERT INTO public.wallet_topups(user_id, amount_px) VALUES (uid, _amount_px);
  RETURN w;
END $$;

-- RPC: send gift (atomic)
CREATE OR REPLACE FUNCTION public.send_gift(
  _recipient_id uuid,
  _gift_id uuid,
  _message text DEFAULT '',
  _project_id uuid DEFAULT NULL
)
RETURNS public.gift_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  g public.gifts;
  tx public.gift_transactions;
  sender_bal integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF uid = _recipient_id THEN RAISE EXCEPTION 'cannot gift yourself'; END IF;
  SELECT * INTO g FROM public.gifts WHERE id = _gift_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'gift not found'; END IF;

  PERFORM public.ensure_wallet(uid);
  PERFORM public.ensure_wallet(_recipient_id);

  -- Lock sender row & check balance
  SELECT balance_px INTO sender_bal FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF sender_bal < g.price_px THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  UPDATE public.wallets
    SET balance_px = balance_px - g.price_px,
        lifetime_spent_px = lifetime_spent_px + g.price_px,
        updated_at = now()
    WHERE user_id = uid;
  UPDATE public.wallets
    SET balance_px = balance_px + g.price_px,
        lifetime_earned_px = lifetime_earned_px + g.price_px,
        updated_at = now()
    WHERE user_id = _recipient_id;

  INSERT INTO public.gift_transactions(sender_id, recipient_id, gift_id, price_px, message, project_id)
    VALUES (uid, _recipient_id, _gift_id, g.price_px, COALESCE(_message,''), _project_id)
    RETURNING * INTO tx;
  RETURN tx;
END $$;

-- RPC: request cashout (mock auto-pay)
CREATE OR REPLACE FUNCTION public.request_cashout(_amount_px integer, _bank_info jsonb)
RETURNS public.cashout_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  fee integer;
  net integer;
  c public.cashout_requests;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount_px < 1000 THEN RAISE EXCEPTION 'minimum cashout is 1000 px'; END IF;

  PERFORM public.ensure_wallet(uid);
  SELECT balance_px INTO bal FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF bal < _amount_px THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  fee := FLOOR(_amount_px * 0.15)::int;
  net := _amount_px - fee;

  UPDATE public.wallets SET balance_px = balance_px - _amount_px, updated_at = now() WHERE user_id = uid;
  INSERT INTO public.cashout_requests(user_id, gross_px, fee_px, net_px, bank_info, status, processed_at)
    VALUES (uid, _amount_px, fee, net, COALESCE(_bank_info, '{}'::jsonb), 'mock_paid', now())
    RETURNING * INTO c;
  RETURN c;
END $$;

GRANT EXECUTE ON FUNCTION public.topup_wallet_mock(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_gift(uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_cashout(integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_wallet(uuid) TO authenticated;
