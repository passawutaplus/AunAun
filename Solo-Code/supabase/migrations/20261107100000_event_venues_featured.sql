-- Exhibition: featured event + venues as sub-events + map data.
--
-- • A venue is a row of anthem.events with parent_id → the main event, so "สนใจ", the 3-day / 1-day
--   reminders, Google Calendar links and /exhibition/<id> pages all work per venue unchanged.
-- • One event at a time can be featured (pinned banner on /exhibition), optionally until a date.
-- • Seeds the Bangkok Art Biennale 2026 venues (11 official + the LV special project) and features it.
--   Coordinates are approximate (coords_approx = true) — no official source publishes them.

-- ── Columns ───────────────────────────────────────────────────────────────────
ALTER TABLE anthem.events
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES anthem.events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS name_en text CHECK (char_length(name_en) <= 120),
  ADD COLUMN IF NOT EXISTS area text CHECK (char_length(area) <= 60),
  ADD COLUMN IF NOT EXISTS address text CHECK (char_length(address) <= 200),
  -- [{"d":[0..6] (0 = Sunday), "o":"HH:MM", "c":"HH:MM"}], Bangkok time.
  ADD COLUMN IF NOT EXISTS opening_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hours_note text CHECK (char_length(hours_note) <= 120),
  ADD COLUMN IF NOT EXISTS closed_note text CHECK (char_length(closed_note) <= 80),
  ADD COLUMN IF NOT EXISTS admission_note text CHECK (char_length(admission_note) <= 160),
  ADD COLUMN IF NOT EXISTS transit_note text CHECK (char_length(transit_note) <= 80),
  ADD COLUMN IF NOT EXISTS date_note text CHECK (char_length(date_note) <= 80),
  ADD COLUMN IF NOT EXISTS lat double precision CHECK (lat BETWEEN -90 AND 90),
  ADD COLUMN IF NOT EXISTS lng double precision CHECK (lng BETWEEN -180 AND 180),
  ADD COLUMN IF NOT EXISTS coords_approx boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_special boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until date,
  ADD COLUMN IF NOT EXISTS featured_at timestamptz;

DO $$ BEGIN
  ALTER TABLE anthem.events ADD CONSTRAINT events_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE anthem.events ADD CONSTRAINT events_hours_array
    CHECK (jsonb_typeof(opening_hours) = 'array' AND jsonb_array_length(opening_hours) <= 14);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS events_parent_idx ON anthem.events (parent_id, sort_order) WHERE parent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS events_one_featured ON anthem.events ((is_featured)) WHERE is_featured;

