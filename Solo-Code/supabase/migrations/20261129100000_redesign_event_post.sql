-- Redesign step 11 (EventPost, /dashboard/exhibition/new · /:id/edit): what the new event form needs from
-- event_save / event_submit. The old editor keeps working (it sends none of the new keys).
--   * event_save also takes
--       - cover_size [w, h] and media_sizes { url: [w, h] } (pictures are never cropped; sizes are kept at upload),
--       - insights: the member's own open-call lines (deadline, eligibility, steps, benefits) and one PDF
--         announcement { label, url } from their own events folder. The team's other summary lines and links stay.
--     and saves an event that is In review (it stays In review, back of the queue) — the mock edits it in place.
--   * DETAILS has no picture limit (mock: unlimited, like works): the 8-picture check goes.
--   * Pictures may be GIF too (mock "JPG · PNG · GIF").
--   * event_submit asks only what the mock asks: title, a start day and a place (open calls: link + deadline are
--     checked by the page, so the old editor is not broken). No end day = a one-day event. Cover and description
--     are no longer required; the team still reviews every member event. One published work is still required.
-- Rollback: supabase/manual/rollback-20261129100000_redesign_event_post.sql

ALTER TABLE anthem.events DROP CONSTRAINT IF EXISTS events_gallery_urls_check;

