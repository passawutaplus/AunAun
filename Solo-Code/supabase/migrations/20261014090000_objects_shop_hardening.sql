-- Objects shop: fixes before the first real sale.
--
-- 1) Paid files no longer public. creator_objects is readable by anyone when Published, and its
--    `downloads` column carried the file links, so a paid file could be fetched without paying.
--    Links now live in creator_object_downloads (owner, admin, or a buyer with a paid order).
--    Writes still go through creator_objects.downloads (old and new clients alike); a trigger moves
--    them across and blanks the public column.
-- 2) The order price follows the chosen option. snapshot_object_order charged the base price even
--    when the option had its own price, so the QR amount did not match the page.
-- 3) Stock is real. Paid orders count into sold_count and decrement the option's stock; new orders
--    are refused when the edition or option has nothing left.
-- 4) Shipping. A flat shipping_thb per order (0 for downloads); the platform fee is on goods only.
-- 5) Notifications to buyer and seller on paid / shipped / completed.
-- 6) Auto-confirm. Orders shipped 7+ days ago complete on their own (lazy sweep, no pg_cron), so the
--    seller's money is not stuck when the buyer forgets to press "received".

-- 1) Private downloads ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anthem.creator_object_downloads (
  object_id uuid PRIMARY KEY
    REFERENCES anthem.creator_objects (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  owner_id uuid NOT NULL,
  files jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(files) = 'array' AND jsonb_array_length(files) <= 20),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE anthem.creator_object_downloads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON anthem.creator_object_downloads FROM PUBLIC, anon, authenticated;
GRANT SELECT ON anthem.creator_object_downloads TO authenticated;
GRANT ALL ON anthem.creator_object_downloads TO service_role;

DROP POLICY IF EXISTS creator_object_downloads_read ON anthem.creator_object_downloads;
CREATE POLICY creator_object_downloads_read ON anthem.creator_object_downloads
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM anthem.object_orders o
      WHERE o.object_id = creator_object_downloads.object_id
        AND o.buyer_id = auth.uid()
        AND o.payment_status = 'paid'
        AND o.status <> 'cancelled'
    )
  );

CREATE OR REPLACE FUNCTION anthem.stash_creator_object_downloads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  files jsonb := CASE WHEN jsonb_typeof(NEW.downloads) = 'array' THEN NEW.downloads ELSE '[]'::jsonb END;
BEGIN
  IF jsonb_array_length(files) > 0 THEN
    INSERT INTO anthem.creator_object_downloads (object_id, owner_id, files, updated_at)
    VALUES (NEW.id, NEW.owner_id, files, now())
    ON CONFLICT (object_id) DO UPDATE
      SET files = EXCLUDED.files, owner_id = EXCLUDED.owner_id, updated_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    -- The editor always sends the full list; an empty list means "no files any more".
    DELETE FROM anthem.creator_object_downloads WHERE object_id = NEW.id;
  END IF;
  NEW.downloads := '[]'::jsonb;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION anthem.stash_creator_object_downloads() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_creator_objects_stash_downloads ON anthem.creator_objects;
-- UPDATE OF downloads: fires only when the write lists the column (status-only updates leave files alone).
CREATE TRIGGER trg_creator_objects_stash_downloads
  BEFORE INSERT OR UPDATE OF downloads ON anthem.creator_objects
  FOR EACH ROW EXECUTE FUNCTION anthem.stash_creator_object_downloads();

-- Move anything already stored publicly.
UPDATE anthem.creator_objects SET downloads = downloads
WHERE jsonb_typeof(downloads) = 'array' AND jsonb_array_length(downloads) > 0;

-- 2-4) Columns ---------------------------------------------------------------------------------------
ALTER TABLE anthem.creator_objects
  ADD COLUMN IF NOT EXISTS shipping_thb integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_count integer NOT NULL DEFAULT 0;
ALTER TABLE anthem.creator_objects
  DROP CONSTRAINT IF EXISTS creator_objects_shipping_range,
  ADD CONSTRAINT creator_objects_shipping_range CHECK (shipping_thb BETWEEN 0 AND 5000),
  DROP CONSTRAINT IF EXISTS creator_objects_sold_count_nonneg,
  ADD CONSTRAINT creator_objects_sold_count_nonneg CHECK (sold_count >= 0);

ALTER TABLE anthem.object_orders
  ADD COLUMN IF NOT EXISTS shipping_satang integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

