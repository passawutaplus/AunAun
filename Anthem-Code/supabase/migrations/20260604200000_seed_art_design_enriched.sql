-- Enrich demo catalog: art/design imagery, social graph, active feed ads.
-- Demo users: *_catalog_demo_uid(0..19); reviewer passwords are set outside migrations.
-- Delete later: see docs/demo-catalog.md

CREATE OR REPLACE FUNCTION public._unsplash_art(i integer, w int DEFAULT 1200, h int DEFAULT 900)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT format(
    'https://images.unsplash.com/photo-%s?w=%s&h=%s&fit=crop&q=80&auto=format',
    (ARRAY[
      '1618005182384-a83a8bd57fbe','1561070791-2526d30994b5','1558651710-f27954a53d5f',
      '1586281380117-5a60661c0af1','1614851913265-666d915bf4e1','1579762715118-f6fbef7c6f06',
      '1547658710-da2b506961c8','1567095768270-ef49fcc95e5e','1618004912476-29896cc0ceb2',
      '1626785774575-2b0aaee2861b','1555421683-6c7093642474','1542744173-8e7e53410bb0',
      '1513364777864-963864306e9c','1503387762-592deb58ef4e','1497366216543-37526070297c',
      '1558590918-939da22a8ae0','1526311050979-547222c2900b','1557672208-6869b407e35f',
      '1545235617-9465d758bab0','1550740851-d711a55bb799'
    ])[1 + (i % 20)],
    w, h
  );
$$;

DO $enrich$
DECLARE
  i int;
  j int;
  uid uuid;
  pid uuid;
  sid uuid;
  cover text;
  gal text[];
  follower uuid;
  descriptions text[] := ARRAY[
    'ชุดโลโก้และ visual identity สำหรับร้านกาแฟสเปเชียลตี้ เชียงใหม่ โทนสีน้ำตาล–ครีม ฟอนต์ sans อ่านง่าย ใช้งานได้ทั้งป้ายและแก้ว',
    'รีแบรนด์ร้านขนมไทย premium: กล่อง, ถุง, และ social template สไตล์ contemporary Thai',
    'ภาพประกอบหนังสือเด็ก 12 หน้า สไตล์ watercolour นุ่ม ตัวละครช้างน้อยเดินทางในป่า',
    'ลายผ้าขาวม้าโมเดิร์น จาก motif ดอกบัวและเส้นสายเรขาคณิต เหมาะกับแฟชั่นและของใช้',
    'คอลเลกชันเซรามิก 8 ชิ้น earth tone มือทอ เคลือบด้าน สำหรับจัดแสดงและขาย online',
    'เว็บไซต์ร้านอาหารอีสาน + โปสเตอร์โปรโมชัน สีสด เน้นภาพอาหารจริง responsive mobile-first',
    'UI/UX แอปจองสปา 14 หน้าจอ flow จอง–ชำระ–รีวิว design system สีเขียวมินต์',
    'Landing page คอร์สอบขนม โครง conversion-focused hero + curriculum + testimonial',
    'ตัวอย่างคอนเทนต์ TikTok 9:16 สายอาหารเหนือ hook แรง 3s แรก',
    'ชุดภาพรีวิวคาเฟ่ 12 ภาพ โทนมินิมอล natural light สำหรับ IG carousel',
    'ถ่ายสินค้า OTOP ผ้าทอ 20 ชิ้น white backdrop + lifestyle 2 มุมต่อ SKU',
    'พรีเวดดิ้งเชียงราย 80 ภาพ documentary โทนอบอุ่น film look',
    'ตัดต่อ vlog ท่องเที่ยว 8 นาที pacing เร็ว subtitle ไทย–อังกฤษ',
    'Motion graphic 30 วินาที อธิบายสินค้า tech สไตล์ flat + icon animation',
    'Sound design เปิด–เนื้อหา–ปิด podcast 45 นาที ambient ไทย contemporary',
    'Jingle 10 วินาที แบรนด์อาหาร จังหวะสนุก ใช้ซ้ำได้หลายแคมเปญ',
    'Mascot น้องหมูเด้ง ชุด sticker LINE + key visual campaign',
    'เครื่องประดับเงิน 6 ชิ้น lookbook มืด เน้น texture และ reflection',
    'โปสเตอร์เทศกาลหนังอิสระ A2 limited colour screen-print aesthetic',
    'เว็บไซต์โรงแรม boutique หัวหิน ภาษาไทย–อังกฤษ booking widget + gallery fullscreen'
  ];
