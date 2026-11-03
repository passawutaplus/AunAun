-- SAMECOR Exhibition: creators list their own exhibitions/events; the SameCor team reviews each one.
-- Owner decisions, 2026-11-02:
-- * any creator with at least one published work can submit, from My Studio → My Exhibition
-- * an admin reviews every submission (approve / request revision / reject) and can mark a SameCor Pick
-- * entry fee is display-only text; registration is an external link
-- * sponsors belong to the event (the organiser's own sponsors), up to 5, plus an "open for sponsors" switch
-- * an event can show up to 6 of the organiser's own published works
-- Owner decisions, 2026-11-03 (curated events, phase 1):
-- * three origins: SameCor Original (team-run), Community (submitted), Curated (found elsewhere, checked by the team)
-- * curated events always keep their source (name, URL, last checked); nothing found is "not specified", never guessed
-- * no images are copied from other sites; a curated event without a cover shows a SameCor placeholder
-- Clients only read. Every write goes through the functions below, so the review lock, the image
-- ownership rules and the limits are enforced here, not in the browser.

CREATE TABLE IF NOT EXISTS anthem.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 100),
  category text NOT NULL DEFAULT 'exhibition'
    CHECK (category IN ('exhibition', 'workshop', 'art_fair', 'talk_forum', 'open_call', 'other')),
  starts_on date,
  ends_on date,
  time_note text CHECK (char_length(time_note) <= 60),
  location_name text CHECK (char_length(location_name) <= 120),
  location_note text CHECK (char_length(location_note) <= 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  organizer_name text CHECK (char_length(organizer_name) <= 100),
  cover_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}' CHECK (cardinality(gallery_urls) <= 8),
  website_url text,
  registration_url text,  -- register / RSVP / apply (open call)
  ticket_url text,        -- buy tickets, when that is a separate page
  registration_open boolean NOT NULL DEFAULT false,
  -- 'unspecified' is only set by the team for curated events whose source does not say.
  fee_type text NOT NULL DEFAULT 'free' CHECK (fee_type IN ('free', 'paid', 'unspecified')),
  fee_note text CHECK (char_length(fee_note) <= 60),
  sponsors jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sponsors) = 'array' AND jsonb_array_length(sponsors) <= 5),
  open_for_sponsors boolean NOT NULL DEFAULT false,
  project_ids uuid[] NOT NULL DEFAULT '{}' CHECK (cardinality(project_ids) <= 6),
  origin text NOT NULL DEFAULT 'community' CHECK (origin IN ('original', 'community', 'curated')),
  source_name text CHECK (char_length(source_name) <= 120),
  source_url text,
  source_checked_at timestamptz,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'published', 'needs_revision', 'rejected')),
  review_note text CHECK (char_length(review_note) <= 1000),
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  published_at timestamptz,
  is_pick boolean NOT NULL DEFAULT false,
  picked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_events_owner ON anthem.events (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_published ON anthem.events (ends_on, starts_on) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_events_queue ON anthem.events (submitted_at) WHERE status = 'pending';

ALTER TABLE anthem.events ENABLE ROW LEVEL SECURITY;

-- anon may not read profiles.account_status, so the policy asks this definer helper instead.
CREATE OR REPLACE FUNCTION anthem.account_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND coalesce(p.account_status, 'active') = 'active');
$$;

REVOKE ALL ON FUNCTION anthem.account_is_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.account_is_active(uuid) TO anon, authenticated;

-- Published events are public while the organiser's account is active (a deactivated or deleted
-- account hides its events with no extra step). Owners see their own; admins see everything.
DROP POLICY IF EXISTS events_read ON anthem.events;
CREATE POLICY events_read ON anthem.events
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND anthem.account_is_active(owner_id))
    OR owner_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

REVOKE ALL ON anthem.events FROM anon, authenticated;
GRANT SELECT ON anthem.events TO anon, authenticated;

