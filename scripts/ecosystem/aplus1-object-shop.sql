-- Object shop checkout: snapshot price, Payso payment, seller ships with a tracking number.
-- Run after scripts/ecosystem/aplus1-creator-objects.sql on the Aplus1 database.
-- Client updates cannot mark an order paid. Only the service role (webhook / charge API) can.

ALTER TABLE anthem.object_orders
  ADD COLUMN IF NOT EXISTS unit_price_thb integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_satang integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_satang integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_net_satang integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fulfillment text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS ship_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ship_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ship_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS charge_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS seller_release text NOT NULL DEFAULT 'held';

ALTER TABLE anthem.object_orders DROP CONSTRAINT IF EXISTS object_orders_payment_status_check;
ALTER TABLE anthem.object_orders
  ADD CONSTRAINT object_orders_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));

ALTER TABLE anthem.object_orders DROP CONSTRAINT IF EXISTS object_orders_seller_release_check;
ALTER TABLE anthem.object_orders
  ADD CONSTRAINT object_orders_seller_release_check
  CHECK (seller_release IN ('held', 'pending', 'available'));

ALTER TABLE anthem.object_orders DROP CONSTRAINT IF EXISTS object_orders_fulfillment_check;
ALTER TABLE anthem.object_orders
  ADD CONSTRAINT object_orders_fulfillment_check
  CHECK (fulfillment IN ('ready', 'made_to_order', 'preorder', 'download'));

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'anthem.object_orders'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%inquiry%'
      AND pg_get_constraintdef(c.oid) ILIKE '%cancelled%'
  LOOP
    EXECUTE format('ALTER TABLE anthem.object_orders DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE anthem.object_orders
  ADD CONSTRAINT object_orders_status_check
  CHECK (status IN ('inquiry', 'unpaid', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'));

CREATE OR REPLACE FUNCTION anthem.snapshot_object_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'anthem', 'public'
AS $$
DECLARE
  obj anthem.creator_objects%ROWTYPE;
  phone text;
BEGIN
  SELECT * INTO obj FROM anthem.creator_objects WHERE id = NEW.object_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบสินค้า';
  END IF;
  IF obj.owner_id <> NEW.seller_id OR obj.status <> 'Published' THEN
    RAISE EXCEPTION 'สินค้านี้ยังเปิดขายไม่ได้';
  END IF;
  IF NEW.buyer_id = NEW.seller_id THEN
    RAISE EXCEPTION 'สั่งสินค้าของตัวเองไม่ได้';
  END IF;
  IF NEW.qty IS NULL OR NEW.qty < 1 OR NEW.qty > 20 THEN
    RAISE EXCEPTION 'จำนวนต้องอยู่ระหว่าง 1 ถึง 20';
  END IF;

  NEW.fulfillment := obj.fulfillment;
  NEW.unit_price_thb := obj.price_thb;
  NEW.amount_satang := obj.price_thb * NEW.qty * 100;
  NEW.platform_fee_satang := round(NEW.amount_satang * 10 / 100.0)::integer;
  NEW.seller_net_satang := NEW.amount_satang - NEW.platform_fee_satang;
  NEW.payment_status := 'unpaid';
  NEW.seller_release := 'held';
  NEW.status := 'unpaid';
  NEW.charge_id := '';
  NEW.paid_at := NULL;
  NEW.received_at := NULL;
  NEW.object_title := obj.title;

  IF obj.fulfillment <> 'download' THEN
    phone := regexp_replace(coalesce(NEW.ship_phone, ''), '[^0-9]', '', 'g');
    IF length(trim(coalesce(NEW.ship_name, ''))) < 2 THEN
      RAISE EXCEPTION 'ใส่ชื่อผู้รับ';
    END IF;
    IF phone !~ '^[0-9]{9,10}$' THEN
      RAISE EXCEPTION 'ใส่เบอร์โทร 9–10 หลัก';
    END IF;
    IF length(trim(coalesce(NEW.ship_address, ''))) < 8 THEN
      RAISE EXCEPTION 'ใส่ที่อยู่จัดส่ง';
    END IF;
    NEW.ship_phone := phone;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_object_orders_snapshot ON anthem.object_orders;
CREATE TRIGGER trg_object_orders_snapshot
  BEFORE INSERT ON anthem.object_orders
  FOR EACH ROW
  EXECUTE FUNCTION anthem.snapshot_object_order();

CREATE OR REPLACE FUNCTION anthem.guard_object_order_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'anthem', 'public'
AS $$
BEGIN
  -- Webhook and charge API use the service role (no auth.uid).
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.unit_price_thb := OLD.unit_price_thb;
  NEW.amount_satang := OLD.amount_satang;
  NEW.platform_fee_satang := OLD.platform_fee_satang;
  NEW.seller_net_satang := OLD.seller_net_satang;
  NEW.fulfillment := OLD.fulfillment;
  NEW.payment_status := OLD.payment_status;
  NEW.charge_id := OLD.charge_id;
  NEW.paid_at := OLD.paid_at;
  NEW.seller_release := OLD.seller_release;
  NEW.received_at := OLD.received_at;
  NEW.object_id := OLD.object_id;
  NEW.buyer_id := OLD.buyer_id;
  NEW.seller_id := OLD.seller_id;
  NEW.qty := OLD.qty;
  NEW.object_title := OLD.object_title;

  IF OLD.payment_status = 'paid' THEN
    NEW.ship_name := OLD.ship_name;
    NEW.ship_phone := OLD.ship_phone;
    NEW.ship_address := OLD.ship_address;
  END IF;

  IF auth.uid() = OLD.seller_id THEN
    IF OLD.payment_status <> 'paid' THEN
      RAISE EXCEPTION 'ยังไม่ได้รับเงินจาก Payso';
    END IF;
    IF OLD.status NOT IN ('confirmed', 'preparing', 'shipped') THEN
      RAISE EXCEPTION 'คำสั่งนี้ยังจัดส่งไม่ได้';
    END IF;
    IF NEW.status = 'shipped' THEN
      IF OLD.fulfillment <> 'download' AND length(trim(coalesce(NEW.tracking_code, ''))) < 4 THEN
        RAISE EXCEPTION 'ใส่เลขติดตามก่อน';
      END IF;
    ELSIF NEW.status = 'preparing' THEN
      NEW.tracking_code := OLD.tracking_code;
    ELSIF NEW.status = 'confirmed' AND OLD.status = 'confirmed' THEN
      NEW.tracking_code := OLD.tracking_code;
    ELSE
      RAISE EXCEPTION 'คนขายอัปเดตได้แค่กำลังแพ็กหรือส่งแล้ว';
    END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.buyer_id THEN
    NEW.tracking_code := OLD.tracking_code;
    IF NEW.status = 'cancelled' THEN
      IF OLD.payment_status = 'paid' OR OLD.status NOT IN ('unpaid', 'inquiry') THEN
        RAISE EXCEPTION 'ยกเลิกได้ก่อนจ่ายเท่านั้น';
      END IF;
      RETURN NEW;
    END IF;
    IF NEW.status = 'completed' THEN
      IF OLD.payment_status <> 'paid' OR OLD.status <> 'shipped' THEN
        RAISE EXCEPTION 'กดรับของได้หลังส่งแล้ว';
      END IF;
      NEW.seller_release := 'available';
      NEW.received_at := now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'ผู้ซื้ออัปเดตสถานะนี้ไม่ได้';
  END IF;

  RAISE EXCEPTION 'ไม่มีสิทธิ์อัปเดตคำสั่งนี้';
END;
$$;

DROP TRIGGER IF EXISTS trg_object_orders_guard ON anthem.object_orders;
CREATE TRIGGER trg_object_orders_guard
  BEFORE UPDATE ON anthem.object_orders
  FOR EACH ROW
  EXECUTE FUNCTION anthem.guard_object_order_update();

GRANT ALL ON anthem.creator_objects TO service_role;
GRANT ALL ON anthem.object_orders TO service_role;

DROP POLICY IF EXISTS object_orders_buyer_cancel ON anthem.object_orders;
DROP POLICY IF EXISTS object_orders_buyer_update ON anthem.object_orders;
CREATE POLICY object_orders_buyer_update ON anthem.object_orders
  FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());
