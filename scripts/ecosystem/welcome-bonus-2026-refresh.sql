-- Welcome Bonus refresh 2026: 12 missions, 100 px cap, dual-heart like, area/designers/studios

UPDATE shared.gift_limits_config SET welcome_px_cap = 100 WHERE id = 1;

-- Catalog rewards (sum = 100) — upsert without requiring unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.welcome_mission_catalog'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.welcome_mission_catalog ADD PRIMARY KEY (id);
  END IF;
END $$;

INSERT INTO public.welcome_mission_catalog (id, title_th, description_th, difficulty, reward_px, active, sort_order)
VALUES
  ('explore_feed', 'สำรวจฟีดผลงาน', 'เปิดแท็บ Projects ในหน้าแรก', 'easy', 6, true, 10),
  ('explore_community', 'สำรวจ Area', 'เปิดแท็บ Area ในหน้าแรก', 'easy', 6, true, 20),
  ('explore_designers', 'สำรวจ Designers', 'เปิดแท็บ Designers', 'easy', 6, true, 30),
  ('explore_studios', 'สำรวจ Studios', 'เปิดแท็บ Studios', 'easy', 6, true, 40),
  ('like', 'กดหัวใจผลงานและโพสต์', 'กดหัวใจอย่างน้อย 1 ผลงานและ 1 โพสต์ใน Area', 'easy', 6, true, 50),
  ('follow', 'ติดตามครีเอเตอร์', 'ติดตามดีไซเนอร์ที่ชอบ', 'easy', 8, true, 60),
  ('jobs', 'ดูบอร์ดงาน', 'สำรวจประกาศงาน', 'easy', 8, true, 70),
  ('skills', 'ใส่ทักษะ', 'เพิ่มทักษะในโปรไฟล์', 'medium', 8, true, 80),
  ('share_profile', 'แชร์ลิงก์โปรไฟล์', 'คัดลอกลิงก์ @username', 'medium', 10, true, 90),
  ('profile', 'ตั้งโปรไฟล์ให้พร้อม', 'รูป username และ bio อย่างน้อย 20 ตัวอักษร', 'medium', 12, true, 100),
  ('post_community', 'โพสต์ใน Area', 'เผยแพร่โพสต์ใน Area อย่างน้อย 1 ครั้ง', 'medium', 12, true, 110),
  ('publish_project', 'เผยแพร่ผลงานชิ้นแรก', 'ลงผลงานสถานะ Published', 'hard', 12, true, 120)
ON CONFLICT (id) DO UPDATE SET
  title_th = EXCLUDED.title_th,
  description_th = EXCLUDED.description_th,
  difficulty = EXCLUDED.difficulty,
  reward_px = EXCLUDED.reward_px,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order;

CREATE OR REPLACE FUNCTION public._check_welcome_mission(_uid uuid, _mission_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  pub_count int;
  follow_count int;
  project_like_count int;
  community_like_count int;
  community_post_count int;
BEGIN
  CASE _mission_id
    WHEN 'like' THEN
      SELECT COUNT(*)::int INTO project_like_count FROM anthem.project_likes WHERE user_id = _uid;
      SELECT COUNT(*)::int INTO community_like_count FROM anthem.community_post_likes WHERE user_id = _uid;
      RETURN project_like_count >= 1 AND community_like_count >= 1;
    WHEN 'follow' THEN
      SELECT COUNT(*)::int INTO follow_count FROM anthem.follows WHERE follower_id = _uid;
      RETURN follow_count >= 1;
    WHEN 'publish_project' THEN
      SELECT COUNT(*)::int INTO pub_count FROM anthem.projects
        WHERE owner_id = _uid AND status = 'Published';
      RETURN pub_count >= 1;
    WHEN 'post_community' THEN
      SELECT COUNT(*)::int INTO community_post_count FROM anthem.community_posts
        WHERE author_id = _uid AND status = 'published';
      RETURN community_post_count >= 1;
    WHEN 'explore_feed' THEN
      RETURN public._welcome_visit(_uid, 'explore_feed');
    WHEN 'explore_community' THEN
      RETURN public._welcome_visit(_uid, 'explore_community');
    WHEN 'explore_designers' THEN
      RETURN public._welcome_visit(_uid, 'explore_designers');
    WHEN 'explore_studios' THEN
      RETURN public._welcome_visit(_uid, 'explore_studios');
    WHEN 'jobs' THEN
      RETURN public._welcome_visit(_uid, 'jobs');
    WHEN 'share_profile' THEN
      RETURN public._welcome_visit(_uid, 'share_profile');
    WHEN 'profile', 'skills' THEN
      SELECT * INTO p FROM public.profiles WHERE user_id = _uid LIMIT 1;
      IF NOT FOUND THEN RETURN false; END IF;
      IF _mission_id = 'profile' THEN
        RETURN COALESCE(length(trim(p.avatar_url)), 0) > 0
          AND COALESCE(length(trim(p.username)), 0) > 0
          AND COALESCE(length(trim(p.bio)), 0) >= 20;
      END IF;
      RETURN COALESCE(array_length(p.skills, 1), 0) >= 1;
    ELSE
      RETURN false;
  END CASE;
END;
$$;
