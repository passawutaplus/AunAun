-- Venue photos: the team can attach up to 8 photos per venue (their own uploads, or the event owner's
-- folder). The venue row on the event page shows the first 3 as thumbnails that open full size.
-- Same function as 20261107100000_event_venues_featured.sql plus `gallery_urls`.

CREATE OR REPLACE FUNCTION public.admin_event_venue_save(_parent_id uuid, _id uuid, _data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  p anthem.events;
  v_title text := btrim(coalesce(_data ->> 'title', ''));
  v_hours jsonb := coalesce(_data -> 'opening_hours', '[]'::jsonb);
  v_source text := nullif(btrim(coalesce(_data ->> 'source_url', '')), '');
  v_website text := nullif(btrim(coalesce(_data ->> 'website_url', '')), '');
  v_lat double precision := nullif(_data ->> 'lat', '')::double precision;
  v_lng double precision := nullif(_data ->> 'lng', '')::double precision;
  v_start date := nullif(_data ->> 'starts_on', '')::date;
  v_end date := nullif(_data ->> 'ends_on', '')::date;
  v_fee text := coalesce(nullif(_data ->> 'fee_type', ''), 'unspecified');
  v_gallery text[];
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์'; END IF;
  SELECT * INTO p FROM anthem.events WHERE id = _parent_id AND parent_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบงานหลัก'; END IF;
  IF char_length(v_title) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'ใส่ชื่อสถานที่ (ไม่เกิน 100 ตัวอักษร)'; END IF;
  IF NOT anthem.event_hours_ok(v_hours) THEN RAISE EXCEPTION 'เวลาเปิด–ปิดไม่ถูกต้อง'; END IF;
  IF NOT anthem.event_link_ok(v_source) OR NOT anthem.event_link_ok(v_website) THEN
    RAISE EXCEPTION 'ลิงก์ต้องขึ้นต้นด้วย https:// และห้ามใช้ลิงก์ย่อ';
  END IF;
  IF (v_lat IS NULL) <> (v_lng IS NULL) THEN RAISE EXCEPTION 'ใส่พิกัดให้ครบทั้ง lat และ lng'; END IF;
  IF v_start IS NOT NULL AND v_end IS NOT NULL AND v_end < v_start THEN RAISE EXCEPTION 'วันจบต้องไม่ก่อนวันเริ่ม'; END IF;
  IF v_fee NOT IN ('free', 'paid', 'unspecified') THEN RAISE EXCEPTION 'ค่าเข้าชมไม่ถูกต้อง'; END IF;

  SELECT coalesce(array_agg(x ORDER BY ord), '{}') INTO v_gallery
    FROM jsonb_array_elements_text(
           CASE WHEN jsonb_typeof(_data -> 'gallery_urls') = 'array' THEN _data -> 'gallery_urls' ELSE '[]'::jsonb END
         ) WITH ORDINALITY AS a(x, ord);
  IF cardinality(v_gallery) > 8 THEN RAISE EXCEPTION 'ใส่รูปได้ไม่เกิน 8 รูป'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_gallery) g
              WHERE NOT (anthem.event_image_ok(g, auth.uid()) OR anthem.event_image_ok(g, p.owner_id))) THEN
    RAISE EXCEPTION 'รูปต้องอัปโหลดผ่านหน้านี้ (JPG, PNG หรือ WebP)';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO anthem.events (owner_id, parent_id, sort_order, title, category, origin, status, published_at,
                               source_name, reviewed_by, reviewed_at)
    VALUES (p.owner_id, p.id,
            coalesce((SELECT max(sort_order) + 1 FROM anthem.events WHERE parent_id = p.id), 1),
            v_title, p.category, p.origin, 'published', now(), p.source_name, auth.uid(), now())
    RETURNING id INTO v_id;
  ELSE
    SELECT id INTO v_id FROM anthem.events WHERE id = _id AND parent_id = p.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบสถานที่นี้'; END IF;
  END IF;

  UPDATE anthem.events SET
    title = v_title,
    name_en = nullif(btrim(coalesce(_data ->> 'name_en', '')), ''),
    area = nullif(btrim(coalesce(_data ->> 'area', '')), ''),
    address = nullif(btrim(coalesce(_data ->> 'address', '')), ''),
    location_name = v_title,
    location_note = nullif(btrim(coalesce(_data ->> 'address', '')), ''),
    opening_hours = v_hours,
    hours_note = nullif(btrim(coalesce(_data ->> 'hours_note', '')), ''),
    closed_note = nullif(btrim(coalesce(_data ->> 'closed_note', '')), ''),
    admission_note = nullif(btrim(coalesce(_data ->> 'admission_note', '')), ''),
    transit_note = nullif(btrim(coalesce(_data ->> 'transit_note', '')), ''),
    date_note = nullif(btrim(coalesce(_data ->> 'date_note', '')), ''),
    description = left(btrim(coalesce(_data ->> 'description', '')), 2000),
    lat = v_lat,
    lng = v_lng,
    coords_approx = coalesce((_data ->> 'coords_approx')::boolean, true),
    is_special = coalesce((_data ->> 'is_special')::boolean, false),
    starts_on = v_start,
    ends_on = v_end,
    fee_type = v_fee,
    source_url = v_source,
    source_checked_at = CASE WHEN v_source IS NULL THEN NULL ELSE now() END,
    website_url = v_website,
    gallery_urls = v_gallery,
    category = p.category,
    updated_at = now()
  WHERE id = v_id;

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), CASE WHEN _id IS NULL THEN 'event_venue_add' ELSE 'event_venue_edit' END, 'event', v_id::text,
          jsonb_build_object('parent_id', p.id));
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_event_venue_save(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_event_venue_save(uuid, uuid, jsonb) TO authenticated;

-- Rollback: re-run admin_event_venue_save from 20261107100000_event_venues_featured.sql.