-- ── Opening hours check ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION anthem.event_hours_ok(_h jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = anthem, public
AS $$
  SELECT jsonb_typeof(_h) = 'array' AND jsonb_array_length(_h) <= 14 AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(_h) r
    WHERE jsonb_typeof(r) <> 'object'
       OR jsonb_typeof(r -> 'd') <> 'array'
       OR jsonb_array_length(r -> 'd') NOT BETWEEN 1 AND 7
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(r -> 'd') d
                  WHERE jsonb_typeof(d) <> 'number' OR (d #>> '{}')::numeric NOT IN (0, 1, 2, 3, 4, 5, 6))
       OR coalesce(r ->> 'o', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       OR coalesce(r ->> 'c', '') !~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'
       OR (r ->> 'c') <= (r ->> 'o'));
$$;
REVOKE ALL ON FUNCTION anthem.event_hours_ok(jsonb) FROM PUBLIC, anon, authenticated;

-- ── Featured (team) ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_event_featured(_id uuid, _on boolean, _until date DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์'; END IF;
  IF _on THEN
    IF NOT EXISTS (SELECT 1 FROM anthem.events WHERE id = _id AND status = 'published' AND parent_id IS NULL) THEN
      RAISE EXCEPTION 'ปักหมุดได้เฉพาะงานหลักที่เผยแพร่แล้ว';
    END IF;
    IF _until IS NOT NULL AND _until < (now() AT TIME ZONE 'Asia/Bangkok')::date THEN
      RAISE EXCEPTION 'วันสิ้นสุดการปักหมุดต้องไม่ใช่วันที่ผ่านมาแล้ว';
    END IF;
    UPDATE anthem.events SET is_featured = false, featured_until = NULL, featured_at = NULL
     WHERE is_featured AND id <> _id;
    UPDATE anthem.events SET is_featured = true, featured_until = _until, featured_at = now() WHERE id = _id;
  ELSE
    UPDATE anthem.events SET is_featured = false, featured_until = NULL, featured_at = NULL WHERE id = _id;
  END IF;
  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), CASE WHEN _on THEN 'event_feature' ELSE 'event_unfeature' END, 'event', _id::text,
          jsonb_build_object('until', _until));
END;
$$;

-- ── Venues (team) ─────────────────────────────────────────────────────────────
-- Insert (_id NULL) or update one venue of a main event. Venues are published as soon as they are saved;
-- they are only listed on their main event's page.
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
    category = p.category,
    updated_at = now()
  WHERE id = v_id;

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), CASE WHEN _id IS NULL THEN 'event_venue_add' ELSE 'event_venue_edit' END, 'event', v_id::text,
          jsonb_build_object('parent_id', p.id));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_event_venue_delete(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE v_parent uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์'; END IF;
  DELETE FROM anthem.events WHERE id = _id AND parent_id IS NOT NULL RETURNING parent_id INTO v_parent;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบสถานที่นี้'; END IF;
  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'event_venue_delete', 'event', _id::text, jsonb_build_object('parent_id', v_parent));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_event_venues_reorder(_parent_id uuid, _ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์'; END IF;
  UPDATE anthem.events SET sort_order = array_position(_ids, id)
   WHERE parent_id = _parent_id AND id = ANY(_ids);
END;
$$;

-- ── "สนใจทั้งหมด": mark / unmark every venue of a main event ─────────────────────
CREATE OR REPLACE FUNCTION public.set_event_venues_interest(_parent_id uuid, _on boolean)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  _uid uuid := auth.uid();
  n integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM anthem.events WHERE id = _parent_id AND status = 'published' AND parent_id IS NULL) THEN
    RAISE EXCEPTION 'event_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF _on THEN
    WITH ins AS (
      INSERT INTO anthem.event_interests (event_id, user_id)
      SELECT e.id, _uid FROM anthem.events e WHERE e.parent_id = _parent_id AND e.status = 'published'
      ON CONFLICT DO NOTHING
      RETURNING event_id)
    UPDATE anthem.events e SET interest_count = e.interest_count + 1 FROM ins WHERE e.id = ins.event_id;
  ELSE
    WITH del AS (
      DELETE FROM anthem.event_interests i
       USING anthem.events e
       WHERE i.event_id = e.id AND e.parent_id = _parent_id AND i.user_id = _uid
      RETURNING i.event_id)
    UPDATE anthem.events e SET interest_count = GREATEST(0, e.interest_count - 1) FROM del WHERE e.id = del.event_id;
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_event_featured(uuid, boolean, date), public.admin_event_venue_save(uuid, uuid, jsonb),
  public.admin_event_venue_delete(uuid), public.admin_event_venues_reorder(uuid, uuid[]),
  public.set_event_venues_interest(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_event_featured(uuid, boolean, date), public.admin_event_venue_save(uuid, uuid, jsonb),
  public.admin_event_venue_delete(uuid), public.admin_event_venues_reorder(uuid, uuid[]),
  public.set_event_venues_interest(uuid, boolean) TO authenticated;

-- ── Reminders: a venue reminder names its main event ──────────────────────────
CREATE OR REPLACE FUNCTION anthem.queue_event_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'shared', 'public'
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  sent integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT i.event_id, i.user_id, e.starts_on,
           CASE WHEN p.id IS NOT NULL THEN p.title || ' · ' || e.title
                ELSE e.title || coalesce(' · ' || e.location_name, '') END AS body,
           (e.starts_on = today + 1) AS is_tomorrow
    FROM anthem.event_interests i
    JOIN anthem.events e ON e.id = i.event_id
    LEFT JOIN anthem.events p ON p.id = e.parent_id
    WHERE e.status = 'published'
      AND ((e.starts_on = today + 3 AND NOT i.reminded_3d) OR (e.starts_on = today + 1 AND NOT i.reminded_1d))
  LOOP
    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    VALUES (
      r.user_id, 'anthem', 'event_reminder',
      CASE WHEN r.is_tomorrow THEN 'งานที่คุณสนใจเริ่มพรุ่งนี้' ELSE 'งานที่คุณสนใจเริ่มในอีก 3 วัน' END,
      r.body,
      '/exhibition/' || r.event_id,
      jsonb_build_object('event_id', r.event_id, 'starts_on', r.starts_on, 'days_before', CASE WHEN r.is_tomorrow THEN 1 ELSE 3 END)
    );
    UPDATE anthem.event_interests
       SET reminded_3d = reminded_3d OR NOT r.is_tomorrow,
           reminded_1d = reminded_1d OR r.is_tomorrow
     WHERE event_id = r.event_id AND user_id = r.user_id;
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END;
$$;
REVOKE ALL ON FUNCTION anthem.queue_event_reminders() FROM PUBLIC, anon, authenticated;

-- ── Seed: Bangkok Art Biennale 2026 venues (checked 2026-11-03) ───────────────
-- Sources: bkkartbiennale.com/venues + maps26.bkkartbiennale.com. Hours as published; coordinates approximate;
-- BTS/MRT hints are SAMECOR's own, for the team to adjust.
DO $$
DECLARE
  p anthem.events;
  v jsonb;
BEGIN
  SELECT * INTO p FROM anthem.events WHERE id = '43ffd376-8046-447e-915d-de5af5b77f45';
  IF NOT FOUND THEN RAISE NOTICE 'BAB 2026 not found — seed skipped'; RETURN; END IF;

  FOR v IN SELECT * FROM jsonb_array_elements($json$[
    {"n":1,"title":"พิพิธภัณฑสถานแห่งชาติ พระนคร","name_en":"National Museum Bangkok","area":"เกาะรัตนโกสินทร์–ริมเจ้าพระยา","address":"4 Na Phra That Alley, Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok 10200","hours":[{"d":[0,3,4,5,6],"o":"09:00","c":"16:00"}],"hours_note":"พ.–อา. 09.00–16.00","closed_note":"ปิดวันจันทร์–อังคาร","admission_note":"BAB ยังไม่ประกาศค่าเข้าชมปี 2026 (ปีก่อนมีค่าเข้าชมพิพิธภัณฑ์)","transit_note":"MRT สนามไชย","lat":13.7576,"lng":100.4923,"start":"2026-10-29","end":"2027-02-28"},
    {"n":2,"title":"หอศิลป์ มหาวิทยาลัยศิลปากร","name_en":"Art Centre, Silpakorn University","area":"เกาะรัตนโกสินทร์–ริมเจ้าพระยา","address":"31 Na Phra Lan Rd, Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok 10200","hours":[{"d":[1,2,3,4,5,6],"o":"09:00","c":"18:00"}],"hours_note":"จ.–ส. 09.00–18.00","closed_note":"ปิดวันอาทิตย์","transit_note":"MRT สนามไชย / ท่าเรือท่าช้าง","lat":13.7529,"lng":100.4905,"start":"2026-10-29","end":"2027-02-28"},
    {"n":3,"title":"วัดโพธิ์","name_en":"Wat Pho","area":"เกาะรัตนโกสินทร์–ริมเจ้าพระยา","address":"2 Sanam Chai Rd, Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok 10200","hours":[{"d":[0,1,2,3,4,5,6],"o":"08:00","c":"19:30"}],"hours_note":"ทุกวัน 08.00–19.30","admission_note":"BAB ยังไม่ประกาศค่าเข้าชมปี 2026 (ปีก่อนเก็บค่าเข้าชมชาวต่างชาติ)","transit_note":"MRT สนามไชย","lat":13.7465,"lng":100.4932,"start":"2026-10-29","end":"2027-02-28"},
    {"n":4,"title":"วัดอรุณ","name_en":"Wat Arun","area":"เกาะรัตนโกสินทร์–ริมเจ้าพระยา","address":"158 Wang Doem Rd, Wat Arun, Bangkok Yai, Bangkok 10600","hours":[{"d":[0,1,2,3,4,5,6],"o":"08:00","c":"18:00"}],"hours_note":"ทุกวัน 08.00–18.00","admission_note":"BAB ยังไม่ประกาศค่าเข้าชมปี 2026 (ปีก่อนเก็บค่าเข้าชมชาวต่างชาติ)","transit_note":"เรือข้ามฟากจากท่าเตียน (MRT สนามไชย)","date_note":"เปิดช่วง พ.ย. 2026 · รอประกาศวันที่","lat":13.7437,"lng":100.4888,"start":null,"end":"2027-02-28"},
    {"n":5,"title":"มิวเซียมสยาม","name_en":"Museum Siam","area":"เกาะรัตนโกสินทร์–ริมเจ้าพระยา","address":"4 Sanam Chai Rd, Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok 10200","hours":[{"d":[0,2,3,4,5,6],"o":"10:00","c":"18:00"}],"hours_note":"อ.–อา. 10.00–18.00","closed_note":"ปิดวันจันทร์","transit_note":"MRT สนามไชย","lat":13.7442,"lng":100.4941,"start":"2026-10-29","end":"2027-02-28"},
    {"n":6,"title":"วัดประยูร","name_en":"Wat Prayoon","area":"เกาะรัตนโกสินทร์–ริมเจ้าพระยา","address":"24 Prajadhipok Rd, Wat Kanlaya, Thon Buri, Bangkok 10600","hours":[{"d":[0,1,2,3,4,5,6],"o":"08:00","c":"18:00"}],"hours_note":"ทุกวัน 08.00–18.00","transit_note":"ข้ามสะพานพุทธฯ จาก MRT สนามไชย","lat":13.7385,"lng":100.4966,"start":"2026-10-29","end":"2027-02-28"},
    {"n":7,"title":"วัน แบงค็อก","name_en":"One Bangkok","area":"ลุมพินี","address":"Witthayu Rd and Rama IV Rd, Lumphini, Pathum Wan, Bangkok 10330","hours":[{"d":[0,1,2,3,4,5,6],"o":"10:00","c":"22:00"}],"hours_note":"ทุกวัน 10.00–22.00","transit_note":"MRT ลุมพินี","lat":13.7265,"lng":100.5476,"start":"2026-10-29","end":"2027-02-28"},
    {"n":8,"title":"สมาคมฝรั่งเศสกรุงเทพ","name_en":"Alliance Française Bangkok","area":"ลุมพินี","address":"179 Witthayu Rd, Lumphini, Pathum Wan, Bangkok 10330","hours":[{"d":[1,2,3,4,5,6],"o":"08:00","c":"19:00"},{"d":[0],"o":"08:00","c":"17:00"}],"hours_note":"จ.–ส. 08.00–19.00 · อา. 08.00–17.00","transit_note":"MRT ลุมพินี","lat":13.7243,"lng":100.5464,"start":"2026-10-29","end":"2027-02-28"},
    {"n":9,"title":"เซ็นทรัลเวิลด์","name_en":"centralwOrld","area":"ปทุมวัน–สยาม","address":"999/9 Rama I Rd, Pathum Wan, Bangkok 10330","hours":[{"d":[0,1,2,3,4,5,6],"o":"10:00","c":"22:00"}],"hours_note":"ทุกวัน 10.00–22.00","transit_note":"BTS ชิดลม","lat":13.7466,"lng":100.5393,"start":"2026-10-29","end":"2027-02-28"},
    {"n":10,"title":"สยามพารากอน","name_en":"Siam Paragon","area":"ปทุมวัน–สยาม","address":"991 Rama I Rd, Pathum Wan, Bangkok 10330","hours":[{"d":[0,1,2,3,4,5,6],"o":"10:00","c":"22:00"}],"hours_note":"ทุกวัน 10.00–22.00","transit_note":"BTS สยาม","lat":13.7462,"lng":100.5347,"start":"2026-10-29","end":"2027-02-28"},
    {"n":11,"title":"หอศิลปวัฒนธรรมแห่งกรุงเทพมหานคร","name_en":"BACC (Bangkok Art and Culture Centre)","area":"ปทุมวัน–สยาม","address":"939 Rama I Rd, Wang Mai, Pathum Wan, Bangkok 10330","hours":[{"d":[0,2,3,4,5,6],"o":"10:00","c":"20:00"}],"hours_note":"อ.–อา. 10.00–20.00","closed_note":"ปิดวันจันทร์","transit_note":"BTS สนามกีฬาแห่งชาติ","lat":13.7466,"lng":100.5302,"start":"2026-10-29","end":"2027-02-28"},
    {"n":12,"title":"LV The Place Bangkok","name_en":"Louis Vuitton Visionary Journeys","area":"ปทุมวัน–สยาม","address":null,"hours":[{"d":[0,1,2,3,4,5,6],"o":"10:00","c":"20:00"}],"hours_note":"ทุกวัน 10.00–20.00","admission_note":"เข้าชมฟรี · แนะนำให้จองล่วงหน้า","transit_note":"BTS ชิดลม","date_note":"ต.ค. 2026 – ต.ค. 2027","lat":13.7439,"lng":100.5414,"start":null,"end":null,"special":true,"fee":"free"}
  ]$json$::jsonb) LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM anthem.events WHERE parent_id = p.id AND name_en = v ->> 'name_en');
    INSERT INTO anthem.events (
      owner_id, parent_id, sort_order, title, name_en, category, origin, status, published_at,
      starts_on, ends_on, date_note, location_name, location_note, area, address,
      opening_hours, hours_note, closed_note, admission_note, transit_note,
      lat, lng, coords_approx, is_special, fee_type,
      source_name, source_url, source_checked_at)
    VALUES (
      p.owner_id, p.id, (v ->> 'n')::smallint, v ->> 'title', v ->> 'name_en', p.category, p.origin, 'published', now(),
      (v ->> 'start')::date, (v ->> 'end')::date, v ->> 'date_note', v ->> 'title', v ->> 'address', v ->> 'area', v ->> 'address',
      v -> 'hours', v ->> 'hours_note', v ->> 'closed_note', v ->> 'admission_note', v ->> 'transit_note',
      (v ->> 'lat')::double precision, (v ->> 'lng')::double precision, true, coalesce((v ->> 'special')::boolean, false),
      coalesce(v ->> 'fee', 'unspecified'),
      'Bangkok Art Biennale', 'https://maps26.bkkartbiennale.com/', '2026-11-03T00:00:00+07');
  END LOOP;

  -- Pin BAB 2026 as the featured event until it ends (only if nothing else is featured).
  IF NOT EXISTS (SELECT 1 FROM anthem.events WHERE is_featured) THEN
    UPDATE anthem.events SET is_featured = true, featured_until = '2027-02-28', featured_at = now() WHERE id = p.id;
  END IF;
