-- Mock forum topics: 20 catalog users × 2–3 topics (platform discussion only)
-- Topic UUID namespace: 00000000-0000-0000-0005-0000000000xx
-- Reply UUID namespace: 00000000-0000-0000-0006-0000000000xx
-- Re-run safe: deletes previous mock in these namespaces first.

DO $$
DECLARE
  cat_help uuid;
  cat_bug uuid;
  cat_idea uuid;
  cat_feedback uuid;
BEGIN
  SELECT id INTO cat_help FROM anthem.forum_categories WHERE slug = 'help';
  SELECT id INTO cat_bug FROM anthem.forum_categories WHERE slug = 'bug';
  SELECT id INTO cat_idea FROM anthem.forum_categories WHERE slug = 'idea';
  SELECT id INTO cat_feedback FROM anthem.forum_categories WHERE slug = 'feedback';

  IF cat_help IS NULL OR cat_bug IS NULL OR cat_idea IS NULL OR cat_feedback IS NULL THEN
    RAISE EXCEPTION 'forum categories missing';
  END IF;

  DELETE FROM anthem.forum_replies
  WHERE id::text LIKE '00000000-0000-0000-0006-%'
     OR topic_id::text LIKE '00000000-0000-0000-0005-%';

  DELETE FROM anthem.forum_topic_likes
  WHERE topic_id::text LIKE '00000000-0000-0000-0005-%';

  DELETE FROM anthem.forum_topics
  WHERE id::text LIKE '00000000-0000-0000-0005-%';

  INSERT INTO anthem.forum_topics (
    id, category_id, author_id, title, body, status, tags,
    reply_count, like_count, view_count, last_activity_at,
    is_locked, is_pinned, moderation_state, created_at, updated_at
  )
  VALUES
  -- a000 phatsawut ×3
  ('00000000-0000-0000-0005-000000000001', cat_help, '00000000-0000-0000-0000-00000000a000',
   'อัปโหลดผลงานแล้ว แต่ยังไม่ขึ้นในฟีด',
   E'## คุณกำลังทำอะไรอยู่?\nอัปโหลดโปรเจกต์ใหม่จากหน้าพอร์ตโฟลิโอ\n\n## ลองทำอะไรไปแล้วบ้าง?\nรีเฟรช / ลอง Chrome และ Safari\n\n## อยากได้อะไรเป็นผลลัพธ์?\nอยากให้ขึ้นในฟีดโปรเจกต์หลังเผยแพร่ทันที',
   'open', ARRAY['upload','feed'], 0, 0, 12,
   now() - interval '2 hours', false, false, 'published', now() - interval '1 day', now() - interval '2 hours'),
  ('00000000-0000-0000-0005-000000000002', cat_idea, '00000000-0000-0000-0000-00000000a000',
   'อยากได้โหมดมืดที่จำตามอุปกรณ์อัตโนมัติชัดกว่านี้',
   E'## อยากได้อะไร?\nTheme ตามระบบ + override ในตั้งค่าให้ชัด\n\n## ทำไมถึงต้องการ?\nสลับเครื่องบ่อย บางทีธีมไม่ตรงกับที่คาด\n\n## workaround ตอนนี้\nตั้งมือทุกครั้ง',
   'planned', ARRAY['theme','ux'], 0, 0, 34,
   now() - interval '5 hours', false, false, 'published', now() - interval '3 days', now() - interval '5 hours'),
  ('00000000-0000-0000-0005-000000000003', cat_feedback, '00000000-0000-0000-0000-00000000a000',
   'หน้าโปรไฟล์อ่านง่ายขึ้นหลังอัปเดตล่าสุด',
   E'## หน้า / ฟีเจอร์ไหน?\nโปรไฟล์สาธารณะ\n\n## รู้สึกยังไง?\nชอบ hierarchy ใหม่\n\n## อยากให้เป็นยังไง?\nคงไว้ แล้วเพิ่มสรุปโอกาสด้านบน',
   'open', ARRAY['profile'], 0, 0, 21,
   now() - interval '8 hours', false, false, 'published', now() - interval '2 days', now() - interval '8 hours'),

  -- a001 napatsara ×3
  ('00000000-0000-0000-0005-000000000004', cat_bug, '00000000-0000-0000-0000-00000000a001',
   'กดบันทึกคอลเลกชันแล้วขึ้น error เป็นครั้งคราว',
   E'## ขั้นตอนทำซ้ำ\n1) เปิดผลงาน\n2) กดบันทึกลงคอลเลกชัน\n3) บางครั้งขึ้น toast error\n\n## ผลที่คาดหวัง\nบันทึกสำเร็จ\n\n## ผลที่เกิดขึ้นจริง\nบางครั้ง fail แล้วต้องกดซ้ำ\n\n## อุปกรณ์ / เบราว์เซอร์\nWindows + Chrome',
   'under_review', ARRAY['collections','bug'], 0, 0, 48,
   now() - interval '1 hour', false, false, 'published', now() - interval '4 days', now() - interval '1 hour'),
  ('00000000-0000-0000-0005-000000000005', cat_help, '00000000-0000-0000-0000-00000000a001',
   'วิธีใส่บริบทโปรเจกต์ให้ครบก่อนเผยแพร่',
   E'## คุณกำลังทำอะไรอยู่?\nอยากให้โปรเจกต์พร้อมสำหรับคุยโอกาส\n\n## ลองทำอะไรไปแล้วบ้าง?\nใส่คำอธิบายสั้น ๆ\n\n## อยากได้อะไรเป็นผลลัพธ์?\nเช็คลิสต์ฟิลด์ที่ควรมี (role / process / outcome)',
   'answered', ARRAY['project','context'], 0, 0, 67,
   now() - interval '30 minutes', false, false, 'published', now() - interval '5 days', now() - interval '30 minutes'),
  ('00000000-0000-0000-0005-000000000006', cat_idea, '00000000-0000-0000-0000-00000000a001',
   'อยากมีพรีวิวลิงก์ผลงานตอนแชร์ออกไปนอกเว็บ',
   E'## อยากได้อะไร?\nOG preview ที่สวยและมีชื่อผลงาน\n\n## ทำไมถึงต้องการ?\nแชร์ในโซเชียลแล้วคนเข้าใจทันที\n\n## workaround ตอนนี้\nแคปหน้าจอเอง',
   'open', ARRAY['share','seo'], 0, 0, 19,
   now() - interval '12 hours', false, false, 'published', now() - interval '6 days', now() - interval '12 hours'),

  -- a002 pimchanok ×2
  ('00000000-0000-0000-0005-000000000007', cat_feedback, '00000000-0000-0000-0000-00000000a002',
   'ฟีดโปรเจกต์บนมือถือเลื่อนลื่นดี แต่ปุ่มบันทึกเล็กไป',
   E'## หน้า / ฟีเจอร์ไหน?\nฟีดหลักมือถือ\n\n## รู้สึกยังไง?\nเลื่อนดี แต่กดบันทึกยาก\n\n## อยากให้เป็นยังไง?\nปุ่มใหญ่ขึ้นนิดหน่อย',
   'open', ARRAY['mobile','feed'], 0, 0, 28,
   now() - interval '3 hours', false, false, 'published', now() - interval '1 day', now() - interval '3 hours'),
  ('00000000-0000-0000-0005-000000000008', cat_help, '00000000-0000-0000-0000-00000000a002',
   'ตั้ง username แล้วเปลี่ยนได้เมื่อไหร่',
   E'## คุณกำลังทำอะไรอยู่?\nเพิ่งตั้ง username\n\n## ลองทำอะไรไปแล้วบ้าง?\nอ่านหน้าตั้งค่า\n\n## อยากได้อะไรเป็นผลลัพธ์?\nอยากรู้ cooldown และเงื่อนไข',
   'answered', ARRAY['username','settings'], 0, 0, 41,
   now() - interval '6 hours', false, false, 'published', now() - interval '2 days', now() - interval '6 hours'),

  -- a003 wannakorn ×3
  ('00000000-0000-0000-0005-000000000009', cat_bug, '00000000-0000-0000-0000-00000000a003',
   'แจ้งเตือนค้างเป็นตัวเลขเก่าหลังอ่านแล้ว',
   E'## ขั้นตอนทำซ้ำ\n1) เปิดแจ้งเตือน\n2) อ่านทั้งหมด\n3) badge ยังไม่เป็น 0\n\n## ผลที่คาดหวัง\nbadge เคลียร์\n\n## ผลที่เกิดขึ้นจริง\nตัวเลขค้าง\n\n## อุปกรณ์ / เบราว์เซอร์\niPhone Safari',
   'in_progress', ARRAY['notifications'], 0, 0, 55,
   now() - interval '40 minutes', false, false, 'published', now() - interval '3 days', now() - interval '40 minutes'),
  ('00000000-0000-0000-0005-00000000000a', cat_idea, '00000000-0000-0000-0000-00000000a003',
   'อยากกรองฟีดตามสไตล์งาน (illustration / branding)',
   E'## อยากได้อะไร?\nฟิลเตอร์สไตล์บนฟีด\n\n## ทำไมถึงต้องการ?\nหาแรงบันดาลใจเร็วขึ้น\n\n## workaround ตอนนี้\nเลื่อนหาเอง',
   'under_review', ARRAY['feed','filter'], 0, 0, 73,
   now() - interval '9 hours', false, false, 'published', now() - interval '7 days', now() - interval '9 hours'),
  ('00000000-0000-0000-0005-00000000000b', cat_feedback, '00000000-0000-0000-0000-00000000a003',
   'ชุดผลงาน (series) ช่วยจัดพอร์ตได้ดีมาก',
   E'## หน้า / ฟีเจอร์ไหน?\nSeries\n\n## รู้สึกยังไง?\nชอบ\n\n## อยากให้เป็นยังไง?\nเพิ่ม cover ของ series ให้เลือกเองได้',
   'open', ARRAY['series'], 0, 0, 16,
   now() - interval '14 hours', false, false, 'published', now() - interval '4 days', now() - interval '14 hours'),

  -- a004 thanya ×2
  ('00000000-0000-0000-0005-00000000000c', cat_help, '00000000-0000-0000-0000-00000000a004',
   'จะผูกผลงานกับโพสต์ชุมชนยังไง',
   E'## คุณกำลังทำอะไรอยู่?\nอยากลิงก์โปรเจกต์เข้าโพสต์\n\n## ลองทำอะไรไปแล้วบ้าง?\nหาใน editor\n\n## อยากได้อะไรเป็นผลลัพธ์?\nขั้นตอนสั้น ๆ ภาษาไทย',
   'open', ARRAY['community','project'], 0, 0, 22,
   now() - interval '4 hours', false, false, 'published', now() - interval '1 day', now() - interval '4 hours'),
  ('00000000-0000-0000-0005-00000000000d', cat_bug, '00000000-0000-0000-0000-00000000a004',
   'ครอปรูปปกแล้วสัดส่วนเพี้ยนบนเดสก์ท็อป',
   E'## ขั้นตอนทำซ้ำ\n1) อัปโหลดปก\n2) ครอป\n3) บันทึก\n\n## ผลที่คาดหวัง\nสัดส่วนตรงกับพรีวิว\n\n## ผลที่เกิดขึ้นจริง\nขอบถูกตัดเพิ่มบนเดสก์ท็อป\n\n## อุปกรณ์ / เบราว์เซอร์\nmacOS + Chrome',
   'open', ARRAY['cover','crop'], 0, 0, 31,
   now() - interval '7 hours', false, false, 'published', now() - interval '2 days', now() - interval '7 hours'),

  -- a005 chatchai ×3
  ('00000000-0000-0000-0005-00000000000e', cat_idea, '00000000-0000-0000-0000-00000000a005',
   'อยากเห็นสถานะ “เปิดรับคุยจากผลงานนี้” ชัดบนการ์ดโปรเจกต์',
   E'## อยากได้อะไร?\nbadge โอกาสบนการ์ดฟีด\n\n## ทำไมถึงต้องการ?\nรู้ทันทีว่าครีเอเตอร์รับคุย\n\n## workaround ตอนนี้\nต้องเข้าโปรเจกต์ก่อน',
   'planned', ARRAY['opportunity','feed'], 0, 0, 88,
   now() - interval '2 hours', false, false, 'published', now() - interval '8 days', now() - interval '2 hours'),
  ('00000000-0000-0000-0005-00000000000f', cat_feedback, '00000000-0000-0000-0000-00000000a005',
   'แชทจากผลงานมีบริบทดี แต่หัวข้อห้องยาวเกิน',
   E'## หน้า / ฟีเจอร์ไหน?\nแชท\n\n## รู้สึกยังไง?\nบริบทดี แต่ชื่อห้องล้น\n\n## อยากให้เป็นยังไง?\nตัดชื่อผลงานสั้นลงในหัวข้อ',
   'open', ARRAY['chat'], 0, 0, 26,
   now() - interval '11 hours', false, false, 'published', now() - interval '3 days', now() - interval '11 hours'),
  ('00000000-0000-0000-0005-000000000010', cat_help, '00000000-0000-0000-0000-00000000a005',
   'PX ที่ได้ตอน onboarding ถอนได้ไหม',
   E'## คุณกำลังทำอะไรอยู่?\nเพิ่งสมัครและได้ welcome PX\n\n## ลองทำอะไรไปแล้วบ้าง?\nเปิดหน้ากระเป๋า\n\n## อยากได้อะไรเป็นผลลัพธ์?\nอยากเข้าใจว่าอันไหนถอนได้ / ไม่ได้',
   'answered', ARRAY['px','onboarding'], 0, 0, 95,
   now() - interval '20 minutes', false, false, 'published', now() - interval '5 days', now() - interval '20 minutes'),

  -- a006 atittaya ×2
  ('00000000-0000-0000-0005-000000000011', cat_bug, '00000000-0000-0000-0000-00000000a006',
   'ค้นหาดีไซเนอร์แล้วผลลัพธ์กระโดดตอนเลื่อน',
   E'## ขั้นตอนทำซ้ำ\n1) เปิดโหมด designers\n2) เลื่อนลง\n3) รายการกระโดด\n\n## ผลที่คาดหวัง\nเลื่อนต่อเนื่อง\n\n## ผลที่เกิดขึ้นจริง\nกระโดดกลับบน\n\n## อุปกรณ์ / เบราว์เซอร์\nAndroid Chrome',
   'under_review', ARRAY['designers','scroll'], 0, 0, 37,
   now() - interval '90 minutes', false, false, 'published', now() - interval '2 days', now() - interval '90 minutes'),
  ('00000000-0000-0000-0005-000000000012', cat_idea, '00000000-0000-0000-0000-00000000a006',
   'อยากมีตัวอย่างโปรเจกต์ที่เขียนบริบทดี เพื่อเลียนแบบ',
   E'## อยากได้อะไร?\nแกลเลอรีตัวอย่าง “โปรเจกต์คุณภาพ”\n\n## ทำไมถึงต้องการ?\nมือใหม่ไม่รู้จะเขียน role/process ยังไง\n\n## workaround ตอนนี้\nดูจากคนอื่นทีละคน',
   'open', ARRAY['onboarding','examples'], 0, 0, 44,
   now() - interval '15 hours', false, false, 'published', now() - interval '6 days', now() - interval '15 hours'),

  -- a007 ploypailin ×3
  ('00000000-0000-0000-0005-000000000013', cat_feedback, '00000000-0000-0000-0000-00000000a007',
   'Inspire board ใช้ง่าย แต่อยากจัดเรียงรูปได้',
   E'## หน้า / ฟีเจอร์ไหน?\nMy Inspire\n\n## รู้สึกยังไง?\nชอบแนวคิด\n\n## อยากให้เป็นยังไง?\ndrag จัดลำดับรูปได้',
   'planned', ARRAY['inspire'], 0, 0, 52,
   now() - interval '5 hours', false, false, 'published', now() - interval '4 days', now() - interval '5 hours'),
  ('00000000-0000-0000-0005-000000000014', cat_help, '00000000-0000-0000-0000-00000000a007',
   'วิธีปิดรับข้อความจากคนแปลกหน้า',
   E'## คุณกำลังทำอะไรอยู่?\nอยากคุมใครทักได้\n\n## ลองทำอะไรไปแล้วบ้าง?\nหาในตั้งค่าความเป็นส่วนตัว\n\n## อยากได้อะไรเป็นผลลัพธ์?\nตัวเลือกชัด ๆ',
   'open', ARRAY['privacy','chat'], 0, 0, 18,
   now() - interval '10 hours', false, false, 'published', now() - interval '1 day', now() - interval '10 hours'),
  ('00000000-0000-0000-0005-000000000015', cat_bug, '00000000-0000-0000-0000-00000000a007',
   'อัปโหลดวิดีโอในผลงานแล้วพรีวิวดำ',
   E'## ขั้นตอนทำซ้ำ\n1) ใส่ video url / อัปโหลด\n2) บันทึก\n3) เปิดดู\n\n## ผลที่คาดหวัง\nเล่นวิดีโอได้\n\n## ผลที่เกิดขึ้นจริง\nจอดำ\n\n## อุปกรณ์ / เบราว์เซอร์\niPad Safari',
   'open', ARRAY['video'], 0, 0, 29,
   now() - interval '16 hours', false, false, 'published', now() - interval '3 days', now() - interval '16 hours'),

  -- a008 thanakorn ×2
  ('00000000-0000-0000-0005-000000000016', cat_idea, '00000000-0000-0000-0000-00000000a008',
   'อยากให้ฟอรัมแจ้งเตือนเมื่อมีคนตอบกระทู้ของฉัน',
   E'## อยากได้อะไร?\nnotification เมื่อมี reply\n\n## ทำไมถึงต้องการ?\nไม่พลาดคำตอบ\n\n## workaround ตอนนี้\nเข้ามาเช็คเอง',
   'in_progress', ARRAY['forum','notification'], 0, 0, 61,
   now() - interval '50 minutes', false, false, 'published', now() - interval '2 days', now() - interval '50 minutes'),
  ('00000000-0000-0000-0005-000000000017', cat_feedback, '00000000-0000-0000-0000-00000000a008',
   'หมวดกระทู้สีแยกชัด อ่านง่าย',
   E'## หน้า / ฟีเจอร์ไหน?\nฟอรัม\n\n## รู้สึกยังไง?\nชอบสีหมวด\n\n## อยากให้เป็นยังไง?\nคงไว้',
   'open', ARRAY['forum','ux'], 0, 0, 14,
   now() - interval '18 hours', false, false, 'published', now() - interval '5 days', now() - interval '18 hours'),

  -- a009 anucha ×3
  ('00000000-0000-0000-0005-000000000018', cat_help, '00000000-0000-0000-0000-00000000a009',
   'จะรายงานเนื้อหาไม่เหมาะสมในฟอรัมที่ไหน',
   E'## คุณกำลังทำอะไรอยู่?\nเจอโพสต์ที่ดูเหมือนสแปม\n\n## ลองทำอะไรไปแล้วบ้าง?\nหาปุ่มรายงาน\n\n## อยากได้อะไรเป็นผลลัพธ์?\nยืนยันว่ากดที่ไหนและติดตามสถานะได้',
   'answered', ARRAY['report','safety'], 0, 0, 33,
   now() - interval '3 hours', false, false, 'published', now() - interval '4 days', now() - interval '3 hours'),
  ('00000000-0000-0000-0005-000000000019', cat_bug, '00000000-0000-0000-0000-00000000a009',
   'ล็อกอินด้วย Google แล้วกลับมาหน้าเดิมไม่ได้บางครั้ง',
   E'## ขั้นตอนทำซ้ำ\n1) กด action ที่ต้องล็อกอิน\n2) Google login\n3) บางครั้งกลับหน้าแรกแทนหน้าที่ตั้งใจ\n\n## ผลที่คาดหวัง\nกลับไป action เดิม\n\n## ผลที่เกิดขึ้นจริง\nหลุดไปหน้าแรก\n\n## อุปกรณ์ / เบราว์เซอร์\nWindows Edge',
   'under_review', ARRAY['auth'], 0, 0, 47,
   now() - interval '70 minutes', false, false, 'published', now() - interval '6 days', now() - interval '70 minutes'),
  ('00000000-0000-0000-0005-00000000001a', cat_idea, '00000000-0000-0000-0000-00000000a009',
   'อยากมีแท็กแนะนำตอนสร้างกระทู้',
   E'## อยากได้อะไร?\nsuggested tags ตามหมวด\n\n## ทำไมถึงต้องการ?\nค้นหาทีหลังง่าย\n\n## workaround ตอนนี้\nพิมพ์เอง',
   'open', ARRAY['forum','tags'], 0, 0, 20,
   now() - interval '13 hours', false, false, 'published', now() - interval '1 day', now() - interval '13 hours'),

  -- a00a parichat ×2
  ('00000000-0000-0000-0005-00000000001b', cat_feedback, '00000000-0000-0000-0000-00000000a00a',
   'หน้า designers โหลดเร็วขึ้นจากเดิมอีก',
   E'## หน้า / ฟีเจอร์ไหน?\nโหมด designers\n\n## รู้สึกยังไง?\nเร็วขึ้น\n\n## อยากให้เป็นยังไง?\nเพิ่มตัวกรองเมือง/สกิล',
   'open', ARRAY['performance','designers'], 0, 0, 25,
   now() - interval '6 hours', false, false, 'published', now() - interval '3 days', now() - interval '6 hours'),
  ('00000000-0000-0000-0005-00000000001c', cat_help, '00000000-0000-0000-0000-00000000a00a',
   'จะลบผลงานร่างที่ไม่ได้ใช้ยังไง',
   E'## คุณกำลังทำอะไรอยู่?\nมี draft ค้างหลายอัน\n\n## ลองทำอะไรไปแล้วบ้าง?\nเปิด manage portfolio\n\n## อยากได้อะไรเป็นผลลัพธ์?\nลบ draft ได้ชัดเจน',
   'open', ARRAY['draft','portfolio'], 0, 0, 17,
   now() - interval '9 hours', false, false, 'published', now() - interval '2 days', now() - interval '9 hours'),

  -- a00b jessada ×3
  ('00000000-0000-0000-0005-00000000001d', cat_bug, '00000000-0000-0000-0000-00000000a00b',
   'แชร์ลิงก์โปรไฟล์ /@username แล้วเจอ 404 บางครั้ง',
   E'## ขั้นตอนทำซ้ำ\n1) คัดลอกลิงก์ vanity\n2) เปิด incognito\n3) เป็นครั้งคราว 404\n\n## ผลที่คาดหวัง\nเปิดโปรไฟล์ได้เสมอ\n\n## ผลที่เกิดขึ้นจริง\n404 เป็นพัก ๆ\n\n## อุปกรณ์ / เบราว์เซอร์\nChrome mobile',
   'open', ARRAY['profile','vanity'], 0, 0, 39,
   now() - interval '2 hours', false, false, 'published', now() - interval '5 days', now() - interval '2 hours'),
  ('00000000-0000-0000-0005-00000000001e', cat_idea, '00000000-0000-0000-0000-00000000a00b',
   'อยากมีสรุปกิจกรรมสัปดาห์ในโปรไฟล์ชุมชนฟอรัม',
   E'## อยากได้อะไร?\nสถิติกระทู้/คำตอบของฉันรายสัปดาห์\n\n## ทำไมถึงต้องการ?\nรู้ว่าช่วยชุมชนไปแค่ไหน\n\n## workaround ตอนนี้\nนับมือ',
   'open', ARRAY['forum','stats'], 0, 0, 23,
   now() - interval '17 hours', false, false, 'published', now() - interval '4 days', now() - interval '17 hours'),
  ('00000000-0000-0000-0005-00000000001f', cat_feedback, '00000000-0000-0000-0000-00000000a00b',
   'ปุ่ม “คุยต่อจากผลงานนี้” ชัดและเข้าใจง่าย',
   E'## หน้า / ฟีเจอร์ไหน?\nหน้ารายละเอียดผลงาน\n\n## รู้สึกยังไง?\nCTA ดี\n\n## อยากให้เป็นยังไง?\nโชว์จำนวนคนที่คุยจากผลงานนี้ด้วยก็ดี',
   'open', ARRAY['opportunity','cta'], 0, 0, 58,
   now() - interval '8 hours', false, false, 'published', now() - interval '7 days', now() - interval '8 hours'),

  -- a00c supatra ×2
  ('00000000-0000-0000-0005-000000000020', cat_help, '00000000-0000-0000-0000-00000000a00c',
   'ขนาดไฟล์ภาพที่แนะนำสำหรับปกผลงาน',
   E'## คุณกำลังทำอะไรอยู่?\nเตรียมปก\n\n## ลองทำอะไรไปแล้วบ้าง?\nอัปโหลดแล้วถูกบีบ\n\n## อยากได้อะไรเป็นผลลัพธ์?\nสเปกความละเอียด / สัดส่วนที่แนะนำ',
   'answered', ARRAY['cover','specs'], 0, 0, 42,
   now() - interval '4 hours', false, false, 'published', now() - interval '3 days', now() - interval '4 hours'),
  ('00000000-0000-0000-0005-000000000021', cat_bug, '00000000-0000-0000-0000-00000000a00c',
   'motion preview ใน editor กระตุกบนเครื่องสเปกกลาง',
   E'## ขั้นตอนทำซ้ำ\n1) เปิด editor\n2) ใส่หลายเฟรม\n3) scrub timeline\n\n## ผลที่คาดหวัง\nลื่นพอใช้\n\n## ผลที่เกิดขึ้นจริง\nกระตุกแรง\n\n## อุปกรณ์ / เบราว์เซอร์\nWindows mid-range + Chrome',
   'open', ARRAY['editor','performance'], 0, 0, 27,
   now() - interval '11 hours', false, false, 'published', now() - interval '2 days', now() - interval '11 hours'),

  -- a00d wathanyu ×3
  ('00000000-0000-0000-0005-000000000022', cat_idea, '00000000-0000-0000-0000-00000000a00d',
   'อยากแนบเสียงสั้น ๆ ในผลงานได้',
   E'## อยากได้อะไร?\nแนบ audio clip สั้นในโปรเจกต์\n\n## ทำไมถึงต้องการ?\nโชว์งานเสียงประกอบ\n\n## workaround ตอนนี้\nลิงก์ภายนอก',
   'under_review', ARRAY['audio','project'], 0, 0, 36,
   now() - interval '7 hours', false, false, 'published', now() - interval '6 days', now() - interval '7 hours'),
  ('00000000-0000-0000-0005-000000000023', cat_feedback, '00000000-0000-0000-0000-00000000a00d',
   'ฟอรัมเงียบเกินไป อยากเห็นประกาศจากทีมบ่อยขึ้น',
   E'## หน้า / ฟีเจอร์ไหน?\nประกาศจากทีม\n\n## รู้สึกยังไง?\nอยากรู้ roadmap\n\n## อยากให้เป็นยังไง?\nอัปเดตรายสัปดาห์สั้น ๆ',
   'open', ARRAY['forum','roadmap'], 0, 0, 49,
   now() - interval '1 hour', false, false, 'published', now() - interval '1 day', now() - interval '1 hour'),
  ('00000000-0000-0000-0005-000000000024', cat_help, '00000000-0000-0000-0000-00000000a00d',
   'จะติดตามครีเอเตอร์หลายคนแล้วดูเฉพาะฟีดที่ติดตามได้ไหม',
   E'## คุณกำลังทำอะไรอยู่?\nติดตามหลายคน\n\n## ลองทำอะไรไปแล้วบ้าง?\nหาแท็บ following\n\n## อยากได้อะไรเป็นผลลัพธ์?\nโหมดฟีดเฉพาะคนที่ติดตาม',
   'open', ARRAY['follow','feed'], 0, 0, 30,
   now() - interval '14 hours', false, false, 'published', now() - interval '4 days', now() - interval '14 hours'),

  -- a00e kritsana ×2
  ('00000000-0000-0000-0005-000000000025', cat_bug, '00000000-0000-0000-0000-00000000a00e',
   'อัปโหลดไฟล์แนบในฟอรัมแล้วสถานะค้าง pending',
   E'## ขั้นตอนทำซ้ำ\n1) สร้างกระทู้\n2) แนบรูป\n3) เผยแพร่\n\n## ผลที่คาดหวัง\nสแกนเสร็จแล้วโชว์รูป\n\n## ผลที่เกิดขึ้นจริง\nค้าง pending นาน\n\n## อุปกรณ์ / เบราว์เซอร์\nmacOS Safari',
   'in_progress', ARRAY['forum','attachment'], 0, 0, 35,
   now() - interval '55 minutes', false, false, 'published', now() - interval '2 days', now() - interval '55 minutes'),
  ('00000000-0000-0000-0005-000000000026', cat_idea, '00000000-0000-0000-0000-00000000a00e',
   'อยากค้นหาในฟอรัมแบบกรองตามสถานะ (ตอบแล้ว / กำลังทำ)',
   E'## อยากได้อะไร?\nฟิลเตอร์สถานะในหน้าค้นหา\n\n## ทำไมถึงต้องการ?\nหาบั๊กที่ยังไม่จบเร็วขึ้น\n\n## workaround ตอนนี้\nเลื่อนดูเอง',
   'open', ARRAY['forum','search'], 0, 0, 24,
   now() - interval '19 hours', false, false, 'published', now() - interval '5 days', now() - interval '19 hours'),

  -- a00f siriporn ×3
  ('00000000-0000-0000-0005-000000000027', cat_feedback, '00000000-0000-0000-0000-00000000a00f',
   'หน้าตั้งค่าโปรไฟล์ฟิลด์เยอะ แต่จัดกลุ่มดี',
   E'## หน้า / ฟีเจอร์ไหน?\nSettings / โปรไฟล์\n\n## รู้สึกยังไง?\nโอเค\n\n## อยากให้เป็นยังไง?\nมี autosave ชัดขึ้น',
   'open', ARRAY['settings'], 0, 0, 15,
   now() - interval '12 hours', false, false, 'published', now() - interval '3 days', now() - interval '12 hours'),
  ('00000000-0000-0000-0005-000000000028', cat_help, '00000000-0000-0000-0000-00000000a00f',
   'ความต่างระหว่างบันทึกผลงานกับคอลเลกชัน',
   E'## คุณกำลังทำอะไรอยู่?\nอยากจัดเก็บงานที่ชอบ\n\n## ลองทำอะไรไปแล้วบ้าง?\nกดทั้งสองแบบ\n\n## อยากได้อะไรเป็นผลลัพธ์?\nอธิบายสั้น ๆ ว่าใช้เมื่อไหร่',
   'answered', ARRAY['collections','save'], 0, 0, 64,
   now() - interval '25 minutes', false, false, 'published', now() - interval '6 days', now() - interval '25 minutes'),
  ('00000000-0000-0000-0005-000000000029', cat_bug, '00000000-0000-0000-0000-00000000a00f',
   'ธีมระบบบนมือถือสลับกลางคืนแล้ว UI บางจุดยังสว่าง',
   E'## ขั้นตอนทำซ้ำ\n1) ตั้ง theme = system\n2) สลับโหมดมืดของเครื่อง\n3) เปิดฟอรัม\n\n## ผลที่คาดหวัง\nมืดทั้งหน้า\n\n## ผลที่เกิดขึ้นจริง\nบางการ์ดยังพื้นสว่าง\n\n## อุปกรณ์ / เบราว์เซอร์\niOS Safari',
   'open', ARRAY['theme','mobile'], 0, 0, 28,
   now() - interval '8 hours', false, false, 'published', now() - interval '1 day', now() - interval '8 hours'),

  -- a010 kittipong ×2
  ('00000000-0000-0000-0005-00000000002a', cat_idea, '00000000-0000-0000-0000-00000000a010',
   'อยากได้ API/embed เล็ก ๆ สำหรับโชว์ผลงานบนเว็บตัวเอง',
   E'## อยากได้อะไร?\nembed card ผลงาน\n\n## ทำไมถึงต้องการ?\nลิงก์กลับมา Aplus1 จากพอร์ตส่วนตัว\n\n## workaround ตอนนี้\nใส่ลิงก์ธรรมดา',
   'open', ARRAY['embed','share'], 0, 0, 40,
   now() - interval '10 hours', false, false, 'published', now() - interval '8 days', now() - interval '10 hours'),
  ('00000000-0000-0000-0005-00000000002b', cat_feedback, '00000000-0000-0000-0000-00000000a010',
   'กฎห้ามหางานในฟอรัมช่วยโฟกัสพัฒนาแพลตฟอร์มได้ดี',
   E'## หน้า / ฟีเจอร์ไหน?\nฟอรัม\n\n## รู้สึกยังไง?\nเห็นด้วย\n\n## อยากให้เป็นยังไง?\nเตือนตอนโพสต์ชัดแบบนี้ต่อไป',
   'open', ARRAY['forum','guidelines'], 0, 0, 22,
   now() - interval '3 hours', false, false, 'published', now() - interval '2 days', now() - interval '3 hours'),

  -- a011 manatsanan ×3
  ('00000000-0000-0000-0005-00000000002c', cat_help, '00000000-0000-0000-0000-00000000a011',
   'จะเพิ่มสมาชิกสตูดิโอยังไง',
   E'## คุณกำลังทำอะไรอยู่?\nตั้งสตูดิโอ\n\n## ลองทำอะไรไปแล้วบ้าง?\nหาเมนู invite\n\n## อยากได้อะไรเป็นผลลัพธ์?\nขั้นตอนชวนสมาชิก',
   'open', ARRAY['studio'], 0, 0, 19,
   now() - interval '6 hours', false, false, 'published', now() - interval '4 days', now() - interval '6 hours'),
  ('00000000-0000-0000-0005-00000000002d', cat_bug, '00000000-0000-0000-0000-00000000a011',
   'บันทึก inspire item ซ้ำแล้วขึ้น error ไม่เป็นมิตร',
   E'## ขั้นตอนทำซ้ำ\n1) บันทึกรูปเดิมซ้ำ\n2) ดูข้อความ error\n\n## ผลที่คาดหวัง\nบอกว่ามีอยู่แล้ว\n\n## ผลที่เกิดขึ้นจริง\nข้อความ technical\n\n## อุปกรณ์ / เบราว์เซอร์\nChrome desktop',
   'planned', ARRAY['inspire','copy'], 0, 0, 21,
   now() - interval '15 hours', false, false, 'published', now() - interval '3 days', now() - interval '15 hours'),
  ('00000000-0000-0000-0005-00000000002e', cat_idea, '00000000-0000-0000-0000-00000000a011',
   'อยากโหวตไอเดียในฟอรัมแบบเบา ๆ ไม่ใช่แค่หัวใจ',
   E'## อยากได้อะไร?\nreaction หรือโหวต “อยากได้”\n\n## ทำไมถึงต้องการ?\nทีมเห็นความต้องการชัดขึ้น\n\n## workaround ตอนนี้\nคอมเมนต์ว่า +1',
   'open', ARRAY['forum','vote'], 0, 0, 46,
   now() - interval '45 minutes', false, false, 'published', now() - interval '5 days', now() - interval '45 minutes'),

  -- a012 nattawut ×2
  ('00000000-0000-0000-0005-00000000002f', cat_feedback, '00000000-0000-0000-0000-00000000a012',
   'การแสดงภาพในกระทู้แบบเต็มกว้างอ่านง่ายขึ้นเยอะ',
   E'## หน้า / ฟีเจอร์ไหน?\nหน้ารายละเอียดกระทู้\n\n## รู้สึกยังไง?\nชอบ\n\n## อยากให้เป็นยังไง?\nพรีวิวหลายรูปในรายการก็โอเคแบบนี้',
   'open', ARRAY['forum','images'], 0, 0, 18,
   now() - interval '2 hours', false, false, 'published', now() - interval '1 day', now() - interval '2 hours'),
  ('00000000-0000-0000-0005-000000000030', cat_help, '00000000-0000-0000-0000-00000000a012',
   'สิทธิ์รูปภาพและลิขสิทธิ์ตอนอัปโหลดผลงาน',
   E'## คุณกำลังทำอะไรอยู่?\nอัปโหลดงานลูกค้า\n\n## ลองทำอะไรไปแล้วบ้าง?\nอ่าน /legal/ip คร่าว ๆ\n\n## อยากได้อะไรเป็นผลลัพธ์?\nสรุปสั้น ๆ ว่าควรติ๊กอะไรก่อนเผยแพร่',
   'open', ARRAY['legal','ip'], 0, 0, 32,
   now() - interval '9 hours', false, false, 'published', now() - interval '7 days', now() - interval '9 hours'),

  -- a013 phattranit ×3
  ('00000000-0000-0000-0005-000000000031', cat_bug, '00000000-0000-0000-0000-00000000a013',
   'ค้นหากระทู้ภาษาไทยบางคำไม่เจอทั้งที่มีโพสต์',
   E'## ขั้นตอนทำซ้ำ\n1) ค้นคำว่า “แจ้งเตือน”\n2) มีกระทู้ที่ใช้คำนี้\n3) ผลว่าง\n\n## ผลที่คาดหวัง\nเจอ\n\n## ผลที่เกิดขึ้นจริง\nว่าง\n\n## อุปกรณ์ / เบราว์เซอร์\nChrome',
   'under_review', ARRAY['forum','search','thai'], 0, 0, 38,
   now() - interval '35 minutes', false, false, 'published', now() - interval '2 days', now() - interval '35 minutes'),
  ('00000000-0000-0000-0005-000000000032', cat_idea, '00000000-0000-0000-0000-00000000a013',
   'อยากแก้กระทู้ของตัวเองหลังโพสต์ได้',
   E'## อยากได้อะไร?\nปุ่มแก้ไขกระทู้/ความเห็น\n\n## ทำไมถึงต้องการ?\nพิมพ์ผิดบ่อย\n\n## workaround ตอนนี้\nโพสต์ใหม่ / คอมเมนต์แก้',
   'planned', ARRAY['forum','edit'], 0, 0, 71,
   now() - interval '80 minutes', false, false, 'published', now() - interval '4 days', now() - interval '80 minutes'),
  ('00000000-0000-0000-0005-000000000033', cat_feedback, '00000000-0000-0000-0000-00000000a013',
   'โปรไฟล์ชุมชนของฉันช่วยมอนิเตอร์กระทู้ได้ดี',
   E'## หน้า / ฟีเจอร์ไหน?\n/forum/me\n\n## รู้สึกยังไง?\nมีประโยชน์\n\n## อยากให้เป็นยังไง?\nเพิ่มแท็บ “ที่ฉันตอบ” ด้วย',
   'open', ARRAY['forum','me'], 0, 0, 16,
   now() - interval '5 hours', false, false, 'published', now() - interval '3 days', now() - interval '5 hours');

  -- Replies (cross-user) to make the board feel alive
  INSERT INTO anthem.forum_replies (id, topic_id, author_id, body, parent_id, is_accepted, created_at, updated_at)
  VALUES
  ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0005-000000000005', '00000000-0000-0000-0000-00000000a001',
   'แนะนำใส่ role / process / outcome ให้ครบ จะคุยโอกาสง่ายขึ้นมาก', NULL, true, now() - interval '4 days', now() - interval '4 days'),
  ('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0005-000000000005', '00000000-0000-0000-0000-00000000a000',
   'ขอบคุณครับ กำลังลองตามนี้', '00000000-0000-0000-0006-000000000001', false, now() - interval '3 days', now() - interval '3 days'),
  ('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0005-000000000010', '00000000-0000-0000-0000-00000000a005',
   'Welcome PX ถอนไม่ได้ — earned PX ถึงจะถอนได้เมื่อครบเงื่อนไข', NULL, true, now() - interval '4 days', now() - interval '4 days'),
  ('00000000-0000-0000-0006-000000000004', '00000000-0000-0000-0005-000000000008', '00000000-0000-0000-0000-00000000a002',
   'ตอนนี้ cooldown ประมาณ 60 วัน ดูรายละเอียดในตั้งค่าได้', NULL, true, now() - interval '1 day', now() - interval '1 day'),
  ('00000000-0000-0000-0006-000000000005', '00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0000-00000000a010',
   'เจอเหมือนกันบน Chrome — กดซ้ำครั้งที่สองมักผ่าน', NULL, false, now() - interval '2 days', now() - interval '2 days'),
  ('00000000-0000-0000-0006-000000000006', '00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0000-00000000a001',
   'ทีมรับเรื่องแล้ว กำลังไล่ log ฝั่ง collections', NULL, false, now() - interval '1 hour', now() - interval '1 hour'),
  ('00000000-0000-0000-0006-000000000007', '00000000-0000-0000-0005-00000000000e', '00000000-0000-0000-0000-00000000a012',
   'เห็นด้วย badge บนการ์ดจะช่วยคนจ้างเยอะ', NULL, false, now() - interval '1 day', now() - interval '1 day'),
  ('00000000-0000-0000-0006-000000000008', '00000000-0000-0000-0005-000000000016', '00000000-0000-0000-0000-00000000a008',
   'อันนี้ควรเป็น P0 ของฟอรัมเลย', NULL, false, now() - interval '1 day', now() - interval '1 day'),
  ('00000000-0000-0000-0006-000000000009', '00000000-0000-0000-0005-000000000018', '00000000-0000-0000-0000-00000000a009',
   'มีปุ่มรายงานใต้กระทู้และใต้ความเห็น — แล้วไปดูได้ที่รายงานของฉัน', NULL, true, now() - interval '3 days', now() - interval '3 days'),
  ('00000000-0000-0000-0006-00000000000a', '00000000-0000-0000-0005-000000000020', '00000000-0000-0000-0000-00000000a00c',
   'แนะนำอย่างน้อย 1600px ด้านสั้น สัดส่วนใกล้ 4:3 หรือ 16:9 ตาม layout', NULL, true, now() - interval '2 days', now() - interval '2 days'),
  ('00000000-0000-0000-0006-00000000000b', '00000000-0000-0000-0005-000000000028', '00000000-0000-0000-0000-00000000a00f',
   'บันทึก = quick save ส่วนตัว, คอลเลกชัน = จัดกลุ่มและแชร์ได้', NULL, true, now() - interval '5 days', now() - interval '5 days'),
  ('00000000-0000-0000-0006-00000000000c', '00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-00000000a003',
   'ลองเช็คว่าสถานะเป็น Published จริงไหม บางทีค้าง Draft', NULL, false, now() - interval '20 hours', now() - interval '20 hours'),
  ('00000000-0000-0000-0006-00000000000d', '00000000-0000-0000-0005-000000000009', '00000000-0000-0000-0000-00000000a006',
   'เจอบน iOS เหมือนกัน รีเฟรชแอปแล้ว badge หายชั่วคราว', NULL, false, now() - interval '2 days', now() - interval '2 days'),
  ('00000000-0000-0000-0006-00000000000e', '00000000-0000-0000-0005-000000000032', '00000000-0000-0000-0000-00000000a013',
   'อยากได้แก้ไขภายใน 15 นาทีหลังโพสต์ก็พอ', NULL, false, now() - interval '3 days', now() - interval '3 days'),
  ('00000000-0000-0000-0006-00000000000f', '00000000-0000-0000-0005-000000000023', '00000000-0000-0000-0000-00000000a005',
   'เห็นด้วย — changelog สั้น ๆ รายสัปดาห์จะช่วยมาก', NULL, false, now() - interval '10 hours', now() - interval '10 hours');

  -- Likes sample
  INSERT INTO anthem.forum_topic_likes (topic_id, user_id, created_at)
  VALUES
  ('00000000-0000-0000-0005-00000000000e', '00000000-0000-0000-0000-00000000a000', now() - interval '1 day'),
  ('00000000-0000-0000-0005-00000000000e', '00000000-0000-0000-0000-00000000a001', now() - interval '1 day'),
  ('00000000-0000-0000-0005-00000000000e', '00000000-0000-0000-0000-00000000a012', now() - interval '20 hours'),
  ('00000000-0000-0000-0005-000000000010', '00000000-0000-0000-0000-00000000a002', now() - interval '3 days'),
  ('00000000-0000-0000-0005-000000000010', '00000000-0000-0000-0000-00000000a007', now() - interval '2 days'),
  ('00000000-0000-0000-0005-000000000016', '00000000-0000-0000-0000-00000000a004', now() - interval '1 day'),
  ('00000000-0000-0000-0005-000000000016', '00000000-0000-0000-0000-00000000a009', now() - interval '12 hours'),
  ('00000000-0000-0000-0005-000000000032', '00000000-0000-0000-0000-00000000a008', now() - interval '2 days'),
  ('00000000-0000-0000-0005-000000000032', '00000000-0000-0000-0000-00000000a011', now() - interval '1 day'),
  ('00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0000-00000000a010', now() - interval '1 day'),
  ('00000000-0000-0000-0005-00000000002e', '00000000-0000-0000-0000-00000000a000', now() - interval '2 days'),
  ('00000000-0000-0000-0005-00000000002b', '00000000-0000-0000-0000-00000000a013', now() - interval '1 day')
  ON CONFLICT DO NOTHING;

  -- Sync reply_count / like_count / accepted_reply / last_activity from reality
  UPDATE anthem.forum_topics t
  SET reply_count = (SELECT count(*)::int FROM anthem.forum_replies r WHERE r.topic_id = t.id),
      like_count = (SELECT count(*)::int FROM anthem.forum_topic_likes l WHERE l.topic_id = t.id),
      last_activity_at = GREATEST(
        t.created_at,
        COALESCE((SELECT max(r.created_at) FROM anthem.forum_replies r WHERE r.topic_id = t.id), t.created_at)
      ),
      accepted_reply_id = (
        SELECT r.id FROM anthem.forum_replies r
        WHERE r.topic_id = t.id AND r.is_accepted
        ORDER BY r.created_at ASC
        LIMIT 1
      )
  WHERE t.id::text LIKE '00000000-0000-0000-0005-%';
END $$;
