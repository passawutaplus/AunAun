-- Chiang Mai Design Week 2026: venues as sub-events + slider without open-call pictures
-- (owner request 2026-11-29: "ทำแบบไฮไลท์แรก บอกตามจุด" and "แยก open call ออกไป").
-- • Seeds the festival's 51 official venues under the main CMDW 2026 event, grouped by the
--   festival's own neighbourhoods. Names, addresses and coordinates come from the official programme
--   site (chiangmaidesignweek.com/en/cmdw2026/program, venue list, checked 2026-11-29); festival hours
--   10.00–20.00 as announced by CEA — single venues may differ.
-- • Removes the two open-call pictures (Open Call for Buyers / Open Call for Volunteers) from the
--   main event's slider: the event page is for visiting the festival.
-- Idempotent: a venue already seeded (same name_en under this event) is skipped.

DO $$
DECLARE
  p anthem.events;
  v jsonb;
BEGIN
  SELECT * INTO p FROM anthem.events WHERE id = '034a7990-3489-45cd-8013-09ebcbe34e38';
  IF NOT FOUND THEN RAISE NOTICE 'CMDW 2026 not found — seed skipped'; RETURN; END IF;

  FOR v IN SELECT * FROM jsonb_array_elements($json$[
    {"n":1,"title":"TCDC เชียงใหม่","name_en":"TCDC Chiang Mai","area":"ช้างม่อย–ท่าแพ","address":"1/1 ถ.เมืองสมุทร ต.ช้างม่อย อ.เมือง จ.เชียงใหม่ 50300","lat":18.795354,"lng":98.996389},
    {"n":2,"title":"สมาคมส่งเสริมวัฒนธรรมสตรีศรีลานนาไทย","name_en":"Sri Lanna Thai Women's Culture Promotion Association","area":"ช้างม่อย–ท่าแพ","address":"1 ถ.เมืองสมุทร ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่ 50300","lat":18.795072,"lng":98.996123},
    {"n":3,"title":"The Warehouse - Paint Club","name_en":"The Warehouse - Paint Club","area":"ช้างม่อย–ท่าแพ","address":"153 ถ.ราชวงศ์ ต.ช้างม่อย อ.เมือง จ.เชียงใหม่ 50300","lat":18.79335,"lng":98.99707},
    {"n":4,"title":"สะพานข้ามคลองแม่ข่า","name_en":"Maekha bridge Chang Moi","area":"ช้างม่อย–ท่าแพ","address":"57 ถ.ราชวงศ์ ต.ช้างม่อย อ.เมือง จ.เชียงใหม่ 50300","lat":18.792494,"lng":98.996115},
    {"n":5,"title":"ชุมชนช้างม่อย","name_en":"Chang Moi Community","area":"ช้างม่อย–ท่าแพ","address":"ถ.ช้างม่อย ต.ช้างม่อย อ.เมือง จ.เชียงใหม่ 50300","lat":18.791951,"lng":98.995957},
    {"n":6,"title":"ซิตี้ คราฟท์ สเปซ ท่าแพ","name_en":"City Craft Space Thapae","area":"ช้างม่อย–ท่าแพ","address":"280 ถ.ท่าแพ ต.ช้างม่อย อ.เมือง จ.เชียงใหม่ 50300","lat":18.788458,"lng":98.997048},
    {"n":7,"title":"โรงแรม บูติค ท้ายวัง","name_en":"Boutique Tai Wang Chiang Mai Hotel","area":"ช้างม่อย–ท่าแพ","address":"15 ถ.ท้ายวัง ต.ช้างม่อย อ.เมือง จ.เชียงใหม่ 50300","lat":18.792588,"lng":98.998216},
    {"n":8,"title":"เดอะ กู๊ด เซอร์รี สเปซ","name_en":"The Goodcery Space","area":"ช้างม่อย–ท่าแพ","address":"71 ถ.ราชวงศ์ ต.ช้างม่อย อ.เมือง จ.เชียงใหม่ 50300","lat":18.791561,"lng":98.997874},
    {"n":9,"title":"ลานอนุสาวรีย์สามกษัตริย์","name_en":"Three Kings Monument","area":"กลางเวียง (เมืองเก่า)","address":"ถ.พระปกเกล้า ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่ 50200","lat":18.790232,"lng":98.987353},
    {"n":10,"title":"หอศิลปวัฒนธรรมเมืองเชียงใหม่ (หอกลางเวียง)","name_en":"Chiang Mai City Arts & Cultural Center","area":"กลางเวียง (เมืองเก่า)","address":"ถ.พระปกเกล้า ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่ 50200","lat":18.790239,"lng":98.986917},
    {"n":11,"title":"หอประวัติศาสตร์เมืองเชียงใหม่","name_en":"Chiang Mai Historical Centre","area":"กลางเวียง (เมืองเก่า)","address":"ถ.พระปกเกล้า ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่ 50200","lat":18.790174,"lng":98.986313},
    {"n":12,"title":"หอพื้นถิ่นล้านนา","name_en":"Lanna Folklife Museum","area":"กลางเวียง (เมืองเก่า)","address":"ถ.พระปกเกล้า ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่ 50200","lat":18.790257,"lng":98.988356},
    {"n":13,"title":"ศูนย์สร้างสรรค์เพื่อการพัฒนาเมืองเชียงใหม่","name_en":"The Urban Redevelopment Chiang Mai City","area":"กลางเวียง (เมืองเก่า)","address":"ถ.พระปกเกล้า ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่","lat":18.789909,"lng":98.988351},
    {"n":14,"title":"หอภาพถ่ายล้านนา","name_en":"Chiang Mai House of Photography","area":"กลางเวียง (เมืองเก่า)","address":"ถ.พระปกเกล้า ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่ 50200","lat":18.789879,"lng":98.988535},
    {"n":15,"title":"พิพิธภัณฑ์ธนารักษ์ เชียงใหม่","name_en":"Treasury Pavilion","area":"กลางเวียง (เมืองเก่า)","address":"52 ถ.ราชดำเนิน ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่ 50200","lat":18.78856,"lng":98.988648},
    {"n":16,"title":"ศูนย์สถาปัตยกรรมล้านนา คุ้มเจ้าบุรีรัตน์ (มหาอินทร์)","name_en":"Lanna Architecture Center","area":"กลางเวียง (เมืองเก่า)","address":"117 ถ.ราชดำเนิน ต.พระสิงห์ อ.เมือง จ.เชียงใหม่ 50000","lat":18.787923,"lng":98.9883},
    {"n":17,"title":"โรงแรมวิสต้า เชียงใหม่","name_en":"Vista Hotel Chiangmai","area":"กลางเวียง (เมืองเก่า)","address":"252 ถ.พระปกเกล้า ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่ 50200","lat":18.793615,"lng":98.987892},
    {"n":18,"title":"ร้านเพชร HAPPY GEMS","name_en":"Happy Gems Chiang Mai","area":"กลางเวียง (เมืองเก่า)","address":"104/16 ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่ 50200","lat":18.79567,"lng":98.990208},
    {"n":19,"title":"SOA store of architecture","name_en":"SOA store of architecture","area":"วัดเกต–สันป่าข่อย","address":"49/6-7 ถ.แก้วนวรัฐ ต.ช้างม่อย อ.เมือง จ.เชียงใหม่ 50000","lat":18.794594,"lng":99.002121},
    {"n":20,"title":"ฝ้ายซอคำ","name_en":"Fai Sor Kam","area":"วัดเกต–สันป่าข่อย","address":"69 ถ.เจริญราษฎร์ ต.ช้างม่อย อ.เมือง จ.เชียงใหม่ 50000","lat":18.791496,"lng":99.002698},
    {"n":21,"title":"Sundry by Linnil","name_en":"Sundry by Linnil","area":"วัดเกต–สันป่าข่อย","address":"26 ถ.เจริญเมือง ต.ช้างม่อย อ.เมือง จ.เชียงใหม่ 50000","lat":18.787403,"lng":99.00584},
    {"n":22,"title":"อาคารอนุสาร สันป่าข่อย","name_en":"Anusarn Sanpakoi","area":"วัดเกต–สันป่าข่อย","address":"94-120 ถ.เจริญเมือง ต.วัดเกต อ.เมือง จ.เชียงใหม่ 50000","lat":18.787081,"lng":99.007463},
    {"n":23,"title":"ห่าน สตูดิโอ","name_en":"HAAN Studio","area":"วัดเกต–สันป่าข่อย","address":"144 ถ.เจริญเมือง ต.วัดเกต อ.เมือง จ.เชียงใหม่ 50000","lat":18.786693,"lng":99.007914},
    {"n":24,"title":"กราฟ คอนเทมโพรารี่","name_en":"GRAPH Contemporary","area":"วัดเกต–สันป่าข่อย","address":"177 ถ.เจริญเมือง ต.วัดเกต อ.เมือง จ.เชียงใหม่ 50000","lat":18.78706,"lng":99.008878},
    {"n":25,"title":"โรงแรม ลิตเติ้ล เชลเตอร์","name_en":"Little Shelter","area":"วัดเกต–สันป่าข่อย","address":"208/25 อ.เมือง จ.เชียงใหม่ 50000","lat":18.774181,"lng":99.005198},
    {"n":26,"title":"วิถีลาบ เจริญเมือง","name_en":"Withee Laab Charoen Muang","area":"วัดเกต–สันป่าข่อย","address":"94, 120 ถ.เจริญเมือง ต.ช้างม่อย อ.เมือง จ.เชียงใหม่ 50000","lat":18.786862,"lng":99.007575},
    {"n":27,"title":"สมาคมฝรั่งเศส เชียงใหม่","name_en":"Alliance Française de Chiang Mai","area":"ช้างคลาน–เจริญประเทศ","address":"138 ถ.เจริญประเทศ ต.ช้างคลาน อ.เมือง จ.เชียงใหม่ 50100","lat":18.780898,"lng":99.003525},
    {"n":28,"title":"สกิล อาร์ท เทรนนิ่ง สตูดิโอ","name_en":"Skill Art Training Studio","area":"นิมมานฯ–วัดอุโมงค์","address":"67 ถ.ห้วยแก้ว ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200","lat":18.797434,"lng":98.973027},
    {"n":29,"title":"สวนอัญญา – เฮือนครูองุ่น มาลิก (หอประวัติศาสตร์ประชาชนภาคเหนือ)","name_en":"Suan Anya: Northern People's History Museum","area":"นิมมานฯ–วัดอุโมงค์","address":"1 ซอย 3 ถ.ห้วยแก้ว ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200","lat":18.802988,"lng":98.958043},
    {"n":30,"title":"คณะรัฐศาสตร์และรัฐประศาสนศาสตร์ มหาวิทยาลัยเชียงใหม่","name_en":"Faculty of Political Science and Public Administration, CMU","area":"นิมมานฯ–วัดอุโมงค์","address":"239 ถ.ห้วยแก้ว ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200","lat":18.803128,"lng":98.954782},
    {"n":31,"title":"วัดศรีสุพรรณ","name_en":"Wat Sri Suphan","area":"วัวลาย–หางดง","address":"100 ถ.วัวลาย ต.หายยา อ.เมือง จ.เชียงใหม่ 50100","lat":18.778723,"lng":98.983652},
    {"n":32,"title":"วีฟ อาร์ติซาน โซไซตี้","name_en":"Weave Artisan Society","area":"วัวลาย–หางดง","address":"ถ.วัวลาย ซอย 3 ต.หายยา อ.เมือง จ.เชียงใหม่ 50100","lat":18.776158,"lng":98.986056},
    {"n":33,"title":"เซ็นทรัล เชียงใหม่ แอร์พอร์ต","name_en":"Central Chiangmai Airport","area":"วัวลาย–หางดง","address":"9, 9/1 ต.ป่าแดด อ.เมือง จ.เชียงใหม่ 50200","lat":18.768266,"lng":98.975806},
    {"n":34,"title":"ดี สยาม แอนทีคส์ เชียงใหม่","name_en":"De Siam Antiques Chiangmai","area":"วัวลาย–หางดง","address":"80 ม.8 บ้านถวาย ต.หนองควาย อ.หางดง จ.เชียงใหม่ 50230","lat":18.690292,"lng":98.931253},
    {"n":35,"title":"ญาณิม เซรามิค สตูดิโอ","name_en":"yanim's ceramic studio","area":"สันกำแพง","address":"223 ม.4 ต.ท่าศาลา อ.เมือง จ.เชียงใหม่ 50000","lat":18.769707,"lng":99.03523},
    {"n":36,"title":"โหล่งฮิมคาว","name_en":"Loang Him Kao","area":"สันกำแพง","address":"ต.สันกลาง อ.สันกำแพง จ.เชียงใหม่ 50130","lat":18.785137,"lng":99.047741},
    {"n":37,"title":"ณใจ สเปซ","name_en":"NAJAI Space","area":"สันกำแพง","address":"169 โหล่งฮิมคาว ม.2 ต.สันกลาง อ.สันกำแพง จ.เชียงใหม่ 50130","lat":18.785529,"lng":99.047606},
    {"n":38,"title":"เจมส์ แกลอรี่ เชียงใหม่","name_en":"Gems Gallery Chiang Mai","area":"สันกำแพง","address":"80/1 ม.3 ถ.เชียงใหม่–สันกำแพง ต.สันกลาง อ.สันกำแพง จ.เชียงใหม่ 50130","lat":18.773484,"lng":99.062979},
    {"n":39,"title":"สังกะดีสเปซ","name_en":"Sang ga dee Space","area":"สันกำแพง","address":"อ.สันกำแพง จ.เชียงใหม่ 50130","lat":18.76771,"lng":99.066061},
    {"n":40,"title":"มหาชามเริญ","name_en":"Maha CharmLearn","area":"สันกำแพง","address":"84/3 ม.9 ต.ต้นเปา อ.สันกำแพง จ.เชียงใหม่ 50130","lat":18.752428,"lng":99.08411},
    {"n":41,"title":"พิพิธภัณฑ์ศิลปะร่วมสมัยใหม่เอี่ยม","name_en":"MAIIAM Contemporary Art Museum","area":"สันกำแพง","address":"122 ม.7 ต.ต้นเปา อ.สันกำแพง จ.เชียงใหม่ 50130","lat":18.757245,"lng":99.093692},
    {"n":42,"title":"โรงเรียนสืบสานภูมิปัญญาล้านนา","name_en":"Lanna Wisdoms School","area":"จุดอื่น ๆ ทั่วเชียงใหม่","address":"35 ถ.รัตนโกสินทร์ ต.วัดเกต อ.เมือง จ.เชียงใหม่ 50000","lat":18.801407,"lng":99.007743},
    {"n":43,"title":"โรงแรมศรีประกาศ","name_en":"Sripakad Hotel","area":"จุดอื่น ๆ ทั่วเชียงใหม่","address":"33 ถ.ลำพูน–เชียงใหม่ ต.วัดเกต อ.เมือง จ.เชียงใหม่","lat":18.785809,"lng":99.005212},
    {"n":44,"title":"จริงใจมาร์เก็ต เชียงใหม่","name_en":"Jing Jai Market Chiang Mai","area":"จุดอื่น ๆ ทั่วเชียงใหม่","address":"45 ถ.อัษฎาธร ต.ช้างเผือก อ.เมือง จ.เชียงใหม่ 50300","lat":18.805984,"lng":98.995655},
    {"n":45,"title":"ฮอมปอย ไลฟ์เฮาส์","name_en":"HOM Live House","area":"จุดอื่น ๆ ทั่วเชียงใหม่","address":"ต.ช้างเผือก อ.เมือง จ.เชียงใหม่ 50300","lat":18.810201,"lng":98.995553},
    {"n":46,"title":"วาสุ อาร์ต สเปซ","name_en":"WASOO Art Space","area":"จุดอื่น ๆ ทั่วเชียงใหม่","address":"140 ม.5 ต.สันปูเลย อ.ดอยสะเก็ด จ.เชียงใหม่ 50220","lat":18.816664,"lng":99.072733},
    {"n":47,"title":"Mecani Independent Cinema Chiang Mai","name_en":"Mecani Independent Cinema Chiang Mai","area":"จุดอื่น ๆ ทั่วเชียงใหม่","address":"1380 ม.2 ต.ดอนแก้ว อ.แม่ริม จ.เชียงใหม่ 50180","lat":18.868501,"lng":98.966972},
    {"n":48,"title":"eavam atelier","name_en":"eavam atelier","area":"จุดอื่น ๆ ทั่วเชียงใหม่","address":"286 (SAL Laboratories) ต.หนองหาร อ.สันทราย จ.เชียงใหม่ 50290","lat":18.903743,"lng":99.021951},
    {"n":49,"title":"Empty Space Chiang Mai","name_en":"Empty Space Chiang Mai","area":"จุดอื่น ๆ ทั่วเชียงใหม่","address":"169 ม.5 หมู่บ้านหนองห้า ซอย 7 ต.น้ำบ่อหลวง อ.สันป่าตอง จ.เชียงใหม่ 50120","lat":18.670375,"lng":98.832395},
    {"n":50,"title":"ดิน : เซรามิค สตูดิโอ เชียงใหม่","name_en":"DIN : Ceramic Studio Chiang Mai","area":"จุดอื่น ๆ ทั่วเชียงใหม่","address":"169/3 ต.น้ำบ่อหลวง อ.สันป่าตอง จ.เชียงใหม่ 50120","lat":18.668949,"lng":98.832201},
    {"n":51,"title":"ลาบรื่นโฮมคูซีน","name_en":"LaabReun Home Cuisine","area":"จุดอื่น ๆ ทั่วเชียงใหม่","address":"9/1 ถ.สนามบินเก่า ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200","lat":18.789077,"lng":98.963459}
  ]$json$::jsonb) LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM anthem.events WHERE parent_id = p.id AND name_en = v ->> 'name_en');
    INSERT INTO anthem.events (
      owner_id, parent_id, sort_order, title, name_en, category, origin, status, published_at,
      starts_on, ends_on, location_name, location_note, area, address,
      opening_hours, hours_note, lat, lng, coords_approx, is_special, fee_type,
      source_name, source_url, source_checked_at)
    VALUES (
      p.owner_id, p.id, (v ->> 'n')::smallint, v ->> 'title', v ->> 'name_en', p.category, p.origin, 'published', now(),
      '2026-12-05', '2026-12-13', v ->> 'title', v ->> 'address', v ->> 'area', v ->> 'address',
      '[{"d":[0,1,2,3,4,5,6],"o":"10:00","c":"20:00"}]'::jsonb, 'ช่วงเทศกาล 10.00–20.00 · บางจุดเวลาต่างกัน ดูในโปรแกรม',
      (v ->> 'lat')::double precision, (v ->> 'lng')::double precision, false, false, 'unspecified',
      'Chiang Mai Design Week', 'https://www.chiangmaidesignweek.com/en/cmdw2026/program', '2026-11-29T00:00:00+07');
  END LOOP;

  -- Slider: drop the open-call pictures (both are announcements, not the festival).
  UPDATE anthem.events
     SET gallery_urls = '{}'::text[],
         media_sizes = coalesce(media_sizes, '{}'::jsonb) - coalesce(gallery_urls, '{}'::text[])
   WHERE id = p.id;
END $$;

-- Rollback:
-- DELETE FROM anthem.events WHERE parent_id = '034a7990-3489-45cd-8013-09ebcbe34e38';
-- (the two removed pictures stay in storage: gallery-034a7990-…-1-1793712736195.jpg / -2-1793712736753.png)
