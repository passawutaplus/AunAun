-- "สรุปโดย SAMECOR": category-specific details on top of who_for / takeaways / know_before.
--   steps        ordered steps (apply / book / register)            ≤ 8 × 140
--   eligibility  ใครสมัครได้ (open calls)                           ≤ 5 × 140
--   benefits     รางวัล / สิ่งที่ได้                                  ≤ 5 × 140
--   bring        สิ่งที่ต้องเตรียม (workshops)                        ≤ 6 × 140
--   speakers     วิทยากร (talks)                                      ≤ 8 × 140
--   schedule     กำหนดการ / รอบ                                      ≤ 8 × 140
--   highlights   ไฮไลต์ (art fairs)                                   ≤ 6 × 140
--   capacity     e.g. "รับ 12 คน"                                     ≤ 80
--   deadline     YYYY-MM-DD, closing date when it differs from ends_on
--   links        [{label (short: what it is, e.g. "ใบสมัคร (.docx)"), url (https, no shorteners), kind}] ≤ 6,
--                kind ∈ download · form · rules · register · tickets · info
-- Unknown keys are dropped. URLs must come from the organiser's own page.

CREATE OR REPLACE FUNCTION anthem.event_insights_clean(_in jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = anthem, public
AS $$
DECLARE
  v_out jsonb := '{}'::jsonb;
  v_items jsonb;
  v_links jsonb := '[]'::jsonb;
  s record;
  l jsonb;
  v_url text;
  v_label text;
  v_text text;
BEGIN
  IF _in IS NULL OR jsonb_typeof(_in) <> 'object' THEN RETURN NULL; END IF;

  FOR s IN SELECT * FROM (VALUES
      ('who_for', 5, 140), ('takeaways', 4, 140), ('know_before', 5, 140), ('related_categories', 4, 40),
      ('steps', 8, 140), ('eligibility', 5, 140), ('benefits', 5, 140), ('bring', 6, 140),
      ('speakers', 8, 140), ('schedule', 8, 140), ('highlights', 6, 140)
    ) AS t(key, max_items, max_len)
  LOOP
    SELECT coalesce(jsonb_agg(v ORDER BY ord), '[]'::jsonb) INTO v_items
      FROM (SELECT left(btrim(x), s.max_len) AS v, ord
              FROM jsonb_array_elements(
                     CASE WHEN jsonb_typeof(_in -> s.key) = 'array' THEN _in -> s.key ELSE '[]'::jsonb END
                   ) WITH ORDINALITY AS a(e, ord),
                   LATERAL (SELECT e #>> '{}' AS x) xx
             WHERE jsonb_typeof(e) = 'string' AND btrim(x) <> ''
             ORDER BY ord
             LIMIT s.max_items) t;
    IF jsonb_array_length(v_items) > 0 THEN
      v_out := v_out || jsonb_build_object(s.key, v_items);
    END IF;
  END LOOP;

  v_text := left(btrim(coalesce(_in ->> 'capacity', '')), 80);
  IF v_text <> '' THEN v_out := v_out || jsonb_build_object('capacity', v_text); END IF;

  v_text := btrim(coalesce(_in ->> 'deadline', ''));
  IF v_text ~ '^\d{4}-\d{2}-\d{2}$' THEN
    BEGIN
      v_out := v_out || jsonb_build_object('deadline', v_text::date::text);
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;

  FOR l IN SELECT e FROM jsonb_array_elements(
             CASE WHEN jsonb_typeof(_in -> 'links') = 'array' THEN _in -> 'links' ELSE '[]'::jsonb END) AS a(e)
  LOOP
    EXIT WHEN jsonb_array_length(v_links) >= 6;
    CONTINUE WHEN jsonb_typeof(l) <> 'object';
    v_url := btrim(coalesce(l ->> 'url', ''));
    v_label := left(btrim(coalesce(l ->> 'label', '')), 100);
    CONTINUE WHEN v_label = '' OR v_url NOT LIKE 'https://%' OR NOT anthem.event_link_ok(v_url);
    CONTINUE WHEN coalesce(l ->> 'kind', '') NOT IN ('download', 'form', 'rules', 'register', 'tickets', 'info');
    v_links := v_links || jsonb_build_array(jsonb_build_object('label', v_label, 'url', v_url, 'kind', l ->> 'kind'));
  END LOOP;
  IF jsonb_array_length(v_links) > 0 THEN v_out := v_out || jsonb_build_object('links', v_links); END IF;

  RETURN CASE WHEN v_out = '{}'::jsonb THEN NULL ELSE v_out END;
END;
$$;
REVOKE ALL ON FUNCTION anthem.event_insights_clean(jsonb) FROM PUBLIC, anon, authenticated;

-- ── Backfill from the organisers' own pages (checked 2026-11-04) ──────────────
-- PAP 2027 (BACC): https://www.bacc.or.th/en/events/95963
UPDATE anthem.events SET insights = anthem.event_insights_clean(coalesce(insights, '{}'::jsonb) || $j${
  "steps": [
    "กรอกใบสมัคร + ข้อเสนอโครงการ ≤ 20 หน้า และขอจดหมายรับรอง",
    "รวมเป็น PDF ไฟล์เดียว ส่งทางอีเมลภายใน 6 ธ.ค. 2569",
    "สัมภาษณ์ออนไลน์ 19–20 ธ.ค. · ประกาศผล 26 ธ.ค. 2569"
  ],
  "eligibility": [
    "ศิลปินศิลปะการแสดง เดี่ยวหรือกลุ่ม ทำงานมาแล้ว ≥ 4 ปี",
    "งานใหม่ไม่เคยแสดง ตอบธีม Spiritual และข้ามสาขา",
    "ส่งได้คนละ / กลุ่มละ 1 ข้อเสนอ"
  ],
  "benefits": [
    "ทุนผลิตงาน 70,000 บาท",
    "ใช้ Studio ชั้น 4 BACC 25 วัน + ช่วยแสง เสียง บางส่วน",
    "ช่วยโปรโมตและถ่ายภาพการแสดง"
  ],
  "deadline": "2026-12-06",
  "links": [
    {"kind": "download", "label": "ใบสมัคร + ข้อเสนอโครงการ (.docx)",
     "url": "https://www.bacc.or.th/wp-content/uploads/2026/09/โครงการสนับสนุนพื้นที่สำหรับศิลปินสาขาศิลปะการแสดง2027.docx"},
    {"kind": "download", "label": "FAQ (.pdf)",
     "url": "https://www.bacc.or.th/wp-content/uploads/2026/09/FAQ-PAP-Open-call-2027.pdf"}
  ]
}$j$::jsonb) WHERE id = 'f6f2a350-9f68-43c6-a554-915aff5d8c4f';

-- Mascot contest (วช.): https://ripo.kmutt.ac.th/2026/11/21041/
-- Its application link is a kmutt.me shortener, so only the announcement page is linked.
UPDATE anthem.events SET insights = anthem.event_insights_clean(coalesce(insights, '{}'::jsonb) || $j${
  "steps": [
    "กรอกแบบฟอร์มจากลิงก์ในประกาศ ส่งผลงานภายใน 30 พ.ย. 2569",
    "ตัดสิน 25 ธ.ค. แล้วเปิดโหวต 28 ธ.ค. 2569 – 15 ม.ค. 2570",
    "ประกาศผล 22 ม.ค. 2570"
  ],
  "eligibility": ["นักเรียน นิสิต นักศึกษา นักวิจัย และบุคคลทั่วไป"],
  "benefits": [
    "ชนะเลิศ 25,000 บาท + ถ้วยและเกียรติบัตร",
    "ชมเชย 2 รางวัล รางวัลละ 10,000 บาท + เกียรติบัตร"
  ],
  "links": [
    {"kind": "info", "label": "ประกาศรับสมัคร",
     "url": "https://ripo.kmutt.ac.th/2026/11/21041/"}
  ]
}$j$::jsonb) WHERE id = 'ab2eb664-3374-432b-9d98-a4086acfda58';

-- Dib Bangkok workshop: https://dibbangkok.org/exhibition-home/post/still-life-still-painting-a-landscape-painting-workshop-part-2.html
UPDATE anthem.events SET insights = anthem.event_insights_clean(coalesce(insights, '{}'::jsonb) || $j${
  "steps": ["กด จองตั๋ว (1,250 บาท ไม่รวมบัตรพิพิธภัณฑ์)", "มาก่อน 30 นาที ลงทะเบียน 15:30"],
  "schedule": ["15:30–16:00 ลงทะเบียน", "16:00–18:00 เวิร์กช็อปเพนต์ภาพ"],
  "capacity": "รับ 12 คน",
  "links": [
    {"kind": "tickets", "label": "จองตั๋ว",
     "url": "https://dibbangkok.org/still-life-still-painting-2.html"}
  ]
}$j$::jsonb) WHERE id = 'd2dba830-001f-4678-b6de-de3543deaf38';

-- C-IDEA 2026 (Burapha): https://fineart.buu.ac.th/?p=11561 — no speakers / schedule published yet.
UPDATE anthem.events SET insights = anthem.event_insights_clean(coalesce(insights, '{}'::jsonb) || $j${
  "links": [{"kind": "info", "label": "เว็บไซต์ C-IDEA", "url": "https://cideaassociation.com/"}]
}$j$::jsonb) WHERE id = '80a9a629-f13e-42c7-957f-f61532a0598a';

-- ── About This Event: fuller, easy-to-read descriptions (rewritten from the organisers' pages) ──
UPDATE anthem.events SET updated_at = now(), description = $d$BACC (หอศิลปวัฒนธรรมแห่งกรุงเทพมหานคร) เปิดรับข้อเสนอผลงานศิลปะการแสดงชิ้นใหม่ สำหรับ Performative Art Project ครั้งที่ 16 ภายใต้ธีม “Spiritual” ซึ่งตีความได้อย่างกว้าง ผลงานที่ได้รับคัดเลือกจะได้จัดแสดงที่ BACC ในเดือนตุลาคม 2570

เปิดรับทุกแขนงของศิลปะการแสดง ทั้งละครพูด ละครเพลง การเต้น physical theatre หุ่น หนังเงา และละครใบ้ โดยงานต้องทำงานข้ามสาขากับศาสตร์อื่น เช่น ทัศนศิลป์ วรรณกรรม ดนตรี หรือภาพยนตร์ สมัครได้ทั้งศิลปินเดี่ยวและกลุ่ม ผู้สร้างงานหลักหรือนักแสดงหลักต้องทำงานด้านศิลปะการแสดงมาแล้วอย่างน้อย 4 ปี และต้องเป็นงานใหม่ที่ยังไม่เคยแสดงต่อสาธารณะ ส่งได้คนละหรือกลุ่มละ 1 ข้อเสนอ

โครงการที่ได้รับคัดเลือกจะได้ทุนผลิตงาน 70,000 บาท ใช้ Studio ชั้น 4 ของ BACC ราว 25 วัน ตั้งแต่เข้าโรง ซ้อม แสดง จนรื้อถอน พร้อมการช่วยด้านแสง เสียง และโปรเจกเตอร์บางส่วน การประชาสัมพันธ์ และภาพถ่ายการแสดง ส่วนผู้ได้รับคัดเลือกต้องแสดงอย่างน้อย 4 รอบ จัดทอล์กหลังการแสดงหรือกิจกรรมเสริม 1–2 ครั้ง มีบัตรราคาพิเศษสำหรับนักเรียนนักศึกษา ผู้สูงอายุ และผู้พิการ และส่งรายงานสรุปโครงการหลังจบการแสดง

เปิดรับสมัคร 1 ต.ค. – 6 ธ.ค. 2569 สัมภาษณ์ออนไลน์ 19–20 ธ.ค. และประกาศผล 26 ธ.ค. 2569 ทาง BACC แจ้งผลทางอีเมล เว็บไซต์ และเพจ Facebook$d$
WHERE id = 'f6f2a350-9f68-43c6-a554-915aff5d8c4f';

UPDATE anthem.events SET updated_at = now(), description = $d$สำนักงานการวิจัยแห่งชาติ (วช.) ชวนออกแบบและตั้งชื่อมาสคอตประจำงาน “มหกรรมงานวิจัยแห่งชาติ 2570” (Thailand Research Expo 2027) ซึ่งจะจัดวันที่ 21–25 มิถุนายน 2570 ที่โรงแรมเซ็นทาราแกรนด์ เซ็นทรัลเวิลด์ กรุงเทพฯ

เปิดรับทั้งนักเรียน นิสิต นักศึกษา นักวิจัย และบุคคลทั่วไป ลงทะเบียนและส่งผลงานได้ตั้งแต่ 26 ต.ค. ถึง 30 พ.ย. 2569 ผ่านแบบฟอร์มในประกาศของผู้จัด จากนั้นคณะกรรมการพิจารณาวันที่ 25 ธ.ค. 2569 เปิดโหวตจากประชาชน 28 ธ.ค. 2569 – 15 ม.ค. 2570 และประกาศผล 22 ม.ค. 2570

รางวัลชนะเลิศ 1 รางวัล รับเงิน 25,000 บาท พร้อมถ้วยและเกียรติบัตร และรางวัลชมเชย 2 รางวัล รางวัลละ 10,000 บาท พร้อมเกียรติบัตร สอบถามเพิ่มเติมได้ที่กลุ่มงานส่งเสริมความร่วมมือและการเรียนรู้งานวิจัย วช.$d$
WHERE id = 'ab2eb664-3374-432b-9d98-a4086acfda58';

-- Rollback: re-run anthem.event_insights_clean from 20261106100000_event_insights.sql
-- (extra keys then get dropped the next time an event's insights are saved).