-- ── Validation helpers ────────────────────────────────────────────────────────
-- Images must be files the owner uploaded to their own events folder (see uploadAnthemMedia).
CREATE OR REPLACE FUNCTION anthem.event_image_ok(_url text, _owner uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _url IS NULL OR (
    _url LIKE 'https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/project-media/anthem/'
              || _owner::text || '/events/%'
    AND _url ~* '\.(jpe?g|png|webp)$'
    AND position('..' IN _url) = 0
  );
$$;

-- Outbound links: http(s) only, no shorteners (same list the project asset scanner blocks).
CREATE OR REPLACE FUNCTION anthem.event_link_ok(_url text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _url IS NULL OR (
    char_length(_url) <= 500
    AND _url ~* '^https?://[a-z0-9.-]+\.[a-z]{2,}(/|$|\?|#)'
    AND lower(substring(_url FROM '^https?://([^/?#:]+)')) NOT IN (
      'bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly',
      'cutt.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 'lnkd.in', 's.id', 'v.gd', 'clck.ru', 'adf.ly', 'bc.vc')
  );
$$;

-- ── Owner: save (create or edit) ──────────────────────────────────────────────
-- Drafts, revisions and rejected events can be edited freely. A pending event is locked until the
-- review ends. Editing a published event sends it back to review (hidden until approved again);
-- the two quick switches have their own function so they never need a review.
CREATE OR REPLACE FUNCTION public.event_save(_id uuid, _data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
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
    -- Creators choose free or paid; only admin_event_save may store 'unspecified'.
    fee_type = CASE WHEN _data ->> 'fee_type' = 'paid' THEN 'paid' ELSE 'free' END,
    fee_note = CASE WHEN _data ->> 'fee_type' = 'paid' THEN nullif(btrim(coalesce(_data ->> 'fee_note', '')), '') END,
    sponsors = v_sponsors,
    open_for_sponsors = coalesce((_data ->> 'open_for_sponsors')::boolean, false),
    project_ids = v_projects,
    -- A published event that changes goes back to the queue; it is never live with unreviewed content.
    status = CASE WHEN status = 'published' THEN 'pending' ELSE status END,
    submitted_at = CASE WHEN status = 'published' THEN now() ELSE submitted_at END,
    is_pick = CASE WHEN status = 'published' THEN false ELSE is_pick END,
    updated_at = now()
  WHERE id = new_id;

  RETURN new_id;
END;
$$;

-- ── Owner: submit for review ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.event_submit(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
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
$$;

-- ── Owner: withdraw, delete, quick switches ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.event_withdraw(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  UPDATE anthem.events SET status = 'draft', updated_at = now()
   WHERE id = _id AND owner_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'ถอนได้เฉพาะงานที่รอตรวจ'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.event_delete(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  DELETE FROM anthem.events WHERE id = _id AND owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบงานนี้'; END IF;
END;
$$;

-- Registration and sponsor switches change no reviewed content, so they apply at once.
CREATE OR REPLACE FUNCTION public.event_set_switches(_id uuid, _registration_open boolean, _open_for_sponsors boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  UPDATE anthem.events
     SET registration_open = coalesce(_registration_open, registration_open),
         open_for_sponsors = coalesce(_open_for_sponsors, open_for_sponsors),
         updated_at = now()
   WHERE id = _id AND owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบงานนี้'; END IF;
END;
$$;

-- ── Admin: review and SameCor Pick ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_review_event(_id uuid, _decision text, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  ev anthem.events;
  v_note text := nullif(btrim(coalesce(_note, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์'; END IF;
  IF _decision NOT IN ('approve', 'revise', 'reject') THEN RAISE EXCEPTION 'คำตัดสินไม่ถูกต้อง'; END IF;
  IF _decision IN ('revise', 'reject') AND v_note IS NULL THEN
    RAISE EXCEPTION 'บอกผู้จัดด้วยว่าต้องแก้อะไร หรือเหตุผลที่ปฏิเสธ';
  END IF;

  SELECT * INTO ev FROM anthem.events WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR ev.status <> 'pending' THEN RAISE EXCEPTION 'งานนี้ไม่ได้อยู่ในคิวตรวจ'; END IF;

  UPDATE anthem.events SET
    status = CASE _decision WHEN 'approve' THEN 'published' WHEN 'revise' THEN 'needs_revision' ELSE 'rejected' END,
    review_note = v_note,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    published_at = CASE WHEN _decision = 'approve' THEN now() ELSE published_at END,
    updated_at = now()
  WHERE id = _id;

  INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
  VALUES (
    ev.owner_id, 'anthem', 'event_review',
    CASE _decision WHEN 'approve' THEN 'Exhibition ของคุณเผยแพร่แล้ว'
                   WHEN 'revise' THEN 'Exhibition ของคุณต้องแก้ไขก่อนเผยแพร่'
                   ELSE 'Exhibition ของคุณไม่ผ่านการตรวจ' END,
    coalesce(v_note, ev.title),
    CASE WHEN _decision = 'approve' THEN '/exhibition/' || ev.id ELSE '/dashboard/exhibition' END,
    jsonb_build_object('event_id', ev.id, 'decision', _decision)
  );

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'event_' || _decision, 'event', ev.id::text, jsonb_build_object('note', v_note));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_event_pick(_id uuid, _pick boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์'; END IF;
  UPDATE anthem.events
     SET is_pick = _pick, picked_at = CASE WHEN _pick THEN now() END, updated_at = now()
   WHERE id = _id AND status = 'published';
  IF NOT FOUND THEN RAISE EXCEPTION 'เลือกได้เฉพาะงานที่เผยแพร่แล้ว'; END IF;
  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), CASE WHEN _pick THEN 'event_pick' ELSE 'event_unpick' END, 'event', _id::text, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION anthem.event_image_ok(text, uuid), anthem.event_link_ok(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.event_save(uuid, jsonb), public.event_submit(uuid), public.event_withdraw(uuid),
  public.event_delete(uuid), public.event_set_switches(uuid, boolean, boolean),
  public.admin_review_event(uuid, text, text), public.admin_set_event_pick(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_save(uuid, jsonb), public.event_submit(uuid), public.event_withdraw(uuid),
  public.event_delete(uuid), public.event_set_switches(uuid, boolean, boolean),
  public.admin_review_event(uuid, text, text), public.admin_set_event_pick(uuid, boolean) TO authenticated;

-- ── Team events: SameCor Original and Curated ────────────────────────────────
-- The team writes through event_save (same validation as creators: own-folder images, safe links,
-- limits), then this sets the origin, the source and the status. No review queue: the team is the reviewer.
CREATE OR REPLACE FUNCTION public.admin_event_save(_id uuid, _data jsonb, _publish boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  v_origin text := coalesce(nullif(_data ->> 'origin', ''), 'curated');
  v_source_url text := nullif(btrim(coalesce(_data ->> 'source_url', '')), '');
  v_source_name text := nullif(btrim(coalesce(_data ->> 'source_name', '')), '');
  v_id uuid;
  v_pick boolean;
  ev anthem.events;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์'; END IF;
  IF v_origin NOT IN ('original', 'curated') THEN RAISE EXCEPTION 'ประเภทงานไม่ถูกต้อง'; END IF;
  -- event_save drops the Pick when a published event changes; a team edit keeps it.
  SELECT is_pick INTO v_pick FROM anthem.events WHERE id = _id;
  IF _id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM anthem.events WHERE id = _id AND owner_id = auth.uid() AND origin IN ('original', 'curated')
  ) THEN
    RAISE EXCEPTION 'แก้ได้เฉพาะงานที่ทีมลงเอง';
  END IF;
  IF NOT anthem.event_link_ok(v_source_url) OR char_length(coalesce(v_source_name, '')) > 120 THEN
    RAISE EXCEPTION 'ลิงก์แหล่งที่มาไม่ถูกต้อง';
  END IF;
  IF v_origin = 'curated' AND (v_source_url IS NULL OR v_source_name IS NULL) THEN
    RAISE EXCEPTION 'งาน Curated ต้องระบุแหล่งที่มาและลิงก์ต้นทาง';
  END IF;

  v_id := public.event_save(_id, _data);

  UPDATE anthem.events SET
    origin = v_origin,
    source_name = v_source_name,
    source_url = v_source_url,
    source_checked_at = CASE WHEN v_source_url IS NULL THEN NULL
                             ELSE coalesce(nullif(_data ->> 'source_checked_at', '')::timestamptz, now()) END,
    fee_type = CASE WHEN _data ->> 'fee_type' = 'unspecified' THEN 'unspecified' ELSE fee_type END,
    status = CASE WHEN _publish THEN 'published' ELSE 'draft' END,
    published_at = CASE WHEN _publish THEN coalesce(published_at, now()) ELSE NULL END,
    is_pick = _publish AND coalesce(v_pick, false),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = v_id
  RETURNING * INTO ev;

  IF _publish AND (char_length(ev.title) = 0 OR ev.starts_on IS NULL OR ev.ends_on IS NULL
                   OR ev.location_name IS NULL OR char_length(ev.description) = 0) THEN
    RAISE EXCEPTION 'กรอกชื่องาน วันที่ สถานที่ และรายละเอียดให้ครบก่อนเผยแพร่';
  END IF;

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), CASE WHEN _publish THEN 'event_publish_team' ELSE 'event_draft_team' END, 'event', v_id::text,
          jsonb_build_object('origin', v_origin, 'source_url', v_source_url));
  RETURN v_id;
END;
$$;

-- Possible duplicates before the team adds an event: same source link, or a similar title within two weeks.
CREATE OR REPLACE FUNCTION public.admin_event_similar(_title text, _starts_on date DEFAULT NULL, _source_url text DEFAULT NULL)
RETURNS TABLE (id uuid, title text, starts_on date, ends_on date, status text, origin text, score real)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์'; END IF;
  RETURN QUERY
  SELECT e.id, e.title, e.starts_on, e.ends_on, e.status, e.origin,
         greatest(similarity(lower(e.title), lower(coalesce(_title, ''))),
                  CASE WHEN _source_url IS NOT NULL AND e.source_url = _source_url THEN 1 ELSE 0 END)::real
    FROM anthem.events e
   WHERE (_source_url IS NOT NULL AND e.source_url = _source_url)
      OR (similarity(lower(e.title), lower(coalesce(_title, ''))) > 0.35
          AND (_starts_on IS NULL OR e.starts_on IS NULL OR abs(e.starts_on - _starts_on) <= 14))
   ORDER BY 7 DESC
   LIMIT 5;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_event_save(uuid, jsonb, boolean), public.admin_event_similar(text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_event_save(uuid, jsonb, boolean), public.admin_event_similar(text, date, text) TO authenticated;
