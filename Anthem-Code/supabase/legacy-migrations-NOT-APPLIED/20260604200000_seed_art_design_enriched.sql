-- Supplement social graph + engagement counts for demo catalog (users 0-19).
DO $enrich$
DECLARE
  i int;
  j int;
  uid uuid;
  pid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'anthem' AND table_name = 'follows') THEN
    RAISE NOTICE 'skip enrich — anthem schema missing';
    RETURN;
  END IF;

  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    FOR j IN 0..19 LOOP
      IF i = j THEN CONTINUE; END IF;
      IF (i + j) % 2 = 0 OR (i * 3 + j) % 5 = 0 THEN
        INSERT INTO anthem.follows (follower_id, following_id)
        VALUES (uid, public._catalog_demo_uid(j))
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  FOR i IN 0..19 LOOP
    pid := ('00000000-0000-0000-0002-0000000000' || lpad(to_hex(i), 2, '0'))::uuid;
    FOR j IN 1..6 LOOP
      INSERT INTO anthem.project_likes (project_id, user_id)
      VALUES (pid, public._catalog_demo_uid((i + j) % 20))
      ON CONFLICT DO NOTHING;
    END LOOP;
    UPDATE anthem.projects SET
      views = GREATEST(views, 400 + i * 61),
      likes = GREATEST(likes, 30 + i * 9)
    WHERE id = pid;
  END LOOP;
END;
$enrich$;
