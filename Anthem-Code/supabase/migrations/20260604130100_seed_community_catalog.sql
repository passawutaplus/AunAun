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
    'à¸ à¸±à¸ªà¸§à¸¸à¸’à¸´ à¸¨à¸£à¸µà¸§à¸‡à¸„à¹Œ','à¸™à¸ à¸±à¸ªà¸£à¸² à¸—à¸­à¸‡à¸”à¸µ','à¸žà¸´à¸¡à¸žà¹Œà¸Šà¸™à¸ à¹ƒà¸ˆà¸”à¸µ','à¸§à¸£à¸£à¸“à¸à¸£ à¸žà¸±à¸™à¸˜à¹Œà¸—à¸­à¸‡','à¸˜à¸±à¸à¸à¸² à¸£à¸±à¸•à¸™à¸žà¸£',
    'à¸‰à¸±à¸•à¸£à¸Šà¸±à¸¢ à¸§à¸£à¸à¸¸à¸¥','à¸­à¸²à¸—à¸´à¸•à¸¢à¸² à¸ˆà¸±à¸™à¸—à¸£à¹Œà¹€à¸žà¹‡à¸','à¸žà¸¥à¸­à¸¢à¹„à¸žà¸¥à¸´à¸™ à¸‚à¸ˆà¸£','à¸˜à¸™à¸à¸£ à¹à¸ªà¸‡à¸—à¸­à¸‡','à¸­à¸™à¸¸à¸Šà¸² à¸ à¸¹à¸¡à¸´à¸”à¸µ',
    'à¸›à¸²à¸£à¸´à¸Šà¸²à¸• à¸ªà¸§à¸¢à¸‡à¸²à¸¡','à¹€à¸ˆà¸©à¸Žà¸² à¸—à¹ˆà¸­à¸‡à¹€à¸—à¸µà¹ˆà¸¢à¸§','à¸ªà¸¸à¸žà¸±à¸•à¸£à¸² à¹‚à¸¡à¸Šà¸±à¹ˆà¸™','à¸§à¸—à¸±à¸à¸à¸¹ à¹€à¸ªà¸µà¸¢à¸‡à¸”à¸µ','à¸à¸¤à¸©à¸“à¸² à¹€à¸¡à¹‚à¸¥à¸”à¸µà¹‰',
    'à¸¨à¸´à¸£à¸´à¸žà¸£ à¹€à¸‡à¸´à¸™à¸‡à¸²à¸¡','à¸à¸´à¸•à¸•à¸´à¸žà¸‡à¸©à¹Œ à¸”à¸´à¸ˆà¸´à¸—à¸±à¸¥','à¸¡à¸™à¸±à¸ªà¸™à¸±à¸™à¸—à¹Œ à¸­à¸²à¸£à¹Œà¸•','à¸“à¸±à¸à¸§à¸¸à¸’à¸´ à¸ à¸²à¸žà¸–à¹ˆà¸²à¸¢','à¸ à¸±à¸—à¸£à¸²à¸™à¸´à¸©à¸à¹Œ à¸„à¸­à¸™à¹€à¸—à¸™à¸•à¹Œ'
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
    'à¸­à¸­à¸à¹à¸šà¸šà¹‚à¸¥à¹‚à¸à¹‰ & à¹à¸šà¸£à¸™à¸”à¹Œà¸”à¸´à¹‰à¸‡à¸ªà¹„à¸•à¸¥à¹Œà¸¡à¸´à¸™à¸´à¸¡à¸­à¸¥','à¸ªà¸£à¹‰à¸²à¸‡à¹à¸šà¸£à¸™à¸”à¹Œà¸‚à¸™à¸¡à¹„à¸—à¸¢à¹à¸¥à¸°à¸£à¹‰à¸²à¸™à¸„à¸²à¹€à¸Ÿà¹ˆ','à¸ à¸²à¸žà¸›à¸£à¸°à¸à¸­à¸šà¹€à¸”à¹‡à¸ & Pop Art',
    'à¸¥à¸²à¸¢à¸œà¹‰à¸²à¹„à¸—à¸¢à¸ªà¹„à¸•à¸¥à¹Œà¹‚à¸¡à¹€à¸”à¸´à¸£à¹Œà¸™','à¹€à¸‹à¸£à¸²à¸¡à¸´à¸à¹à¸®à¸™à¸”à¹Œà¹€à¸¡à¸” Earth Tone','à¹€à¸§à¹‡à¸šà¹„à¸‹à¸•à¹Œà¸£à¹‰à¸²à¸™à¸­à¸²à¸«à¸²à¸£ & à¹‚à¸›à¸ªà¹€à¸•à¸­à¸£à¹Œà¸«à¸™à¸±à¸‡',
    'à¸­à¸­à¸à¹à¸šà¸šà¹à¸­à¸› & à¹€à¸§à¹‡à¸šà¹‚à¸£à¸‡à¹à¸£à¸¡ Boutique','TikTok à¸ªà¸²à¸¢à¸­à¸²à¸«à¸²à¸£à¹€à¸«à¸™à¸·à¸­','à¸£à¸µà¸§à¸´à¸§à¸„à¸²à¹€à¸Ÿà¹ˆà¸ªà¹„à¸•à¸¥à¹Œà¸¡à¸´à¸™à¸´à¸¡à¸­à¸¥',
    'à¸–à¹ˆà¸²à¸¢à¸ªà¸´à¸™à¸„à¹‰à¸² OTOP & à¸œà¹‰à¸²à¸—à¸­','à¸žà¸£à¸µà¹€à¸§à¸”à¸”à¸´à¹‰à¸‡à¸ªà¹„à¸•à¸¥à¹Œà¸¡à¸´à¸™à¸´à¸¡à¸­à¸¥','à¸•à¸±à¸”à¸•à¹ˆà¸­ Vlog à¸—à¹ˆà¸­à¸‡à¹€à¸—à¸µà¹ˆà¸¢à¸§',
    'Motion Graphic à¸­à¸˜à¸´à¸šà¸²à¸¢à¸ªà¸´à¸™à¸„à¹‰à¸²','Sound Design à¸žà¸­à¸”à¹à¸„à¸ªà¸•à¹Œ','à¹€à¸žà¸¥à¸‡à¸›à¸£à¸°à¸à¸­à¸šà¹‚à¸†à¸©à¸“à¸²',
    'à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸›à¸£à¸°à¸”à¸±à¸šà¹€à¸‡à¸´à¸™à¹à¸®à¸™à¸”à¹Œà¹€à¸¡à¸”','Landing page & E-commerce','à¸ à¸²à¸žà¸›à¸£à¸°à¸à¸­à¸šà¸”à¸´à¸ˆà¸´à¸—à¸±à¸¥ & à¸ªà¸•à¸´à¸à¹€à¸à¸­à¸£à¹Œ',
    'à¸ à¸²à¸žà¸ªà¸•à¸£à¸µà¸— à¸à¸£à¸¸à¸‡à¹€à¸—à¸ž & à¸•à¹ˆà¸²à¸‡à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”','à¸§à¸²à¸‡à¹à¸œà¸™à¸„à¸­à¸™à¹€à¸—à¸™à¸•à¹Œà¹à¸šà¸£à¸™à¸”à¹Œ'
  ];
  proj_titles text[] := ARRAY[
    'à¹‚à¸¥à¹‚à¸à¹‰à¸£à¹‰à¸²à¸™à¸à¸²à¹à¸Ÿà¹€à¸Šà¸µà¸¢à¸‡à¹ƒà¸«à¸¡à¹ˆ Doi Brew','à¹à¸šà¸£à¸™à¸”à¹Œà¸”à¸´à¹‰à¸‡à¸£à¹‰à¸²à¸™à¸‚à¸™à¸¡à¹„à¸—à¸¢ à¹à¸¡à¹ˆà¸¥à¸°à¸¡à¸¸à¸™','à¸ à¸²à¸žà¸›à¸£à¸°à¸à¸­à¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹€à¸”à¹‡à¸ à¸Šà¹‰à¸²à¸‡à¸™à¹‰à¸­à¸¢à¸à¸±à¸šà¸”à¸§à¸‡à¸”à¸²à¸§',
    'Pattern à¸œà¹‰à¸²à¸‚à¸²à¸§à¸¡à¹‰à¸²à¹‚à¸¡à¹€à¸”à¸´à¸£à¹Œà¸™','à¹€à¸‹à¸£à¸²à¸¡à¸´à¸à¸ªà¹„à¸•à¸¥à¹Œà¸¡à¸´à¸™à¸´à¸¡à¸­à¸¥ Earth Tone','à¹€à¸§à¹‡à¸šà¹„à¸‹à¸•à¹Œà¸£à¹‰à¸²à¸™à¸­à¸²à¸«à¸²à¸£à¸­à¸µà¸ªà¸²à¸™ à¸ªà¹‰à¸¡à¸•à¸³à¸¥à¸³à¸‹à¸´à¹ˆà¸‡',
    'UI App à¸ˆà¸­à¸‡à¸„à¸´à¸§à¸ªà¸›à¸² Thai Wellness','Landing Page à¸„à¸­à¸£à¹Œà¸ªà¹€à¸£à¸µà¸¢à¸™à¸—à¸³à¸‚à¸™à¸¡','à¸„à¸­à¸™à¹€à¸—à¸™à¸•à¹Œ TikTok à¸ªà¸²à¸¢à¸­à¸²à¸«à¸²à¸£à¹€à¸«à¸™à¸·à¸­',
    'à¸£à¸µà¸§à¸´à¸§à¸„à¸²à¹€à¸Ÿà¹ˆà¸ªà¹„à¸•à¸¥à¹Œ minimal à¸šà¸™ IG','à¸–à¹ˆà¸²à¸¢à¸ à¸²à¸žà¸ªà¸´à¸™à¸„à¹‰à¸² OTOP à¸œà¹‰à¸²à¸—à¸­à¸ à¸²à¸„à¹€à¸«à¸™à¸·à¸­','à¸žà¸£à¸µà¹€à¸§à¸”à¸”à¸´à¹‰à¸‡à¸ªà¹„à¸•à¸¥à¹Œà¸¡à¸´à¸™à¸´à¸¡à¸­à¸¥à¹€à¸Šà¸µà¸¢à¸‡à¸£à¸²à¸¢',
    'à¸•à¸±à¸”à¸•à¹ˆà¸­ Vlog à¸—à¹ˆà¸­à¸‡à¹€à¸—à¸µà¹ˆà¸¢à¸§à¸ à¸²à¸„à¹ƒà¸•à¹‰','Motion Graphic à¸­à¸˜à¸´à¸šà¸²à¸¢à¸ªà¸´à¸™à¸„à¹‰à¸²','Sound Design à¸žà¸­à¸”à¹à¸„à¸ªà¸•à¹Œà¹„à¸—à¸¢ à¸„à¸¸à¸¢à¹€à¸£à¸·à¹ˆà¸­à¸‡à¸œà¸µ',
    'à¹€à¸žà¸¥à¸‡à¸›à¸£à¸°à¸à¸­à¸šà¹‚à¸†à¸©à¸“à¸²à¹à¸šà¸£à¸™à¸”à¹Œà¹„à¸—à¸¢','Mascot à¸™à¹‰à¸­à¸‡à¸«à¸¡à¸¹à¹€à¸”à¹‰à¸‡ Pop Art','à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸›à¸£à¸°à¸”à¸±à¸šà¹€à¸‡à¸´à¸™à¹à¸®à¸™à¸”à¹Œà¹€à¸¡à¸”',
    'à¹‚à¸›à¸ªà¹€à¸•à¸­à¸£à¹Œà¹€à¸—à¸¨à¸à¸²à¸¥à¸ à¸²à¸žà¸¢à¸™à¸•à¸£à¹Œà¸­à¸´à¸ªà¸£à¸°','à¹€à¸§à¹‡à¸šà¹„à¸‹à¸•à¹Œà¹‚à¸£à¸‡à¹à¸£à¸¡ Boutique à¸«à¸±à¸§à¸«à¸´à¸™'
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
    RAISE NOTICE 'seed-catalog: skip â€” apply supabase/manual/apply-anthem-ecosystem.sql first';
    RETURN;
  END IF;

  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  -- public.profiles.user_id â†’ auth.users(id); create demo auth rows first (SQL Editor / postgres only).
  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    demo_email := usernames[i + 1] || '@demo.pixel100.com';

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      demo_email,
      crypt('pixel100-demo-seed', gen_salt('bf')),
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
      usernames[i + 1] || '@demo.pixel100.com',
      roles[i + 1],
      bios[i + 1],
      CASE i
        WHEN 0 THEN ARRAY['Logo','Branding','Illustrator']
        WHEN 1 THEN ARRAY['Branding','Packaging','Figma']
        WHEN 2 THEN ARRAY['Procreate','Illustration','Character']
        ELSE ARRAY['Design','Creative']
      END,
      CASE WHEN i % 3 = 0 THEN 'Bangkok' WHEN i % 3 = 1 THEN 'Chiang Mai' ELSE 'Phuket' END,
      public.format('https://api.dicebear.com/7.x/notionists/svg?seed=%s&backgroundColor=f5f0e8,e8dcc8', usernames[i + 1])
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
      'à¸œà¸¥à¸‡à¸²à¸™à¸ˆà¸²à¸à¸Šà¸¸à¸¡à¸Šà¸™à¸„à¸£à¸µà¹€à¸­à¸—à¸µà¸Ÿà¹„à¸—à¸¢ â€” à¹‚à¸žà¸ªà¸•à¹Œà¹€à¸žà¸·à¹ˆà¸­à¹à¸ªà¸”à¸‡à¹ƒà¸™ an1hem'
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
      'à¸ªà¸•à¸¹à¸”à¸´à¹‚à¸­à¸„à¸£à¸µà¹€à¸­à¸—à¸µà¸Ÿà¹„à¸—à¸¢',
      'à¸—à¸µà¸¡à¸”à¸µà¹„à¸‹à¸™à¹Œà¹à¸¥à¸°à¸„à¸£à¸²à¸Ÿà¸•à¹Œà¸ˆà¸²à¸à¸Šà¸¸à¸¡à¸Šà¸™ an1hem',
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
        WHEN 0 THEN 'à¸«à¸² UI Designer à¸—à¸³à¹à¸­à¸› Wellness'
        WHEN 1 THEN 'Graphic Designer à¸—à¸³ Packaging à¸‚à¸™à¸¡à¹„à¸—à¸¢'
        WHEN 2 THEN 'Brand Designer à¸ªà¸³à¸«à¸£à¸±à¸šà¸ªà¸•à¸²à¸£à¹Œà¸—à¸­à¸±à¸› Fintech'
        WHEN 3 THEN 'Illustrator à¸§à¸²à¸”à¸ à¸²à¸žà¸›à¸£à¸°à¸à¸­à¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹€à¸”à¹‡à¸'
        WHEN 4 THEN 'Motion Designer à¸—à¸³à¸„à¸¥à¸´à¸›à¸ªà¸´à¸™à¸„à¹‰à¸² 30 à¸§à¸´à¸™à¸²à¸—à¸µ'
        WHEN 5 THEN 'Photographer à¸–à¹ˆà¸²à¸¢ Lookbook à¸„à¸­à¸¥à¹€à¸¥à¸à¸Šà¸±à¸™à¹ƒà¸«à¸¡à¹ˆ'
        WHEN 6 THEN 'Webflow Developer à¸ªà¸£à¹‰à¸²à¸‡ Landing Page'
        WHEN 7 THEN 'Content Creator à¸ªà¸²à¸¢ TikTok à¸­à¸²à¸«à¸²à¸£'
        WHEN 8 THEN 'Logo Designer à¸ªà¸³à¸«à¸£à¸±à¸šà¸„à¸¥à¸´à¸™à¸´à¸à¹ƒà¸«à¸¡à¹ˆ'
        WHEN 9 THEN 'Wedding Photographer à¸žà¸£à¸µà¹€à¸§à¸”à¸”à¸´à¹‰à¸‡'
        WHEN 10 THEN 'Music Producer à¹€à¸žà¸¥à¸‡ Jingle 10s'
        ELSE 'Senior Designer à¹€à¸‚à¹‰à¸²à¸—à¸³à¸‡à¸²à¸™à¸›à¸£à¸°à¸ˆà¸³ Studio'
      END,
      'Design',
      'à¸›à¸£à¸°à¸à¸²à¸¨à¸‡à¸²à¸™à¸ˆà¸²à¸à¸ªà¸•à¸¹à¸”à¸´à¹‚à¸­à¹ƒà¸™à¸Šà¸¸à¸¡à¸Šà¸™ an1hem',
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
          WHEN 0 THEN CASE pi WHEN 0 THEN 'à¸ˆà¸±à¸” Hierarchy à¹‚à¸›à¸ªà¹€à¸•à¸­à¸£à¹Œà¹ƒà¸«à¹‰à¸­à¹ˆà¸²à¸™à¸‡à¹ˆà¸²à¸¢à¹ƒà¸™ 3 à¸§à¸´à¸™à¸²à¸—à¸µ' WHEN 1 THEN 'à¹€à¸Šà¹‡à¸à¸ªà¸µ Pantone à¸à¹ˆà¸­à¸™à¸ªà¹ˆà¸‡à¹„à¸Ÿà¸¥à¹Œà¸žà¸´à¸¡à¸žà¹Œ' ELSE 'à¸ªà¹ˆà¸‡à¹„à¸Ÿà¸¥à¹Œà¹‚à¸¥à¹‚à¸à¹‰à¹ƒà¸«à¹‰à¸¥à¸¹à¸à¸„à¹‰à¸²à¹à¸šà¸šà¹„à¸«à¸™à¸”à¸µà¸—à¸µà¹ˆà¸ªà¸¸à¸”?' END
          WHEN 1 THEN CASE pi WHEN 0 THEN 'Brush 3 à¸•à¸±à¸§à¸—à¸µà¹ˆà¹ƒà¸Šà¹‰à¸šà¹ˆà¸­à¸¢à¹ƒà¸™ Procreate' WHEN 1 THEN 'à¸‚à¸­ feedback à¸ªà¹„à¸•à¸¥à¹Œà¸ à¸²à¸žà¸›à¸£à¸°à¸à¸­à¸š character' ELSE 'à¸ªà¹ˆà¸‡ line art à¹ƒà¸«à¹‰ art director à¸•à¸£à¸§à¸ˆà¸à¹ˆà¸­à¸™à¸¥à¸‡à¸ªà¸µ' END
          WHEN 2 THEN CASE pi WHEN 0 THEN 'à¸•à¸±à¹‰à¸‡ White Balance à¹ƒà¸™à¸ªà¸•à¸¹à¸”à¸´à¹‚à¸­à¸ªà¸´à¸™à¸„à¹‰à¸²' WHEN 1 THEN 'à¹€à¸£à¸•à¸–à¹ˆà¸²à¸¢à¸žà¸£à¸µà¹€à¸§à¸”à¸”à¸´à¹‰à¸‡à¸Šà¹ˆà¸§à¸‡ low season à¸„à¸§à¸£à¸­à¸¢à¸¹à¹ˆà¸—à¸µà¹ˆà¹€à¸—à¹ˆà¸²à¹„à¸«à¸£à¹ˆ?' ELSE 'à¹à¸ªà¸‡à¸˜à¸£à¸£à¸¡à¸Šà¸²à¸•à¸´ vs Softbox à¸ªà¸³à¸«à¸£à¸±à¸šà¸žà¸­à¸£à¹Œà¸•à¹€à¸—à¸£à¸•' END
          WHEN 3 THEN CASE pi WHEN 0 THEN 'Export Premiere à¸ªà¸³à¸«à¸£à¸±à¸š Reels / TikTok' WHEN 1 THEN 'Color grade à¹‚à¸—à¸™à¸­à¸šà¸­à¸¸à¹ˆà¸™à¹à¸šà¸š cinematic' ELSE 'Laptop à¸•à¸±à¸”à¸•à¸­à¸š 4K à¹à¸™à¸°à¸™à¸³à¸ªà¹€à¸›à¸à¹€à¸—à¹ˆà¸²à¹„à¸«à¸£à¹ˆ?' END
          WHEN 4 THEN CASE pi WHEN 0 THEN 'à¹€à¸œà¸²à¹€à¸‹à¸£à¸²à¸¡à¸´à¸à¹„à¸¡à¹ˆà¹ƒà¸«à¹‰à¹à¸•à¸ â€” à¸„à¸¸à¸¡à¸„à¸§à¸²à¸¡à¸Šà¸·à¹‰à¸™à¸à¹ˆà¸­à¸™à¹€à¸‚à¹‰à¸²à¹€à¸•à¸²' WHEN 1 THEN 'à¸‚à¸²à¸¢à¸‡à¸²à¸™ craft à¸­à¸­à¸™à¹„à¸¥à¸™à¹Œà¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¹„à¸«à¸™à¸”à¸µ?' ELSE 'à¸ˆà¸±à¸” composition à¸‡à¸²à¸™à¸ˆà¸±à¸à¸ªà¸²à¸™à¹ƒà¸«à¹‰à¸”à¸¹à¸žà¸£à¸µà¹€à¸¡à¸µà¸¢à¸¡' END
          WHEN 5 THEN CASE pi WHEN 0 THEN 'Figma Auto Layout à¸—à¸µà¹ˆà¹ƒà¸Šà¹‰à¸šà¹ˆà¸­à¸¢à¹ƒà¸™ design system' WHEN 1 THEN 'Portfolio web à¸„à¸§à¸£à¸¡à¸µà¸à¸µà¹ˆà¹‚à¸›à¸£à¹€à¸ˆà¸à¸•à¹Œ?' ELSE 'à¹€à¸Šà¹‡à¸ contrast à¸à¹ˆà¸­à¸™à¸ªà¹ˆà¸‡à¸¡à¸­à¸š UI' END
          WHEN 6 THEN CASE pi WHEN 0 THEN 'Hook 3 à¸§à¸´à¹à¸£à¸à¸‚à¸­à¸‡ TikTok à¸—à¸µà¹ˆà¸¢à¸¶à¸”à¸„à¸™à¹„à¸§à¹‰' WHEN 1 THEN 'à¹‚à¸žà¸ªà¸•à¹Œ IG à¸à¸µà¹ˆà¸„à¸£à¸±à¹‰à¸‡à¸•à¹ˆà¸­à¸ªà¸±à¸›à¸”à¸²à¸«à¹Œà¸–à¸¶à¸‡à¸ˆà¸°à¹‚à¸•?' ELSE 'à¹€à¸‚à¸µà¸¢à¸™ caption à¹ƒà¸«à¹‰à¸„à¸™à¸­à¹ˆà¸²à¸™à¸ˆà¸š' END
          ELSE CASE pi WHEN 0 THEN 'Mix vocal podcast à¹ƒà¸«à¹‰à¸Šà¸±à¸”à¸šà¸™à¸¡à¸·à¸­à¸–à¸·à¸­' WHEN 1 THEN 'à¹ƒà¸Šà¹‰ sample à¹ƒà¸™à¸‡à¸²à¸™ commercial à¸•à¹‰à¸­à¸‡à¸£à¸°à¸§à¸±à¸‡à¸­à¸°à¹„à¸£?' ELSE 'à¹€à¸¥à¸·à¸­à¸ BPM à¸•à¸²à¸¡ mood board' END
        END,
        'à¹€à¸™à¸·à¹‰à¸­à¸«à¸² mock à¸ªà¸³à¸«à¸£à¸±à¸š Designer Area â€” à¸«à¸¡à¸§à¸” ' || (ARRAY['Graphic','Illustration','Photography','Video','Craft','Web/UI','Content','Music/Audio'])[ci + 1],
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

