-- SAMECOR event scout batch 2026-11-28
SELECT public.scout_event_publish($j$
{
  "scout_batch": "2026-11-28",
  "title": "Gifts in Making: Chocolate Bar Painting with Kad Kokoa",
  "category": "workshop",
  "starts_on": "2026-12-13",
  "ends_on": "2026-12-13",
  "time_note": "10:00–12:00 น.",
  "location_name": "Longspan Gallery, Dib Bangkok",
  "location_note": "ลงทะเบียน 09:30–10:00 น.",
  "description": "เวิร์กช็อปจาก Dib Bangkok ร่วมกับ Kad Kokoa ที่ชวนทุกคนมาลงสีและตกแต่งช็อกโกแลตแท่งของตัวเองให้กลายเป็นของขวัญชิ้นพิเศษ\n\nผู้เข้าร่วมจะได้เรียนรู้พื้นฐานเกี่ยวกับช็อกโกแลตก่อน จากนั้นเลือกแม่พิมพ์ขนาด 20 กรัมหรือ 47 กรัม แล้วลงสีและเลือกท็อปปิงตามใจชอบ ใช้เวลาตกแต่งประมาณ 1–1.5 ชั่วโมง\n\nหลังเวิร์กช็อป ทาง Kad Kokoa จะดูแลขั้นตอนการเซ็ตตัวของช็อกโกแลต ผู้เข้าร่วมมารับแท่งที่เสร็จแล้วภายหลัง ห่อเป็นของขวัญพร้อมมอบให้ใคร\n\nรับจำนวนจำกัด 20 คน ควรมาถึงก่อนเวลา 30 นาทีเพื่อลงทะเบียน และทางผู้จัดจะถ่ายภาพ/วิดีโอบันทึกกิจกรรมเพื่อประชาสัมพันธ์",
  "organizer_name": "Dib Bangkok",
  "website_url": "https://dibbangkok.org/exhibition-home/post/gifts-in-making-chocolate-bar-painting-with-kad-kokoa.html",
  "registration_url": "https://dibbangkok.org/gifts-in-making-chocolate-bar-painting-with-kad-kokoa.html",
  "ticket_url": "",
  "registration_open": true,
  "fee_type": "paid",
  "fee_note": "1,550 บาท (รวมค่าเข้าชมพิพิธภัณฑ์)",
  "open_for_sponsors": false,
  "source_name": "Dib Bangkok",
  "source_url": "https://dibbangkok.org/exhibition-home/post/gifts-in-making-chocolate-bar-painting-with-kad-kokoa.html",
  "cover_source_url": "https://dibbangkok.org/media/mageplaza/blog/post/g/i/gifts-in-making_kadkokoa-workshop_website.jpg",
  "insights": {
    "who_for": ["คนที่อยากลองทำของขวัญจากช็อกโกแลตด้วยมือตัวเอง"],
    "capacity": "รับ 20 คน",
    "steps": ["กดปุ่ม Book Tickets ในหน้าอีเวนต์ของ Dib Bangkok", "มาถึงก่อนเวลา 30 นาทีเพื่อลงทะเบียน"],
    "links": [{ "kind": "register", "label": "จองตั๋ว", "url": "https://dibbangkok.org/gifts-in-making-chocolate-bar-painting-with-kad-kokoa.html" }]
  }
}
$j$::jsonb);

SELECT public.scout_event_draft($j$
{
  "scout_batch": "2026-11-28",
  "title": "Nomad Art Residency Bangkok 2027/2028 — Open Call",
  "category": "open_call",
  "starts_on": "2026-10-23",
  "ends_on": "2027-01-31",
  "time_note": "",
  "location_name": "Warin Lab, คลองสาน กรุงเทพฯ",
  "location_note": "G/F 69/1 ถนนเจริญรัถ ซอย 30",
  "description": "Warin Lab เปิดรับสมัครศิลปินเข้าร่วมโครงการพำนักสร้างสรรค์ Nomad Art Residency Bangkok รอบ 2027/2028 ภายใต้ธีม \"Land speaks. Water speaks. Are we listening?\"\n\nเปิดรับศิลปินช่วงกลางอาชีพ ภัณฑารักษ์ นักเขียน คนทำหนัง นักออกแบบท่าเต้น และนักสร้างสรรค์ด้านเทคโนโลยี แต่ละรอบรับ 4–6 คน ระยะ 4 หรือ 12 สัปดาห์ มีที่พักนอกสถานที่ในกรุงเทพฯ และสตูดิโอ 3 ห้อง\n\nพิจารณาแบบ rolling โดยมีกำหนดสำคัญตามรอบ เช่น รอบที่ 3 (31 พ.ค.–22 ส.ค. 2027, 12 สัปดาห์) ปิดรับสิทธิ์ลำดับต้นวันที่ 31 ม.ค. 2027 ส่วนรอบ 1–2 ปิดรับสิทธิ์ลำดับต้นวันที่ 30 พ.ย. 2026\n\nหมายเหตุ: หน้าเว็บระบุว่าเปิดสำหรับศิลปินนานาชาติ ยังไม่ชัดเจนว่านักสร้างสรรค์ไทยสมัครได้หรือไม่ และค่าธรรมเนียมไม่ปรากฏในหน้าที่อ่านได้ ควรตรวจสอบกับผู้จัดก่อนสมัคร",
  "organizer_name": "Warin Lab Contemporary",
  "website_url": "https://www.warinlabnomad.org/nomad-art-residency-bangkok/",
  "registration_url": "https://www.warinlabnomad.org/nomad-art-residency-bangkok/residency-application-form/",
  "ticket_url": "",
  "registration_open": true,
  "fee_type": "unspecified",
  "fee_note": "",
  "open_for_sponsors": false,
  "source_name": "Warin Lab Nomad",
  "source_url": "https://warinlabnomad.org/nomad-art-residency-bangkok/",
  "insights": {
    "steps": ["กรอกใบสมัครบนเว็บไซต์ของ Warin Lab Nomad", "ส่งก่อนกำหนดตามรอบที่ต้องการ"],
    "deadline": "2027-01-31",
    "links": [{ "kind": "form", "label": "ใบสมัคร", "url": "https://www.warinlabnomad.org/nomad-art-residency-bangkok/residency-application-form/" }]
  }
}
$j$::jsonb);
