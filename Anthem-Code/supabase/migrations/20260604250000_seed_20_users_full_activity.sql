-- Full demo activity for 20 creators (wallets, comments, collections, gifts, notifications).
-- Idempotent fixed UUIDs — purge via scripts/sql/purge-demo-users.sql
DO $activity$
DECLARE
  i int;
  uid uuid;
  pid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'shared' AND table_name = 'wallets') THEN
    RAISE NOTICE 'skip activity — shared.wallets missing';
    RETURN;
  END IF;

  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    INSERT INTO shared.wallets (user_id, purchased_px, earned_px, welcome_px, lifetime_welcome_px, lifetime_earned_px, lifetime_spent_px)
    VALUES (
      uid,
      CASE WHEN i = 1 THEN 500 WHEN i = 5 THEN 800 WHEN i = 0 THEN 0 ELSE 100 + (i * 37) % 400 END,
      CASE WHEN i = 1 THEN 1200 WHEN i = 0 THEN 0 ELSE 50 + (i * 23) % 600 END,
      CASE WHEN i = 0 THEN 50 WHEN i = 1 THEN 200 WHEN i = 5 THEN 100 ELSE 80 + (i * 11) % 120 END,
      CASE WHEN i = 0 THEN 50 WHEN i = 1 THEN 200 WHEN i = 5 THEN 100 ELSE 80 + (i * 11) % 120 END,
      CASE WHEN i = 1 THEN 1200 ELSE 50 + (i * 23) % 600 END,
      CASE WHEN i = 1 THEN 320 ELSE (i * 7) % 150 END
    )
    ON CONFLICT (user_id) DO UPDATE SET
      purchased_px = EXCLUDED.purchased_px,
      earned_px = EXCLUDED.earned_px,
      welcome_px = EXCLUDED.welcome_px,
      lifetime_welcome_px = EXCLUDED.lifetime_welcome_px,
      lifetime_earned_px = EXCLUDED.lifetime_earned_px,
      lifetime_spent_px = EXCLUDED.lifetime_spent_px;
  END LOOP;

  FOR i IN 0..31 LOOP
    pid := ('00000000-0000-0000-0002-0000000000' || lpad(to_hex(i % 20), 2, '0'))::uuid;
    INSERT INTO anthem.project_comments (id, project_id, user_id, content, parent_id, depth)
    VALUES (
      ('00000000-0000-0000-0007-' || lpad(to_hex(i), 12, '0'))::uuid,
      pid,
      public._catalog_demo_uid((i + 3) % 20),
      CASE (i % 4)
        WHEN 0 THEN 'สวยมากครับ โทนสีลงตัวมาก'
        WHEN 1 THEN 'ชอบ composition นี้มาก แรงบันดาลใจเต็มเลย'
        WHEN 2 THEN 'รายละเอียดดีมาก ขอถาม process หน่อยได้ไหม'
        ELSE 'ผลงานนี้เหมาะกับแบรนด์ lifestyle มากเลย'
      END,
      NULL,
      0
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  FOR i IN 0..11 LOOP
    uid := public._catalog_demo_uid(i);
    INSERT INTO anthem.collections (id, owner_id, name, description, is_public)
    VALUES (
      ('00000000-0000-0000-0008-1' || lpad(to_hex(i), 11, '0'))::uuid,
      uid,
      CASE (i % 3) WHEN 0 THEN 'แรงบันดาลใจประจำสัปดาห์' WHEN 1 THEN 'โปรเจกต์ที่ชอบ' ELSE 'รวมผลงานโปรด' END,
      'คอลเลกชัน demo สำหรับ UX review',
      i % 2 = 0
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO anthem.collection_items (id, collection_id, project_id)
    VALUES (
      ('00000000-0000-0000-0008-2' || lpad(to_hex(i), 11, '0'))::uuid,
      ('00000000-0000-0000-0008-1' || lpad(to_hex(i), 11, '0'))::uuid,
      ('00000000-0000-0000-0002-0000000000' || lpad(to_hex((i + 2) % 20), 2, '0'))::uuid
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  FOR i IN 0..9 LOOP
    uid := public._catalog_demo_uid(i);
    INSERT INTO anthem.inspire_boards (id, owner_id, name)
    VALUES (
      ('00000000-0000-0000-0009-' || lpad(to_hex(i), 12, '0'))::uuid,
      uid,
      CASE (i % 2) WHEN 0 THEN 'Mood สีอบอุ่น' ELSE 'Reference layout' END
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    INSERT INTO shared.notifications (id, user_id, app, kind, title, body, link, is_read, is_dismissed)
    VALUES (
      ('00000000-0000-0000-000e-' || lpad(to_hex(i), 12, '0'))::uuid,
      uid,
      'anthem',
      CASE (i % 4) WHEN 0 THEN 'like' WHEN 1 THEN 'comment' WHEN 2 THEN 'follow' ELSE 'gift' END,
      CASE (i % 4)
        WHEN 0 THEN 'มีคนกดถูกใจผลงานของคุณ'
        WHEN 1 THEN 'มีคอมเมนต์ใหม่บนผลงาน'
        WHEN 2 THEN 'มีผู้ติดตามใหม่'
        ELSE 'ได้รับของขวัญจากชุมชน'
      END,
      'กิจกรรมจากชุมชน demo — ทดสอบ UX',
      '/notifications',
      i % 3 = 0,
      false
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$activity$;