/** How many copies an edition has: 1 for unique, the last number of the label for limited, NULL = open. */
CREATE OR REPLACE FUNCTION anthem.object_edition_total(p_edition text, p_label text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_edition = 'unique' THEN 1
    WHEN p_edition = 'limited' THEN nullif((regexp_match(coalesce(p_label, ''), '(\d+)\s*$'))[1], '')::integer
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION anthem.snapshot_object_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = anthem, public
AS $$
DECLARE
  obj anthem.creator_objects%ROWTYPE;
  opt jsonb;
  phone text;
  unit integer;
  total integer;
  goods bigint;
  ship integer;
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
  IF obj.fulfillment = 'download' THEN
    NEW.qty := 1;
  END IF;
  IF NEW.qty IS NULL OR NEW.qty < 1 OR NEW.qty > 20 THEN
    RAISE EXCEPTION 'จำนวนต้องอยู่ระหว่าง 1 ถึง 20';
  END IF;

  -- Option: must be one the seller listed; its own price and stock win.
  NEW.finish := coalesce(NEW.finish, '');
  IF jsonb_typeof(obj.finishes) = 'array' AND jsonb_array_length(obj.finishes) > 0 THEN
    SELECT f INTO opt FROM jsonb_array_elements(obj.finishes) AS f WHERE f->>'name' = NEW.finish LIMIT 1;
    IF opt IS NULL THEN
      RAISE EXCEPTION 'เลือกตัวเลือกสินค้าก่อน';
    END IF;
  END IF;
  unit := obj.price_thb;
  IF opt IS NOT NULL AND jsonb_typeof(opt->'price_thb') = 'number' AND (opt->>'price_thb')::numeric > 0 THEN
    unit := round((opt->>'price_thb')::numeric)::integer;
  END IF;
  IF opt IS NOT NULL AND jsonb_typeof(opt->'stock') = 'number' AND floor((opt->>'stock')::numeric) < NEW.qty THEN
    RAISE EXCEPTION 'ตัวเลือกนี้เหลือไม่พอ';
  END IF;
  -- Options with their own stock are the count that matters (the editor rewrites the edition label
  -- from the remaining option stock, so comparing it with sold_count would double count).
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(obj.finishes) = 'array' THEN obj.finishes ELSE '[]'::jsonb END) AS f
    WHERE jsonb_typeof(f->'stock') = 'number'
  ) THEN
    total := anthem.object_edition_total(obj.edition, obj.edition_label);
    IF total IS NOT NULL AND obj.sold_count + NEW.qty > total THEN
      RAISE EXCEPTION 'ขายหมดแล้ว';
    END IF;
  END IF;

  ship := CASE WHEN obj.fulfillment = 'download' THEN 0 ELSE coalesce(obj.shipping_thb, 0) END;
  goods := unit::bigint * NEW.qty * 100;
  NEW.fulfillment := obj.fulfillment;
  NEW.unit_price_thb := unit;
  NEW.shipping_satang := ship * 100;
  NEW.amount_satang := goods + NEW.shipping_satang;
  -- Fee on goods only; shipping goes to the seller in full.
  NEW.platform_fee_satang := round(goods * 10 / 100.0)::integer;
  NEW.seller_net_satang := NEW.amount_satang - NEW.platform_fee_satang;
  NEW.payment_status := 'unpaid';
  NEW.seller_release := 'held';
  NEW.status := 'unpaid';
  NEW.charge_id := '';
  NEW.paid_at := NULL;
  NEW.received_at := NULL;
  NEW.shipped_at := NULL;
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

-- Status changes from people; system sweeps set anthem.object_system = on to pass.
CREATE OR REPLACE FUNCTION anthem.guard_object_order_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = anthem, public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR current_setting('anthem.object_system', true) = 'on'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  NEW.unit_price_thb := OLD.unit_price_thb;
  NEW.amount_satang := OLD.amount_satang;
  NEW.shipping_satang := OLD.shipping_satang;
  NEW.platform_fee_satang := OLD.platform_fee_satang;
  NEW.seller_net_satang := OLD.seller_net_satang;
  NEW.fulfillment := OLD.fulfillment;
  NEW.payment_status := OLD.payment_status;
  NEW.charge_id := OLD.charge_id;
  NEW.paid_at := OLD.paid_at;
  NEW.seller_release := OLD.seller_release;
  NEW.received_at := OLD.received_at;
  NEW.shipped_at := OLD.shipped_at;
  NEW.object_id := OLD.object_id;
  NEW.buyer_id := OLD.buyer_id;
  NEW.seller_id := OLD.seller_id;
  NEW.qty := OLD.qty;
  NEW.finish := OLD.finish;
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
      IF OLD.status <> 'shipped' THEN
        NEW.shipped_at := now();
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