CREATE OR REPLACE FUNCTION anthem.event_image_ok(_url text, _owner uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT _url IS NULL OR (
    _url LIKE 'https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/project-media/anthem/'
              || _owner::text || '/events/%'
    AND _url ~* '\.(jpe?g|png|webp|gif)$'
    AND position('..' IN _url) = 0
  );
$$;

-- A PDF announcement the member uploaded from the event form.
CREATE OR REPLACE FUNCTION anthem.event_pdf_ok(_url text, _owner uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT _url IS NULL OR (
    _url LIKE 'https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/project-media/anthem/'
              || _owner::text || '/events/%'
    AND _url ~* '\.pdf$'
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
  v_cover text := nullif(_data ->> 'cover_url', '');
  v_cw integer;
  v_ch integer;
  v_sizes jsonb;
  v_ins jsonb;
  v_mine jsonb;
  v_pdf text;
  v_folder text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;

  IF _id IS NOT NULL THEN
    SELECT * INTO ev FROM anthem.events WHERE id = _id AND owner_id = uid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบงานนี้'; END IF;
  ELSIF (SELECT count(*) FROM anthem.events WHERE owner_id = uid AND status IN ('draft', 'needs_revision')) >= 20 THEN
    RAISE EXCEPTION 'มีร่างค้างได้ไม่เกิน 20 งาน';
  END IF;

  SELECT coalesce(array_agg(x), '{}') INTO v_gallery
    FROM jsonb_array_elements_text(coalesce(_data -> 'gallery_urls', '[]'::jsonb)) x;
  SELECT coalesce(array_agg(DISTINCT x::uuid), '{}') INTO v_projects
    FROM jsonb_array_elements_text(coalesce(_data -> 'project_ids', '[]'::jsonb)) x;

  IF NOT anthem.event_image_ok(v_cover, uid)
     OR EXISTS (SELECT 1 FROM unnest(v_gallery) g WHERE NOT anthem.event_image_ok(g, uid)) THEN
    RAISE EXCEPTION 'รูปต้องอัปโหลดผ่านหน้านี้ (JPG, PNG, WebP หรือ GIF)';
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
  -- Keep only the known keys so the stored JSON stays predictable for the page.
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

  -- Cover size: given by the new form; kept while the cover stays the same; dropped when it changes without one.
  IF jsonb_typeof(_data -> 'cover_size') = 'array'
     AND (_data -> 'cover_size' ->> 0) ~ '^\d{1,5}$' AND (_data -> 'cover_size' ->> 1) ~ '^\d{1,5}$' THEN
    v_cw := (_data -> 'cover_size' ->> 0)::integer;
    v_ch := (_data -> 'cover_size' ->> 1)::integer;
    IF v_cw NOT BETWEEN 1 AND 32767 OR v_ch NOT BETWEEN 1 AND 32767 THEN v_cw := NULL; v_ch := NULL; END IF;
  ELSIF v_cover IS NOT DISTINCT FROM ev.cover_url THEN
    v_cw := ev.cover_width;
    v_ch := ev.cover_height;
  END IF;
  IF v_cover IS NULL OR v_ch IS NULL THEN v_cw := NULL; v_ch := NULL; END IF;

  -- Picture sizes, only for pictures the event still shows.
  SELECT coalesce(jsonb_object_agg(k, v), '{}'::jsonb) INTO v_sizes
    FROM jsonb_each(
           CASE WHEN jsonb_typeof(_data -> 'media_sizes') = 'object' THEN _data -> 'media_sizes'
                ELSE coalesce(ev.media_sizes, '{}'::jsonb) END) AS m(k, v)
   WHERE (k = v_cover OR k = ANY (v_gallery))
     AND jsonb_typeof(v) = 'array' AND jsonb_array_length(v) = 2
     AND (v ->> 0) ~ '^\d{1,5}$' AND (v ->> 1) ~ '^\d{1,5}$'
     AND (v ->> 0)::integer BETWEEN 1 AND 32767 AND (v ->> 1)::integer BETWEEN 1 AND 32767;

  -- The member's own summary lines + PDF; the team's other lines and links stay as they are.
  v_ins := ev.insights;
  IF jsonb_typeof(_data -> 'insights') = 'object' THEN
    v_mine := _data -> 'insights';
    v_pdf := nullif(btrim(coalesce(v_mine -> 'pdf' ->> 'url', '')), '');
    IF NOT anthem.event_pdf_ok(v_pdf, uid) THEN
      RAISE EXCEPTION 'ไฟล์ประกาศต้องเป็น PDF ที่อัปโหลดผ่านหน้านี้';
    END IF;
    v_folder := 'https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/project-media/anthem/' || uid::text || '/events/%';
    v_ins := coalesce(ev.insights, '{}'::jsonb) - 'deadline' - 'eligibility' - 'steps' - 'benefits' - 'links'
      || jsonb_strip_nulls(jsonb_build_object(
           'deadline', v_mine -> 'deadline',
           'eligibility', v_mine -> 'eligibility',
           'steps', v_mine -> 'steps',
           'benefits', v_mine -> 'benefits'))
      || jsonb_build_object('links',
           coalesce((SELECT jsonb_agg(l) FROM jsonb_array_elements(
                       CASE WHEN jsonb_typeof(ev.insights -> 'links') = 'array' THEN ev.insights -> 'links' ELSE '[]'::jsonb END) l
                      WHERE coalesce(l ->> 'url', '') NOT LIKE v_folder), '[]'::jsonb)
           || CASE WHEN v_pdf IS NULL THEN '[]'::jsonb
                   ELSE jsonb_build_array(jsonb_build_object(
                          'label', coalesce(nullif(left(btrim(coalesce(v_mine -> 'pdf' ->> 'label', '')), 100), ''), 'ประกาศ (PDF)'),
                          'url', v_pdf, 'kind', 'download')) END);
    v_ins := anthem.event_insights_clean(v_ins);
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
    cover_url = v_cover,
    cover_width = v_cw,
    cover_height = v_ch,
    media_sizes = v_sizes,
    gallery_urls = v_gallery,
    insights = v_ins,
    website_url = nullif(btrim(coalesce(_data ->> 'website_url', '')), ''),
    registration_url = nullif(btrim(coalesce(_data ->> 'registration_url', '')), ''),
    ticket_url = nullif(btrim(coalesce(_data ->> 'ticket_url', '')), ''),
    registration_open = coalesce((_data ->> 'registration_open')::boolean, false),
    -- Creators choose free or paid; only admin_event_save may store 'unspecified'.
    fee_type = CASE WHEN _data ->> 'fee_type' = 'paid' THEN 'paid' ELSE 'free' END,
    fee_note = CASE WHEN _data ->> 'fee_type' = 'paid' THEN nullif(btrim(coalesce(_data ->> 'fee_note', '')), '') END,
    sponsors = v_sponsors,
    open_for_sponsors = coalesce((_data ->> 'open_for_sponsors')::boolean, false),
    project_ids = v_projects,
    -- A published event that changes goes back to the queue; it is never live with unreviewed content.
    -- One that is In review stays there, at the back of the queue.
    status = CASE WHEN status = 'published' THEN 'pending' ELSE status END,
    submitted_at = CASE WHEN status IN ('published', 'pending') THEN now() ELSE submitted_at END,
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
    RAISE EXCEPTION 'ต้องมีผลงานที่เผยแพร่แล้วอย่างน้อย 1 ชิ้นก่อนส่งอีเวนต์';
  END IF;
  IF (SELECT count(*) FROM anthem.events WHERE owner_id = uid AND status = 'pending') >= 5 THEN
    RAISE EXCEPTION 'มีงานรอตรวจได้ไม่เกิน 5 งาน';
  END IF;

  IF char_length(ev.title) = 0 OR ev.starts_on IS NULL OR ev.location_name IS NULL THEN
    RAISE EXCEPTION 'กรอกชื่องาน วันที่ และสถานที่ให้ครบก่อนส่ง';
  END IF;
  IF coalesce(ev.ends_on, ev.starts_on) < current_date THEN
    RAISE EXCEPTION 'งานนี้จบไปแล้ว';
  END IF;

  UPDATE anthem.events
     SET status = 'pending', submitted_at = now(), review_note = NULL,
         ends_on = coalesce(ends_on, starts_on), updated_at = now()
   WHERE id = _id;
END;
$function$;

REVOKE ALL ON FUNCTION anthem.event_pdf_ok(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION anthem.event_pdf_ok(text, uuid) TO authenticated;