BEGIN
  -- Profiles: art-forward avatars + cover
  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    UPDATE public.profiles p SET
      avatar_url = 'https://api.dicebear.com/7.x/notionists/svg?seed=' || COALESCE(p.username, 'user' || i::text) || '&backgroundColor=f5f0e8,e8dcc8',
      cover_url = public._unsplash_art(i + 3, 1600, 500)
    WHERE p.id = uid;
  END LOOP;

  -- Projects: art/design Unsplash galleries + rich copy
  FOR i IN 0..19 LOOP
    uid := public._catalog_demo_uid(i);
    pid := ('00000000-0000-0000-0002-0000000000' || lpad(to_hex(i), 2, '0'))::uuid;
    cover := public._unsplash_art(i, 1200, 900);
    gal := ARRAY[
      cover,
      public._unsplash_art(i + 5, 1200, 900),
      public._unsplash_art(i + 11, 1200, 900)
    ];
    UPDATE public.projects SET
      cover_url = cover,
      gallery_urls = gal,
      description = descriptions[i + 1],
      views = 280 + (i * 53) % 2400,
      likes = 24 + (i * 17) % 180
    WHERE id = pid;
  END LOOP;

  -- Studios: design-studio imagery
  FOR i IN 0..9 LOOP
    sid := ('00000000-0000-0000-0001-0000000000' || lpad(to_hex(i), 2, '0'))::uuid;
    UPDATE public.studios s SET
      cover_url = public._unsplash_art(i + 2, 1600, 500),
      avatar_url = 'https://api.dicebear.com/7.x/shapes/svg?seed=studio-' || s.slug || '&backgroundColor=e8f4f8,f0e6ff',
      tagline = CASE i
        WHEN 0 THEN 'Branding & Identity สำหรับ F&B และ lifestyle'
        WHEN 1 THEN 'Illustration & Character Design'
        WHEN 2 THEN 'Digital Product & UI Studio'
        WHEN 3 THEN 'Print & Editorial Design'
        WHEN 4 THEN 'Photo & Motion for brands'
        ELSE 'Creative collective — art direction to delivery'
      END
    WHERE s.id = sid;
  END LOOP;

  -- Social: follows (ring + cross)
  FOR i IN 0..19 LOOP
    follower := public._catalog_demo_uid(i);
    uid := public._catalog_demo_uid((i + 1) % 20);
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (follower, uid)
    ON CONFLICT DO NOTHING;
    IF i % 3 = 0 THEN
      uid := public._catalog_demo_uid((i + 7) % 20);
      INSERT INTO public.follows (follower_id, following_id)
      VALUES (follower, uid)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Likes on projects (spread across users)
  FOR i IN 0..19 LOOP
    pid := ('00000000-0000-0000-0002-0000000000' || lpad(to_hex(i), 2, '0'))::uuid;
    FOR j IN 1..4 LOOP
      uid := public._catalog_demo_uid((i + j) % 20);
      INSERT INTO public.project_likes (project_id, user_id)
      VALUES (pid, uid)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- Active ad campaigns (feed cards)
  FOR i IN 0..5 LOOP
    uid := public._catalog_demo_uid(i * 3);
    INSERT INTO public.ad_campaigns (
      id, advertiser_user_id, title, tagline, image_url, target_url, cta_label,
      package, price_px, status, start_at, end_at, impressions, clicks, promotion_text
    ) VALUES (
      ('00000000-0000-0000-0004-0000000000' || lpad(to_hex(i), 2, '0'))::uuid,
      uid,
      (ARRAY[
        'Figma Pro สำหรับดีไซเนอร์ไทย',
        'คอร์ส Branding มืออาชีพ 2026',
        'พิมพ์โปสเตอร์ A2 ราคาสตูดิโอ',
        'จ้าง Illustrator ภายใน 48 ชม.',
        'Anthem Premium — โปรไฟล์เด่นบนฟีด',
        'สต็อกฟอนต์ไทย Commercial'
      ])[i + 1],
      (ARRAY[
        'เครื่องมือที่ทีมออกแบบใช้จริง',
        'เรียน identity จากเคสจริง 8 สัปดาห์',
        'กระดาษอาร์ต สีสม่ำเสมอ',
        'ทีม curated จากชุมชน Anthem',
        'เพิ่มการมองเห็นผลงาน 3×',
        'ไทยโมเดิร์น อ่านง่ายทุกขนาด'
      ])[i + 1],
      public._unsplash_art(i + 15, 800, 600),
      'https://anthem.app/advertise',
      (ARRAY['ลองใช้ฟรี','ดูรายละเอียด','ขอใบเสนอราคา','สมัครเลย','อัปเกรด','ดาวน์โหลด'])[i + 1],
      CASE WHEN i < 2 THEN 'basic'::public.ad_package WHEN i < 4 THEN 'standard'::public.ad_package ELSE 'premium'::public.ad_package END,
      500 + i * 200,
      'active',
      now() - interval '2 days',
      now() + interval '60 days',
      400 + i * 120,
      12 + i * 3,
      'โฆษณาตัวอย่าง — ข้อมูล demo'
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      tagline = EXCLUDED.tagline,
      image_url = EXCLUDED.image_url,
      status = 'active',
      end_at = EXCLUDED.end_at,
      promotion_text = EXCLUDED.promotion_text;
  END LOOP;

  -- Sample ad applications (approved history)
  uid := public._catalog_demo_uid(0);
  INSERT INTO public.ad_applications (
    id, user_id, contact_name, email, phone, company, website,
    ad_title, ad_tagline, ad_description, image_url, target_url, cta_label,
    package, duration_days, budget_px, status, reviewed_at
  ) VALUES (
    '00000000-0000-0000-0004-0000000000a0'::uuid,
    uid,
    'ภัสวุฒิ ศรีวงค์',
    'phatsawut@demo.an1hem.app',
    '0812345678',
    'Doi Design Co.',
    'https://anthem.app',
    'โปรโมทพอร์ตโฟลี่โลโก้',
    'รับจ้างออกแบบแบรนด์ครบวงจร',
    'ต้องการเพิ่มลูกค้า SME ในภาคเหนือ',
    public._unsplash_art(0, 800, 600),
    '/u/' || uid::text,
    'ดูผลงาน',
    'standard',
    14,
    1200,
    'approved',
    now() - interval '5 days'
  )
  ON CONFLICT (id) DO NOTHING;

END;
$enrich$;

COMMENT ON FUNCTION public._unsplash_art(integer, int, int) IS 'Demo seed: Unsplash art/design image URL by index.';