-- 5) Notifications ----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION anthem.notify_object_order(p_user uuid, p_title text, p_body text, p_link text, p_order uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata, is_read, is_dismissed)
  SELECT p_user, 'anthem', 'object_order', p_title, coalesce(p_body, ''), coalesce(p_link, ''),
         jsonb_build_object('object_order_id', p_order), false, false
  WHERE p_user IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION anthem.notify_object_order(uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- Paid: count the copies, take them off the option's stock, tell both sides.
CREATE OR REPLACE FUNCTION anthem.on_object_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  obj anthem.creator_objects%ROWTYPE;
  next_finishes jsonb;
BEGIN
  SELECT * INTO obj FROM anthem.creator_objects WHERE id = NEW.object_id FOR UPDATE;
  IF FOUND THEN
    next_finishes := obj.finishes;
    IF jsonb_typeof(obj.finishes) = 'array' AND NEW.finish <> '' THEN
      SELECT coalesce(jsonb_agg(
               CASE WHEN t.f->>'name' = NEW.finish AND jsonb_typeof(t.f->'stock') = 'number'
                 THEN jsonb_set(t.f, '{stock}', to_jsonb(greatest(0, floor((t.f->>'stock')::numeric)::integer - NEW.qty)))
                 ELSE t.f END
               ORDER BY t.ord), '[]'::jsonb)
        INTO next_finishes
        FROM jsonb_array_elements(obj.finishes) WITH ORDINALITY AS t(f, ord);
    END IF;
    UPDATE anthem.creator_objects
       SET sold_count = sold_count + NEW.qty, finishes = next_finishes
     WHERE id = obj.id;
  END IF;
  PERFORM anthem.notify_object_order(
    NEW.seller_id, 'มีคำสั่งซื้อใหม่',
    format('%s × %s จ่ายแล้ว รอคุณจัดส่ง', NEW.object_title, NEW.qty),
    '/dashboard/objects?tab=selling', NEW.id);
  PERFORM anthem.notify_object_order(
    NEW.buyer_id, 'ชำระเงินสำเร็จ',
    CASE WHEN NEW.fulfillment = 'download'
      THEN format('%s พร้อมดาวน์โหลดแล้ว', NEW.object_title)
      ELSE format('%s คนขายจะจัดส่งและใส่เลขพัสดุให้', NEW.object_title) END,
    CASE WHEN NEW.fulfillment = 'download' THEN '/object/' || NEW.object_id::text ELSE '/dashboard/objects?tab=buying' END,
    NEW.id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION anthem.on_object_order_paid() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_object_orders_paid ON anthem.object_orders;
CREATE TRIGGER trg_object_orders_paid
  AFTER UPDATE OF payment_status ON anthem.object_orders
  FOR EACH ROW
  WHEN (OLD.payment_status = 'unpaid' AND NEW.payment_status = 'paid')
  EXECUTE FUNCTION anthem.on_object_order_paid();

CREATE OR REPLACE FUNCTION anthem.on_object_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  IF NEW.status = 'shipped' AND OLD.status <> 'shipped' AND NEW.fulfillment <> 'download' THEN
    PERFORM anthem.notify_object_order(
      NEW.buyer_id, 'คนขายส่งของแล้ว',
      format('%s เลขพัสดุ %s', NEW.object_title, NEW.tracking_code),
      '/dashboard/objects?tab=buying', NEW.id);
  ELSIF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    PERFORM anthem.notify_object_order(
      NEW.seller_id, 'ผู้ซื้อได้รับของแล้ว',
      format('%s เงินพร้อมถอนตามรอบ', NEW.object_title),
      '/dashboard/objects?tab=selling', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION anthem.on_object_order_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_object_orders_status_notify ON anthem.object_orders;
CREATE TRIGGER trg_object_orders_status_notify
  AFTER UPDATE OF status ON anthem.object_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION anthem.on_object_order_status();

-- 6) Auto-confirm -----------------------------------------------------------------------------------
-- pg_cron is not installed; signed-in clients call this lazily when they open their orders.
CREATE OR REPLACE FUNCTION public.finalize_shipped_object_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('anthem.object_system', 'on', true);
  UPDATE anthem.object_orders
     SET status = 'completed', received_at = now(), seller_release = 'available', updated_at = now()
   WHERE status = 'shipped'
     AND payment_status = 'paid'
     AND coalesce(shipped_at, updated_at) < now() - interval '7 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('anthem.object_system', 'off', true);
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_shipped_object_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_shipped_object_orders() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
