-- 50 demo creators + full platform activity (extends catalog users 0..19 → 0..49)
-- Seed users receive random unusable passwords. Set reviewer passwords with the admin seed script.
-- Requires: _catalog_demo_uid, _unsplash_art from prior migrations

CREATE OR REPLACE FUNCTION public._catalog_demo_project_id(i integer)
RETURNS uuid
LANGUAGE sql IMMUTABLE AS $$
  SELECT ('00000000-0000-0000-0002-0000000000' || lpad(to_hex(i), 2, '0'))::uuid;
$$;

DO $seed50$
DECLARE
  i int; j int;
  uid uuid; uid2 uuid; pid uuid; sid uuid; gid uuid;
  demo_email text;
  cover text; gal text[];
  gprice int;
  budgets public.hire_budget[] := ARRAY['1k-5k','5k-20k','20k-50k','50k+']::public.hire_budget[];
  names text[] := ARRAY[
    'อริญญา วงศ์สุวรรณ','บุญเลิศ แก้วมณี','ชนิดา รัตนา','เดชา สมบูรณ์','เอกชัย ใจดี',
    'ฟ้าแสง ทองคำ','เกมลัน ศิลป์','หทัยรัตน์ พูนสุข','อิทธิพล คงดี','จิราวัฒน์ มีชัย',
    'กัญญา สุขสันต์','ลลิตา นิลมณี','เมขคลา วิจิตร','นิรันดร์ โชติกา','อรทัย แสงจันทร์',
    'ประภาส มั่นคง','รัตนา ศรีสุข','สมบัติ เจริญ','ทวี รุ่งเรือง','อุไดพร ชูใจ',
    'วิชัย เกียรติกุล','วลัย ทิพย์มณี','ซานาดู ครีเอทีฟ','ยุภา ละอองดาว','ซาการี ดีไซน์',
    'ณรงค์ ชัยภูมิ','เพ็ญศรี วาดฝัน','สันติสุข งามวงศ์','ธีรพงษ์ คิดสร้าง','วิลาวัณย์ สีสัน'
  ];
  usernames text[] := ARRAY[
    'arinya','boonlert','chanida','decha','ekkachai','fahsaeng','gamelan','hathairat',
    'ithipol','jirawat','kanya','lalita','mekkhala','niran','orathai','prapas',
    'rattana','sombat','thawee','udaiphon','vichai','walai','xanadu','yupa',
    'zakari','narong','pensri','santisuk','theerapong','wilawan'
  ];
  roles text[] := ARRAY[
    'Motion Designer','3D Artist','Type Designer','Art Director','Packaging Designer',
    'Social Media Designer','Exhibition Designer','Game UI Artist','Editorial Designer','Fashion Illustrator',
    'Ceramic Illustrator','Environmental Graphic Designer','Data Viz Designer','NFT Artist','Signage Designer',
    'Food Stylist & Photo','Architectural Viz','Toy Designer','Calligrapher','Creative Strategist',
    'AR Filter Creator','Sustainable Brand Designer','Mural Artist','Podcast Cover Designer','E-learning UI',
    'Retail Space Designer','Pattern Designer','VFX Compositor','Portrait Illustrator','Design Educator'
  ];
  bios text[] := ARRAY[
    'โมชั่นและสตอรี่บอร์ดสำหรับแบรนด์ไทย','โมเดล 3D product และฉากโฆษณา','ออกแบบฟอนต์ไทย commercial',
    'ดูแลทิศทางศิลป์ทีม 8 คน','แพ็กเกจจิ้งอาหารและของฝาก','ดีไซน์คอนเทนต์ IG/TikTok รายเดือน',
    'ออกแบบบูธและอีเวนต์','UI เกมมือถือ hyper-casual','เลย์เอาต์นิตยสารและหนังสือ',
    'ภาพประกอบแฟชั่นและลุคบุ๊ก','ภาพบนเซรามิกและของใช้','ป้ายและ wayfinding ในเมือง',
    'Infographic และ dashboard','คอลเลกชัน digital art บน marketplace','ป้ายร้านและป้ายโฆษณา',
    'จัดจานและถ่ายภาพอาหาร','ภาพ 3D สถาปัตย์','ออกแบบของเล่นและฟิกเกอร์',
    'คัลลิกราฟีงานแต่งและแบรนด์','วางกลยุทธ์คอนเทนต์แบรนด์ SME','ฟิลเตอร์ IG/FB แบรนด์',
    'แบรนด์รีไซเคิลและ eco packaging','วาดมุมผนังคาเฟ่และออฟฟิศ','ปกพอดแคสต์และอัลบั้ม',
    'UI คอร์สออนไลน์และ LMS','ดีไซน์ร้านค้าปลีกและ pop-up','ลายผ้าและ surface pattern',
    'VFX โฆษณาและมิวสิควิดีโอ','ภาพเหมือนดิจิทัลและ commission','สอนและรีวิวพอร์ตน้องใหม่'
  ];
  proj_titles text[] := ARRAY[
    'Motion Reel แบรนด์สกินแคร์','Product 3D ขวดน้ำหอม','ฟอนต์ไทย Modern Serif',
    'Art Direction แคมเปญสงกรานต์','แพ็กเกจจิ้งขนมครก','Social Template 30 วัน',
    'บูธงานดีไซน์ 2026','UI Kit เกม Puzzle','Editorial นิตยสารไลฟ์สไตล์',
    'Lookbook แฟชั่นผ้าทอ','ลายเซรามิก limited','Wayfinding อาร์ตมิวเซียม',
    'Dashboard สุขภาพ community','NFT Drop สีไทย','Signage ร้าน specialty coffee',
    'Food styling set 12 เมนู','Archviz บ้านพักตากอากาศ','Toy line น้องแมวอวกาศ',
    'Calligraphy wedding suite','Content playbook F&B','AR filter สงกรานต์',
    'Eco brand starter kit','Mural คาเฟ่ 12m','Podcast cover series',
    'E-learning UI 24 screens','Retail pop-up สีสด','Pattern SS26',
    'VFX spot 15s','Portrait commission set','Portfolio review live'
  ];
  proj_cats text[] := ARRAY[
    'Video','Graphic','Graphic','Graphic','Graphic','Content','Graphic','Web/UI','Graphic',
    'Illustration','Craft','Graphic','Web/UI','Illustration','Graphic','Photography','Graphic',
    'Illustration','Graphic','Content','Illustration','Graphic','Illustration','Web/UI','Graphic',
    'Graphic','Craft','Video','Illustration','Content'
  ];
  comments text[] := ARRAY[
    'โทนสีสวยมากครับ ชอบมุมนี้','รายละเอียดละเอียดดีมาก','อยากจ้างทำโลโก้แนวนี้ได้ไหม',
    'ฟอนต์อ่านง่าย ลงตัวกับแบรนด์','ภาพโปรดักต์คมชัดมาก','ไอเดียคอลแลปน่าสนใจมาก',
    'แรงบันดาลใจเต็มเลย ขอบคุณที่แชร์','สไตล์มินิมอลถูกใจมาก','อยากเห็น process ด้วยนะ',
    'ผลงานโดดเด่นในฟีดจริงๆ','สีสันสดใสแต่ยังดูพรีเมียม','layout สมดุลดีครับ',
    'เหมาะกับแบรนด์ Gen Z มาก','เครื่องมือที่ใช้ตรงสายงานเลย','ราคางานประมาณเท่าไหร่ครับ',
    'ขออนุญาตบันทึกลงคอลเลกชันนะ','แชร์ให้ทีมดูแล้ว ชอบมาก','มีเวอร์ชัน dark mode ไหม',
    'ภาพ cover โดนใจมาก','น่าจ้างทำต่อยอดแคมเปญ'
  ];
  collab_msgs text[] := ARRAY[
    'สวัสดีครับ อยากชวนทำคอลแลปโปรเจกต์แบรนด์กาแฟ','มีงาน illustration 2 ภาพ สนใจไหม',
    'ชอบสไตล์มาก อยากชวนออกแบบ packaging ร่วมกัน','โปรเจกต์นิทรรศการ ต้องการ motion ช่วย',
    'มี client ต้องการ UI ภายใน 3 สัปดาห์','อยากร่วมทำ zine ออนไลน์ 1 ฉบับ'
  ];
  hire_msgs text[] := ARRAY[
    'สนใจจ้างทำโลโก้และนามบัตร','ขอใบเสนอราคาออกแบบเมนูร้านอาหาร',
    'ต้องการภาพประกอบ 5 ภาพสำหรับเว็บ','อยากปรึกษา rebrand แบรนด์ SME'
  ];
  gift_msg text[] := ARRAY['เยี่ยมมาก!','สู้ๆ ครับ','ชอบผลงาน','กำลังใจนะ','โคตรปัง'];
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  -- Ensure projects 0..19 exist in public.projects (catalog may have used anthem schema)
  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    pid := public._catalog_demo_project_id(i);
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = pid) THEN
      cover := public._unsplash_art(i, 1200, 900);
      INSERT INTO public.projects (
        id, owner_id, title, category, cover_url, gallery_urls, tools, status,
        views, likes, price_thb, description, allow_hire, allow_collab
      ) VALUES (
        pid, uid,
        'ผลงานพอร์ตโฟลิโอ ' || (i + 1)::text,
        'Graphic', cover, ARRAY[cover], ARRAY['Figma','Illustrator'],
        'Published', 200 + i * 40, 20 + i * 5, 5000 + i * 500,
        'ผลงาน demo ชุมชน Anthem', true, true
      ) ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;

  -- ── Users 20..49 (auth + profile) ──
  FOR i IN 20..49 LOOP
    uid := public._catalog_demo_uid(i);
    demo_email := usernames[i - 19] || '@demo.an1hem.app';

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      demo_email, crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')), now() - ((49 - i) || ' days')::interval,
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('display_name', names[i - 19], 'username', usernames[i - 19]),
      now() - ((49 - i) || ' days')::interval, now()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      uid, uid,
      jsonb_build_object('sub', uid::text, 'email', demo_email),
      'email', uid::text, now(), now(), now()
    ) ON CONFLICT DO NOTHING;

    cover := public._unsplash_art(i + 3, 1600, 500);
    INSERT INTO public.profiles (
      id, display_name, username, email, role, bio, skills, location,
      avatar_url, cover_url, website, instagram, is_verified
    ) VALUES (
      uid,
      names[i - 19],
      usernames[i - 19],
      demo_email,
      roles[i - 19],
      bios[i - 19],
      CASE (i % 5)
        WHEN 0 THEN ARRAY['Figma','Illustrator','After Effects']
        WHEN 1 THEN ARRAY['Blender','Photoshop','Cinema 4D']
        WHEN 2 THEN ARRAY['Procreate','Illustrator','InDesign']
        WHEN 3 THEN ARRAY['Lightroom','Photoshop','Capture One']
        ELSE ARRAY['Figma','Webflow','Framer']
      END,
      (ARRAY['Bangkok','Chiang Mai','Phuket','Khon Kaen','Chiang Rai','Pattaya'])[1 + (i % 6)],
      'https://api.dicebear.com/7.x/notionists/svg?seed=' || usernames[i - 19] || '&backgroundColor=f5f0e8,e8dcc8',
      cover,
      'https://anthem.app/u/' || uid::text,
      '@' || usernames[i - 19] || '_art',
      i % 7 = 0
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      username = EXCLUDED.username,
      role = EXCLUDED.role,
      bio = EXCLUDED.bio,
      skills = EXCLUDED.skills,
      location = EXCLUDED.location,
      avatar_url = EXCLUDED.avatar_url,
      cover_url = EXCLUDED.cover_url,
      website = EXCLUDED.website,
      instagram = EXCLUDED.instagram,
      is_verified = EXCLUDED.is_verified;
  END LOOP;

  -- Enrich profiles 0..19 (ensure cover/avatar if missing)
  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    UPDATE public.profiles SET
      cover_url = COALESCE(NULLIF(cover_url, ''), public._unsplash_art(i + 3, 1600, 500)),
      avatar_url = COALESCE(NULLIF(avatar_url, ''), 'https://api.dicebear.com/7.x/notionists/svg?seed=catalog' || i::text)
    WHERE id = uid;
  END LOOP;

  -- ── Projects 20..49 + second project 50..69 for users 0..19 ──
  FOR i IN 20..49 LOOP
    uid := public._catalog_demo_uid(i);
    pid := public._catalog_demo_project_id(i);
    cover := public._unsplash_art(i, 1200, 900);
    gal := ARRAY[cover, public._unsplash_art(i + 7, 1200, 900), public._unsplash_art(i + 13, 1200, 900)];
    INSERT INTO public.projects (
      id, owner_id, title, category, cover_url, gallery_urls, tools, status,
      views, likes, price_thb, description, allow_hire, allow_collab, tags
    ) VALUES (
      pid, uid, proj_titles[i - 19], proj_cats[i - 19], cover, gal,
      ARRAY['Figma','Photoshop','Illustrator'],
      'Published',
      180 + (i * 41) % 3200,
      15 + (i * 13) % 220,
      4500 + (i * 800) % 45000,
      'ผลงานพอร์ตโฟลิโอจากชุมชน Anthem — ข้อมูล demo สำหรับทดสอบ UX',
      true, true,
      ARRAY['demo','anthem','portfolio']
    ) ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      cover_url = EXCLUDED.cover_url,
      gallery_urls = EXCLUDED.gallery_urls,
      description = EXCLUDED.description,
      views = EXCLUDED.views,
      likes = EXCLUDED.likes;
  END LOOP;

  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    pid := public._catalog_demo_project_id(50 + i);
    cover := public._unsplash_art(50 + i, 1200, 900);
    INSERT INTO public.projects (
      id, owner_id, title, category, cover_url, gallery_urls, tools, status,
      views, likes, price_thb, description, allow_hire, allow_collab
    ) VALUES (
      pid, uid,
      'ผลงานต่อยอด — ' || proj_titles[1 + (i % 30)],
      proj_cats[1 + (i % 30)],
      cover,
      ARRAY[cover, public._unsplash_art(50 + i + 3, 1200, 900)],
      ARRAY['Figma','Procreate'],
      'Published',
      90 + i * 23,
      5 + i * 3,
      6000 + i * 500,
      'โปรเจกต์ที่สองของครีเอเตอร์ — ใช้ทดสอบกริดพอร์ตโฟลิโอ',
      true, true
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- ── Wallets + topups (all 50) ──
  FOR i IN 0..49 LOOP
    uid := public._catalog_demo_uid(i);
    INSERT INTO public.wallets (user_id, purchased_px, earned_px, lifetime_earned_px, lifetime_spent_px)
    VALUES (uid, 200 + (i * 37) % 8000, 50 + (i * 19) % 12000, 100 + (i * 29) % 15000, i * 11 % 3000)
    ON CONFLICT (user_id) DO UPDATE SET
      purchased_px = GREATEST(public.wallets.purchased_px, EXCLUDED.purchased_px),
      earned_px = GREATEST(public.wallets.earned_px, EXCLUDED.earned_px);
    INSERT INTO public.wallet_topups (id, user_id, amount_px, method, status, created_at)
    VALUES (
      ('00000000-0000-0000-0008-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      uid, 500 + (i * 100) % 5000, 'mock_card', 'completed',
      now() - ((i % 14) || ' days')::interval
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- ── Studios 10..14 ──
  FOR i IN 10..14 LOOP
    uid := public._catalog_demo_uid(i);
    sid := ('00000000-0000-0000-0001-0000000000' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO public.studios (
      id, slug, name, tagline, bio, avatar_url, cover_url, location, verified, created_by, member_count
    ) VALUES (
      sid,
      (ARRAY['pixel-atelier','north-craft','siam-motion','lanna-lab','gulf-design'])[i - 9],
      (ARRAY['Pixel Atelier','North Craft Co.','Siam Motion','Lanna Lab','Gulf Design'])[i - 9],
      'ทีมครีเอทีฟไทย — demo',
      'สตูดิโอรวมดีไซน์ ภาพ และโมชั่น',
      'https://api.dicebear.com/7.x/shapes/svg?seed=studio-' || i::text,
      public._unsplash_art(i + 4, 1600, 500),
      (ARRAY['Bangkok','Chiang Mai','Phuket','Khon Kaen','Pattaya'])[1 + (i % 5)],
      i % 2 = 0, uid, 2 + (i % 4)
    ) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.studio_members (studio_id, user_id, role)
    VALUES (sid, uid, 'owner'::public.studio_member_role)
    ON CONFLICT DO NOTHING;
    uid2 := public._catalog_demo_uid((i + 5) % 50);
    INSERT INTO public.studio_members (studio_id, user_id, role)
    VALUES (sid, uid2, 'member'::public.studio_member_role)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Job posts 12..24 ──
  FOR i IN 12..24 LOOP
    sid := ('00000000-0000-0000-0001-0000000000' || lpad(to_hex(i % 15), 2, '0'))::uuid;
    uid := public._catalog_demo_uid(i % 50);
    INSERT INTO public.job_posts (
      id, studio_id, posted_by, title, role_category, description, skills,
      budget_min, budget_max, budget_type, location_type, location, status, post_type, poster_role, employment_type
    ) VALUES (
      ('00000000-0000-0000-0003-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      sid, uid,
      (ARRAY[
        'Junior UI Designer (Remote)','Senior Illustrator งานหนังสือ','Motion Designer โฆษณา 30s',
        'Brand Designer สตาร์ทอัพ EdTech','Product Photographer สินค้า FMCG',
        'Art Director ฝ่าย Creative Agency','Webflow Developer ลูกค้าโรงแรม',
        'Content Creator สาย travel','3D Artist ฉากสินค้า','Type Designer freelance',
        'Social Media Designer รายเดือน','Exhibition Designer งานแฟร์','Design Lead ทีม 6 คน'
      ])[i - 11],
      'Design',
      'ประกาศงาน demo — Anthem community',
      ARRAY['Figma','Branding','Adobe CC'],
      12000 + i * 1500, 35000 + i * 2000, 'fixed',
      CASE WHEN i % 3 = 0 THEN 'remote'::public.job_location_type ELSE 'hybrid'::public.job_location_type END,
      (ARRAY['Bangkok','Chiang Mai','Remote'])[1 + (i % 3)],
      'open', 'hiring', 'studio', 'project'
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- ── Social graph: follows (dense) ──
  FOR i IN 0..49 LOOP
    uid := public._catalog_demo_uid(i);
    FOR j IN 1..6 LOOP
      uid2 := public._catalog_demo_uid((i + j * 3) % 50);
      IF uid <> uid2 THEN
        INSERT INTO public.follows (follower_id, following_id)
        VALUES (uid, uid2) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  -- ── Likes across projects 0..69 ──
  FOR i IN 0..69 LOOP
    pid := public._catalog_demo_project_id(i);
    FOR j IN 1..5 LOOP
      uid := public._catalog_demo_uid((i + j * 7) % 50);
      INSERT INTO public.project_likes (project_id, user_id)
      VALUES (pid, uid) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- ── Comments ──
  FOR i IN 0..79 LOOP
    pid := public._catalog_demo_project_id(i % 70);
    uid := public._catalog_demo_uid((i * 2) % 50);
    INSERT INTO public.project_comments (id, project_id, user_id, content, created_at)
    VALUES (
      ('00000000-0000-0000-0007-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      pid, uid,
      comments[1 + (i % array_length(comments, 1))],
      now() - ((i % 30) || ' hours')::interval
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- ── Collab requests (40) ──
  FOR i IN 0..39 LOOP
    uid := public._catalog_demo_uid(i % 50);
    uid2 := public._catalog_demo_uid((i + 11) % 50);
    pid := public._catalog_demo_project_id(i % 50);
    INSERT INTO public.collab_requests (
      id, sender_id, recipient_id, project_id, collab_types, message, timeline, status, created_at
    ) VALUES (
      ('00000000-0000-0000-0005-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      uid, uid2, pid,
      ARRAY[(ARRAY['illustration','branding','motion','ui'])[1 + (i % 4)]],
      collab_msgs[1 + (i % array_length(collab_msgs, 1))],
      (ARRAY['2 สัปดาห์','1 เดือน','6 สัปดาห์','ตามคุย'])[1 + (i % 4)],
      (ARRAY['pending'::public.collab_status,'interested'::public.collab_status,'pending'::public.collab_status,'passed'::public.collab_status])[1 + (i % 4)],
      now() - ((i % 20) || ' days')::interval
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- ── Hiring requests (35) ──
  FOR i IN 0..34 LOOP
    uid := public._catalog_demo_uid((i + 3) % 50);
    uid2 := public._catalog_demo_uid((i + 17) % 50);
    INSERT INTO public.hiring_requests (
      id, freelancer_id, client_id, project_title, client_name, email, phone,
      budget, budget_amount, message, status, created_at
    ) VALUES (
      ('00000000-0000-0000-0006-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      uid2, uid,
      proj_titles[1 + (i % 30)],
      (SELECT display_name FROM public.profiles WHERE id = uid),
      (SELECT email FROM public.profiles WHERE id = uid),
      '08' || (10000000 + i * 12345)::text,
      budgets[1 + (i % 4)],
      (ARRAY[3500, 12000, 28000, 65000])[1 + (i % 4)],
      hire_msgs[1 + (i % array_length(hire_msgs, 1))],
      (ARRAY['ใหม่'::public.hire_status,'ที่ต้องตอบ'::public.hire_status,'ติดต่อแล้ว'::public.hire_status])[1 + (i % 3)],
      now() - ((i % 15) || ' days')::interval
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- ── Collections + items ──
  FOR i IN 0..29 LOOP
    uid := public._catalog_demo_uid(i % 50);
    INSERT INTO public.collections (
      id, owner_id, name, description, category, cover_url, is_public, item_count
    ) VALUES (
      ('00000000-0000-0000-0008-1000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      uid,
      (ARRAY['แรงบันดาลใจสัปดาห์นี้','โปรเจกต์โปรด','สีสันไทยโมเดิร์น','UI ที่ชอบ','ถ่ายภาพสวยๆ'])[1 + (i % 5)],
      'คอลเลกชัน demo สำหรับทดสอบ',
      proj_cats[1 + (i % 30)],
      public._unsplash_art(i + 20, 800, 600),
      true, 0
    ) ON CONFLICT (id) DO NOTHING;
    FOR j IN 0..2 LOOP
      INSERT INTO public.collection_items (collection_id, project_id)
      VALUES (
        ('00000000-0000-0000-0008-1000000000' || lpad(to_hex(i), 2, '0'))::uuid,
        public._catalog_demo_project_id((i + j * 5) % 70)
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- ── Inspire boards ──
  FOR i IN 0..24 LOOP
    uid := public._catalog_demo_uid(i % 50);
    INSERT INTO public.inspire_boards (id, owner_id, name, cover_url, item_count)
    VALUES (
      ('00000000-0000-0000-0009-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      uid,
      (ARRAY['Mood สีส้ม','Minimal cafe','Typography ref','Packaging inspo','Photo lighting'])[1 + (i % 5)],
      public._unsplash_art(i + 30, 800, 800),
      0
    ) ON CONFLICT (id) DO NOTHING;
    FOR j IN 0..3 LOOP
      INSERT INTO public.inspire_items (board_id, project_id, image_url)
      VALUES (
        ('00000000-0000-0000-0009-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
        public._catalog_demo_project_id((i + j) % 50),
        public._unsplash_art(i + j * 2, 600, 800)
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- ── Gift transactions ──
  SELECT id INTO gid FROM public.gifts WHERE active ORDER BY display_order LIMIT 1;
  IF gid IS NOT NULL THEN
    FOR i IN 0..44 LOOP
      uid := public._catalog_demo_uid(i % 50);
      uid2 := public._catalog_demo_uid((i + 9) % 50);
      SELECT price_px INTO gprice FROM public.gifts WHERE id = gid;
      INSERT INTO public.gift_transactions (
        id, sender_id, recipient_id, gift_id, price_px, message, project_id, created_at
      ) VALUES (
        ('00000000-0000-0000-000a-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
        uid, uid2, gid, gprice,
        gift_msg[1 + (i % array_length(gift_msg, 1))],
        public._catalog_demo_project_id((i + 2) % 50),
        now() - ((i % 25) || ' days')::interval
      ) ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  -- ── Job applications ──
  FOR i IN 0..24 LOOP
    INSERT INTO public.job_applications (
      id, job_id, applicant_id, cover_letter, portfolio_project_ids, status, created_at
    ) VALUES (
      ('00000000-0000-0000-000b-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      ('00000000-0000-0000-0003-0000000000' || lpad(to_hex(i % 25), 2, '0'))::uuid,
      public._catalog_demo_uid((i + 7) % 50),
      'สนใจร่วมงานมากครับ แนบพอร์ตโฟลิโอในโปรไฟล์ — demo application',
      ARRAY[public._catalog_demo_project_id((i + 7) % 50)],
      (ARRAY['pending','pending','shortlisted','accepted']::public.job_application_status[])[1 + (i % 4)],
      now() - ((i % 10) || ' days')::interval
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- ── Conversations + messages (hire/collab samples) ──
  FOR i IN 0..14 LOOP
    uid := public._catalog_demo_uid(i % 50);
    uid2 := public._catalog_demo_uid((i + 13) % 50);
    INSERT INTO public.conversations (
      id, kind, request_id, client_id, freelancer_id, project_id, project_title, last_message_at, created_at
    ) VALUES (
      ('00000000-0000-0000-000c-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      CASE WHEN i % 2 = 0 THEN 'hire' ELSE 'collab' END,
      CASE WHEN i % 2 = 0
        THEN ('00000000-0000-0000-0006-0000000000' || lpad(to_hex(i), 2, '0'))::uuid
        ELSE ('00000000-0000-0000-0005-0000000000' || lpad(to_hex(i), 2, '0'))::uuid
      END,
      uid, uid2,
      public._catalog_demo_project_id(i % 50),
      proj_titles[1 + (i % 30)],
      now() - ((i % 5) || ' hours')::interval,
      now() - ((i % 12) || ' days')::interval
    ) ON CONFLICT DO NOTHING;

    INSERT INTO public.messages (id, conversation_id, sender_id, content, created_at)
    VALUES (
      ('00000000-0000-0000-000d-0000000000' || lpad(to_hex(i * 3), 2, '0'))::uuid,
      ('00000000-0000-0000-000c-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      uid,
      'สวัสดีครับ สนใจรายละเอียดงานเพิ่มเติมครับ',
      now() - ((i % 8) || ' hours')::interval
    ) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.messages (id, conversation_id, sender_id, content, read_at, created_at)
    VALUES (
      ('00000000-0000-0000-000d-0000000000' || lpad(to_hex(i * 3 + 1), 2, '0'))::uuid,
      ('00000000-0000-0000-000c-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      uid2,
      'ได้เลยครับ งบและไทม์ไลน์ส่งมาได้เลย',
      CASE WHEN i % 3 = 0 THEN now() ELSE NULL END,
      now() - ((i % 6) || ' hours')::interval
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- ── Notifications (direct insert) ──
  FOR i IN 0..39 LOOP
    uid := public._catalog_demo_uid(i % 50);
    INSERT INTO shared.notifications (id, user_id, app, kind, title, body, link, created_at)
    VALUES (
      ('00000000-0000-0000-000e-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      uid, 'anthem',
      (ARRAY['follow','gift','hire_request','collab_request','job_match'])[1 + (i % 5)],
      (ARRAY['มีผู้ติดตามใหม่','ได้รับของขวัญ','คำขอจ้างงานใหม่','คำขอคอลแลป','มีงานที่ตรงกับคุณ'])[1 + (i % 5)],
      'การแจ้งเตือน demo — ทดสอบ inbox',
      '/notifications',
      now() - ((i % 48) || ' hours')::interval
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

END;
$seed50$;

COMMENT ON FUNCTION public._catalog_demo_project_id(integer) IS 'Demo seed: fixed project UUID by index 0..99';