END $$;

-- Rollback:
-- DELETE FROM anthem.events WHERE parent_id IS NOT NULL;
-- DROP FUNCTION IF EXISTS public.set_event_venues_interest(uuid, boolean);
-- DROP FUNCTION IF EXISTS public.admin_event_venues_reorder(uuid, uuid[]);
-- DROP FUNCTION IF EXISTS public.admin_event_venue_delete(uuid);
-- DROP FUNCTION IF EXISTS public.admin_event_venue_save(uuid, uuid, jsonb);
-- DROP FUNCTION IF EXISTS public.admin_set_event_featured(uuid, boolean, date);
-- DROP FUNCTION IF EXISTS anthem.event_hours_ok(jsonb);
-- (then re-run queue_event_reminders from 20261104110000_event_interest.sql)
-- ALTER TABLE anthem.events DROP COLUMN parent_id, DROP COLUMN sort_order, DROP COLUMN name_en, DROP COLUMN area,
--   DROP COLUMN address, DROP COLUMN opening_hours, DROP COLUMN hours_note, DROP COLUMN closed_note,
--   DROP COLUMN admission_note, DROP COLUMN transit_note, DROP COLUMN date_note, DROP COLUMN lat, DROP COLUMN lng,
--   DROP COLUMN coords_approx, DROP COLUMN is_special, DROP COLUMN is_featured, DROP COLUMN featured_until,
--   DROP COLUMN featured_at;
