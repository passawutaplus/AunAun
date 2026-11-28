-- Rollback of 20261129100000_redesign_event_post.sql: event_save / event_submit / event_image_ok as before step 11.
-- Picture sizes, insights and pictures saved in between stay in the rows; only the functions and the limit go back.
-- The 8-picture check comes back NOT VALID, so events that already have more pictures keep them.

ALTER TABLE anthem.events DROP CONSTRAINT IF EXISTS events_gallery_urls_check;
ALTER TABLE anthem.events ADD CONSTRAINT events_gallery_urls_check CHECK (cardinality(gallery_urls) <= 8) NOT VALID;

CREATE OR REPLACE FUNCTION anthem.event_image_ok(_url text, _owner uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT _url IS NULL OR (
    _url LIKE 'https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/project-media/anthem/'
              || _owner::text || '/events/%'
    AND _url ~* '\.(jpe?g|png|webp)$'
    AND position('..' IN _url) = 0
  );
$$;

CREATE OR REPLACE FUNCTION public.event_save(_id uuid, _data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  ev anthem.events;
  v_gallery text[];
  v_projects uuid[];
  v_sponsors jsonb := coalesce(_data -> 'sponsors', '[]'::jsonb);
  s jsonb;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;

  IF _id IS NOT NULL THEN
    SELECT * INTO ev FROM anthem.events WHERE id = _id AND owner_id = uid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบงานนี้'; END IF;
    IF ev.status = 'pending' THEN RAISE EXCEPTION 'งานนี้อยู่ระหว่างตรวจ — ถอนการส่งก่อนแก้ไข'; END IF;
  ELSIF (SELECT count(*) FROM anthem.events WHERE owner_id = uid AND status IN ('draft', 'needs_revision')) >= 20 THEN
    RAISE EXCEPTION 'มีร่างค้างได้ไม่เกิน 20 งาน';
  END IF;

  SELECT coalesce(array_agg(x), '{}') INTO v_gallery
    FROM jsonb_array_elements_text(coalesce(_data -> 'gallery_urls', '[]'::jsonb)) x;
  SELECT coalesce(array_agg(DISTINCT x::uuid), '{}') INTO v_projects
    FROM jsonb_array_elements_text(coalesce(_data -> 'project_ids', '[]'::jsonb)) x;

  IF NOT anthem.event_image_ok(_data ->> 'cover_url', uid)
     OR EXISTS (SELECT 1 FROM unnest(v_gallery) g WHERE NOT anthem.event_image_ok(g, uid)) THEN
    RAISE EXCEPTION 'รูปต้องอัปโหลดผ่านหน้านี้ (JPG, PNG หรือ WebP)';
  END IF;
  IF NOT anthem.event_link_ok(nullif(btrim(_data ->> 'website_url'), ''))
     OR NOT anthem.event_link_ok(nullif(btrim(_data ->> 'registration_url'), ''))
     OR NOT anthem.event_link_ok(nullif(btrim(_data ->> 'ticket_url'), '')) THEN
    RAISE EXCEPTION 'ลิงก์ต้องขึ้นต้นด้วย https:// และห้ามใช้ลิงก์ย่อ';
  END IF;

  IF jsonb_typeof(v_sponsors) <> 'array' OR jsonb_array_length(v_sponsors) > 5 THEN
    RAISE EXCEPTION 'ใส่ผู้สนับสนุนได้ไม่เกิน 5 ราย';
  END IF;
  FOR s IN SELECT * FROM jsonb_array_elements(v_sponsors) LOOP
    IF jsonb_typeof(s) <> 'object'
       OR char_length(btrim(coalesce(s ->> 'name', ''))) NOT BETWEEN 1 AND 80
       OR char_length(coalesce(s ->> 'note', '')) > 120
       OR NOT anthem.event_image_ok(nullif(s ->> 'logo_url', ''), uid) THEN
      RAISE EXCEPTION 'ข้อมูลผู้สนับสนุนไม่ถูกต้อง (ชื่อไม่เกิน 80 ตัวอักษร คำอธิบายไม่เกิน 120)';
    END IF;
  END LOOP;
  SELECT coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'name', btrim(x ->> 'name'),
           'logo_url', nullif(x ->> 'logo_url', ''),
           'note', nullif(btrim(coalesce(x ->> 'note', '')), '')))), '[]'::jsonb)
    INTO v_sponsors FROM jsonb_array_elements(v_sponsors) x;

  IF EXISTS (
    SELECT 1 FROM unnest(v_projects) pid
    WHERE NOT EXISTS (SELECT 1 FROM anthem.projects p WHERE p.id = pid AND p.owner_id = uid AND p.status = 'Published')
  ) THEN
    RAISE EXCEPTION 'เลือกได้เฉพาะผลงานของคุณที่เผยแพร่แล้ว';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO anthem.events (owner_id) VALUES (uid) RETURNING id INTO new_id;
  ELSE
    new_id := _id;
  END IF;

  UPDATE anthem.events SET
    title = btrim(coalesce(_data ->> 'title', '')),
    category = coalesce(nullif(_data ->> 'category', ''), 'exhibition'),
    starts_on = nullif(_data ->> 'starts_on', '')::date,
    ends_on = nullif(_data ->> 'ends_on', '')::date,
    time_note = nullif(btrim(coalesce(_data ->> 'time_note', '')), ''),
    location_name = nullif(btrim(coalesce(_data ->> 'location_name', '')), ''),
    location_note = nullif(btrim(coalesce(_data ->> 'location_note', '')), ''),
    description = btrim(coalesce(_data ->> 'description', '')),
    organizer_name = nullif(btrim(coalesce(_data ->> 'organizer_name', '')), ''),
    cover_url = nullif(_data ->> 'cover_url', ''),
    gallery_urls = v_gallery,
    website_url = nullif(btrim(coalesce(_data ->> 'website_url', '')), ''),
    registration_url = nullif(btrim(coalesce(_data ->> 'registration_url', '')), ''),
    ticket_url = nullif(btrim(coalesce(_data ->> 'ticket_url', '')), ''),
    registration_open = coalesce((_data ->> 'registration_open')::boolean, false),
    fee_type = CASE WHEN _data ->> 'fee_type' = 'paid' THEN 'paid' ELSE 'free' END,
    fee_note = CASE WHEN _data ->> 'fee_type' = 'paid' THEN nullif(btrim(coalesce(_data ->> 'fee_note', '')), '') END,
    sponsors = v_sponsors,
    open_for_sponsors = coalesce((_data ->> 'open_for_sponsors')::boolean, false),
    project_ids = v_projects,
    status = CASE WHEN status = 'published' THEN 'pending' ELSE status END,
    submitted_at = CASE WHEN status = 'published' THEN now() ELSE submitted_at END,
    is_pick = CASE WHEN status = 'published' THEN false ELSE is_pick END,
    updated_at = now()
  WHERE id = new_id;

  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.event_submit(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  ev anthem.events;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
  SELECT * INTO ev FROM anthem.events WHERE id = _id AND owner_id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบงานนี้'; END IF;
  IF ev.status NOT IN ('draft', 'needs_revision', 'rejected') THEN
    RAISE EXCEPTION 'ส่งงานนี้ซ้ำไม่ได้';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM anthem.projects p WHERE p.owner_id = uid AND p.status = 'Published') THEN
    RAISE EXCEPTION 'ต้องมีผลงานที่เผยแพร่แล้วอย่างน้อย 1 ชิ้นก่อนส่ง Exhibition';
  END IF;
  IF (SELECT count(*) FROM anthem.events WHERE owner_id = uid AND status = 'pending') >= 5 THEN
    RAISE EXCEPTION 'มีงานรอตรวจได้ไม่เกิน 5 งาน';
  END IF;

  IF char_length(ev.title) = 0 OR ev.starts_on IS NULL OR ev.ends_on IS NULL
     OR ev.location_name IS NULL OR char_length(ev.description) = 0 OR ev.cover_url IS NULL THEN
    RAISE EXCEPTION 'กรอกชื่องาน วันที่ สถานที่ รายละเอียด และรูปปกให้ครบก่อนส่ง';
  END IF;
  IF ev.ends_on < current_date THEN
    RAISE EXCEPTION 'งานนี้จบไปแล้ว';
  END IF;

  UPDATE anthem.events
     SET status = 'pending', submitted_at = now(), review_note = NULL, updated_at = now()
   WHERE id = _id;
END;
$function$;

DROP FUNCTION IF EXISTS anthem.event_pdf_ok(text, uuid);
