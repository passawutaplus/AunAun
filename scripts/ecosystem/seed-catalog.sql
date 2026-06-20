-- Seed real community catalog in Postgres (replaces client-side mock arrays).
-- Idempotent: fixed UUIDs + ON CONFLICT.

CREATE OR REPLACE FUNCTION public._catalog_demo_uid(i integer)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ('00000000-0000-0000-0000-00000000a0' || lpad(to_hex(i), 2, '0'))::uuid;
$$;

DO $seed$
DECLARE
  i int;
  uid uuid;
  sid uuid;
  cover text;
  names text[] := ARRAY[
    'ภัสวุฒิ ศรีวงค์','นภัสรา ทองดี','พิมพ์ชนก ใจดี','วรรณกร พันธ์ทอง','ธัญญา รัตนพร',
    'ฉัตรชัย วรกุล','อาทิตยา จันทร์เพ็ญ','พลอยไพลิน ขจร','ธนกร แสงทอง','อนุชา ภูมิดี',
    'ปาริชาต สวยงาม','เจษฎา ท่องเที่ยว','สุพัตรา โมชั่น','วทัญญู เสียงดี','กฤษณา เมโลดี้',
    'ศิริพร เงินงาม','กิตติพงษ์ ดิจิทัล','มนัสนันท์ อาร์ต','ณัฐวุฒิ ภาพถ่าย','ภัทรานิษฐ์ คอนเทนต์'
  ];
  usernames text[] := ARRAY[
    'phatsawut','napatsara','pimchanok','wannakorn','thanya','chatchai','atittaya','ploypailin',
    'thanakorn','anucha','parichat','jessada','supatra','wathanyu','kritsana','siriporn',
    'kittipong','manatsanan','nattawut','phattranit'
  ];
  roles text[] := ARRAY[
    'Brand & Logo Designer','Brand Identity Designer','Illustrator','Pattern & Textile Designer',
    'Ceramic Artist','Web & Poster Designer','UX/UI Designer','Content Creator','IG Content & Photo',
    'Product Photographer','Wedding Photographer','Video Editor','Motion Designer','Sound Designer',
    'Music Producer','Jewelry Designer','Web Developer & UI','Digital Illustrator',
    'Street Photographer','Content Strategist'
  ];
  bios text[] := ARRAY[
    'ออกแบบโลโก้ & แบรนด์ดิ้งสไตล์มินิมอล','สร้างแบรนด์ขนมไทยและร้านคาเฟ่','ภาพประกอบเด็ก & Pop Art',
    'ลายผ้าไทยสไตล์โมเดิร์น','เซรามิกแฮนด์เมด Earth Tone','เว็บไซต์ร้านอาหาร & โปสเตอร์หนัง',
    'ออกแบบแอป & เว็บโรงแรม Boutique','TikTok สายอาหารเหนือ','รีวิวคาเฟ่สไตล์มินิมอล',
    'ถ่ายสินค้า OTOP & ผ้าทอ','พรีเวดดิ้งสไตล์มินิมอล','ตัดต่อ Vlog ท่องเที่ยว',
    'Motion Graphic อธิบายสินค้า','Sound Design พอดแคสต์','เพลงประกอบโฆษณา',
    'เครื่องประดับเงินแฮนด์เมด','Landing page & E-commerce','ภาพประกอบดิจิทัล & สติกเกอร์',
    'ภาพสตรีท กรุงเทพ & ต่างจังหวัด','วางแผนคอนเทนต์แบรนด์'
  ];
  proj_titles text[] := ARRAY[
    'โลโก้ร้านกาแฟเชียงใหม่ Doi Brew','แบรนด์ดิ้งร้านขนมไทย แม่ละมุน','ภาพประกอบหนังสือเด็ก ช้างน้อยกับดวงดาว',
    'Pattern ผ้าขาวม้าโมเดิร์น','เซรามิกสไตล์มินิมอล Earth Tone','เว็บไซต์ร้านอาหารอีสาน ส้มตำลำซิ่ง',
    'UI App จองคิวสปา Thai Wellness','Landing Page คอร์สเรียนทำขนม','คอนเทนต์ TikTok สายอาหารเหนือ',
    'รีวิวคาเฟ่สไตล์ minimal บน IG','ถ่ายภาพสินค้า OTOP ผ้าทอภาคเหนือ','พรีเวดดิ้งสไตล์มินิมอลเชียงราย',
    'ตัดต่อ Vlog ท่องเที่ยวภาคใต้','Motion Graphic อธิบายสินค้า','Sound Design พอดแคสต์ไทย คุยเรื่องผี',
    'เพลงประกอบโฆษณาแบรนด์ไทย','Mascot น้องหมูเด้ง Pop Art','เครื่องประดับเงินแฮนด์เมด',
    'โปสเตอร์เทศกาลภาพยนตร์อิสระ','เว็บไซต์โรงแรม Boutique หัวหิน'
  ];
  proj_cats text[] := ARRAY[
    'Graphic','Graphic','Illustration','Craft','Craft','Web/UI','Web/UI','Web/UI','Content','Content',
    'Photography','Photography','Video','Video','Music/Audio','Music/Audio','Illustration','Craft','Graphic','Web/UI'
  ];
  proj_prices int[] := ARRAY[3500,8000,12000,6500,4800,18000,22000,9500,3200,2500,7500,15000,8000,12500,4000,18000,9000,2800,5500,35000];
  studio_names text[] := ARRAY[
    'Doi Studio','Lotus Lab','Mango Pixel','Inkwell Co.','Frame & Field',
    'Sundaze Crafts','Soundwave Bangkok','Pixel Garden','Yim Studio','Talay Creative'
  ];
  studio_slugs text[] := ARRAY[
    'doi-studio','lotus-lab','mango-pixel','inkwell-co','frame-field',
    'sundaze-crafts','soundwave-bkk','pixel-garden','yim-studio','talay-creative'
  ];
  demo_email text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'projects'
  ) THEN
    RAISE NOTICE 'seed-catalog: skip — apply supabase/manual/apply-anthem-ecosystem.sql first';
    RETURN;
  END IF;

  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  -- public.profiles.user_id → auth.users(id); create demo auth rows first (SQL Editor / postgres only).
  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    demo_email := usernames[i + 1] || '@demo.an1hem.app';

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      demo_email,
      crypt('an1hem-demo-seed', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('display_name', names[i + 1], 'username', usernames[i + 1]),
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      uid,
      uid,
      jsonb_build_object('sub', uid::text, 'email', demo_email),
      'email',
      uid::text,
      now(),
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    INSERT INTO public.profiles (user_id, display_name, username, email, role, bio, skills, location, avatar_url)
    VALUES (
      uid,
      names[i + 1],
      usernames[i + 1],
      usernames[i + 1] || '@demo.an1hem.app',
      roles[i + 1],
      bios[i + 1],
      CASE i
        WHEN 0 THEN ARRAY['Logo','Branding','Illustrator']
        WHEN 1 THEN ARRAY['Branding','Packaging','Figma']
        WHEN 2 THEN ARRAY['Procreate','Illustration','Character']
        ELSE ARRAY['Design','Creative']
      END,
      CASE WHEN i % 3 = 0 THEN 'Bangkok' WHEN i % 3 = 1 THEN 'Chiang Mai' ELSE 'Phuket' END,
      public.pick_avatar_pool_url_by_seed(usernames[i + 1])
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      username = EXCLUDED.username,
      role = EXCLUDED.role,
      bio = EXCLUDED.bio,
      skills = EXCLUDED.skills,
      location = EXCLUDED.location,
      avatar_url = EXCLUDED.avatar_url;
  END LOOP;

  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    cover := 'https://picsum.photos/seed/an1hem-proj-' || i::text || '/800/600';
    INSERT INTO anthem.projects (
      id, owner_id, title, category, cover_url, gallery_urls, tools, status, views, likes, price_thb, description
    ) VALUES (
      ('00000000-0000-0000-0002-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      uid,
      proj_titles[i + 1],
      proj_cats[i + 1],
      cover,
      ARRAY[cover],
      CASE i
        WHEN 0 THEN ARRAY['Illustrator','Photoshop']
        WHEN 1 THEN ARRAY['Illustrator','Figma']
        WHEN 2 THEN ARRAY['Procreate','Photoshop']
        WHEN 3 THEN ARRAY['Illustrator','Procreate']
        WHEN 4 THEN ARRAY['Lightroom','Photoshop']
        WHEN 5 THEN ARRAY['Figma','Webflow']
        WHEN 6 THEN ARRAY['Figma','Notion']
        WHEN 7 THEN ARRAY['Figma','Webflow']
        WHEN 8 THEN ARRAY['Premiere','CapCut']
        WHEN 9 THEN ARRAY['Lightroom','Canva']
        WHEN 10 THEN ARRAY['Lightroom','Photoshop']
        WHEN 11 THEN ARRAY['Lightroom']
        WHEN 12 THEN ARRAY['Premiere','After Effects']
        WHEN 13 THEN ARRAY['After Effects','Illustrator']
        WHEN 14 THEN ARRAY['Audition','Logic Pro']
        WHEN 15 THEN ARRAY['Logic Pro','Ableton']
        WHEN 16 THEN ARRAY['Procreate','Illustrator']
        WHEN 17 THEN ARRAY['Lightroom']
        WHEN 18 THEN ARRAY['Photoshop','Illustrator']
        ELSE ARRAY['Figma','Webflow']
      END,
      'Published',
      120 + (i * 37) % 900,
      8 + (i * 11) % 120,
      proj_prices[i + 1],
      'ผลงานจากชุมชนครีเอทีฟไทย — โพสต์เพื่อแสดงใน an1hem'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  FOR i IN 0..9 LOOP
    uid := public._catalog_demo_uid(i);
    sid := ('00000000-0000-0000-0001-0000000000' || lpad(to_hex(i), 2, '0'))::uuid;
    INSERT INTO anthem.studios (
      id, slug, name, tagline, bio, avatar_url, cover_url, location, verified, created_by, member_count
    ) VALUES (
      sid,
      studio_slugs[i + 1],
      studio_names[i + 1],
      'สตูดิโอครีเอทีฟไทย',
      'ทีมดีไซน์และคราฟต์จากชุมชน an1hem',
      public.pick_avatar_pool_url_by_seed('studio-' || studio_slugs[i + 1]),
      'https://picsum.photos/seed/an1hem-studio-' || i::text || '/1200/400',
      CASE WHEN i % 2 = 0 THEN 'Bangkok' ELSE 'Chiang Mai' END,
      i % 3 = 0,
      uid,
      1
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO anthem.studio_members (studio_id, user_id, role)
    VALUES (sid, uid, 'owner'::public.studio_member_role)
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR i IN 0..11 LOOP
    sid := ('00000000-0000-0000-0001-0000000000' || lpad(to_hex(i % 10), 2, '0'))::uuid;
    uid := public._catalog_demo_uid(i % 10);
    INSERT INTO anthem.job_posts (
      id, studio_id, posted_by, title, role_category, description, skills,
      budget_min, budget_max, budget_type, location_type, location, status, post_type, poster_role, employment_type
    ) VALUES (
      ('00000000-0000-0000-0003-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      sid,
      uid,
      CASE i
        WHEN 0 THEN 'หา UI Designer ทำแอป Wellness'
        WHEN 1 THEN 'Graphic Designer ทำ Packaging ขนมไทย'
        WHEN 2 THEN 'Brand Designer สำหรับสตาร์ทอัป Fintech'
        WHEN 3 THEN 'Illustrator วาดภาพประกอบหนังสือเด็ก'
        WHEN 4 THEN 'Motion Designer ทำคลิปสินค้า 30 วินาที'
        WHEN 5 THEN 'Photographer ถ่าย Lookbook คอลเลกชันใหม่'
        WHEN 6 THEN 'Webflow Developer สร้าง Landing Page'
        WHEN 7 THEN 'Content Creator สาย TikTok อาหาร'
        WHEN 8 THEN 'Logo Designer สำหรับคลินิกใหม่'
        WHEN 9 THEN 'Wedding Photographer พรีเวดดิ้ง'
        WHEN 10 THEN 'Music Producer เพลง Jingle 10s'
        ELSE 'Senior Designer เข้าทำงานประจำ Studio'
      END,
      'Design',
      'ประกาศงานจากสตูดิโอในชุมชน an1hem',
      ARRAY['Figma','Branding'],
      15000 + i * 2000,
      28000 + i * 3500,
      'fixed',
      CASE WHEN i % 3 = 0 THEN 'remote'::public.job_location_type ELSE 'hybrid'::public.job_location_type END,
      'Bangkok',
      'open',
      'hiring',
      'studio',
      'project'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- Designer Area: 3 community posts per work category (24 total)
  FOR ci IN 0..7 LOOP
    FOR pi IN 0..2 LOOP
      uid := public._catalog_demo_uid((ci * 3 + pi) % 20);
      INSERT INTO anthem.community_posts (
        id, author_id, post_kind, title, body, category, tags,
        gallery_urls, video_urls, question_topic, status,
        reply_count, like_count, view_count
      ) VALUES (
        ('00000000-0000-0000-0004-0000000000' || lpad(to_hex(ci * 3 + pi), 2, '0'))::uuid,
        uid,
        CASE pi
          WHEN 2 THEN 'question'
          ELSE 'tip'
        END,
        CASE ci
          WHEN 0 THEN CASE pi WHEN 0 THEN 'จัด Hierarchy โปสเตอร์ให้อ่านง่ายใน 3 วินาที' WHEN 1 THEN 'เช็กสี Pantone ก่อนส่งไฟล์พิมพ์' ELSE 'ส่งไฟล์โลโก้ให้ลูกค้าแบบไหนดีที่สุด?' END
          WHEN 1 THEN CASE pi WHEN 0 THEN 'Brush 3 ตัวที่ใช้บ่อยใน Procreate' WHEN 1 THEN 'ขอ feedback สไตล์ภาพประกอบ character' ELSE 'ส่ง line art ให้ art director ตรวจก่อนลงสี' END
          WHEN 2 THEN CASE pi WHEN 0 THEN 'ตั้ง White Balance ในสตูดิโอสินค้า' WHEN 1 THEN 'เรตถ่ายพรีเวดดิ้งช่วง low season ควรอยู่ที่เท่าไหร่?' ELSE 'แสงธรรมชาติ vs Softbox สำหรับพอร์ตเทรต' END
          WHEN 3 THEN CASE pi WHEN 0 THEN 'Export Premiere สำหรับ Reels / TikTok' WHEN 1 THEN 'Color grade โทนอบอุ่นแบบ cinematic' ELSE 'Laptop ตัดตอบ 4K แนะนำสเปกเท่าไหร่?' END
          WHEN 4 THEN CASE pi WHEN 0 THEN 'เผาเซรามิกไม่ให้แตก — คุมความชื้นก่อนเข้าเตา' WHEN 1 THEN 'ขายงาน craft ออนไลน์ช่องทางไหนดี?' ELSE 'จัด composition งานจักสานให้ดูพรีเมียม' END
          WHEN 5 THEN CASE pi WHEN 0 THEN 'Figma Auto Layout ที่ใช้บ่อยใน design system' WHEN 1 THEN 'Portfolio web ควรมีกี่โปรเจกต์?' ELSE 'เช็ก contrast ก่อนส่งมอบ UI' END
          WHEN 6 THEN CASE pi WHEN 0 THEN 'Hook 3 วิแรกของ TikTok ที่ยึดคนไว้' WHEN 1 THEN 'โพสต์ IG กี่ครั้งต่อสัปดาห์ถึงจะโต?' ELSE 'เขียน caption ให้คนอ่านจบ' END
          ELSE CASE pi WHEN 0 THEN 'Mix vocal podcast ให้ชัดบนมือถือ' WHEN 1 THEN 'ใช้ sample ในงาน commercial ต้องระวังอะไร?' ELSE 'เลือก BPM ตาม mood board' END
        END,
        'เนื้อหา mock สำหรับ Designer Area — หมวด ' || (ARRAY['Graphic','Illustration','Photography','Video','Craft','Web/UI','Content','Music/Audio'])[ci + 1],
        (ARRAY['Graphic','Illustration','Photography','Video','Craft','Web/UI','Content','Music/Audio'])[ci + 1],
        ARRAY['designer-area', 'seed', 'mock'],
        CASE WHEN pi < 2 THEN ARRAY['https://picsum.photos/seed/an1hem-community-' || ci::text || '-' || pi::text || '/800/1000'] ELSE ARRAY[]::text[] END,
        ARRAY[]::text[],
        CASE WHEN pi = 2 THEN
          CASE ci % 7
            WHEN 0 THEN 'client' WHEN 1 THEN 'feedback' WHEN 2 THEN 'career'
            WHEN 3 THEN 'tools' WHEN 4 THEN 'career' WHEN 5 THEN 'feedback'
            WHEN 6 THEN 'technique' ELSE 'other'
          END
        ELSE NULL END,
        'published',
        (ci + pi) % 5,
        3 + ((ci * 7 + pi * 11) % 40),
        40 + ((ci * 13 + pi * 17) % 350)
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        category = EXCLUDED.category,
        tags = EXCLUDED.tags,
        gallery_urls = EXCLUDED.gallery_urls,
        like_count = EXCLUDED.like_count,
        view_count = EXCLUDED.view_count,
        updated_at = now();
    END LOOP;
  END LOOP;
END;
$seed$;

COMMENT ON FUNCTION public._catalog_demo_uid(integer) IS 'Internal: demo catalog user ids (seed migration only).';
