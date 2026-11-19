/**
 * SAMECOR Journal — บทความด้านดีไซน์ ผู้คน และศิลปะ (หน้า /journal)
 *
 * ข้อมูลอยู่ในไฟล์เดียว (ไม่ใช้ฐานข้อมูล) เพื่อให้ทั้งหน้าเว็บ, api/seo-preview.js (HTML สำหรับบอท)
 * และ scripts/generate-sitemap.mjs ใช้ชุดเดียวกัน — เป็น ESM ล้วน ห้าม import ของฝั่ง React
 *
 * เพิ่มบทความ: เพิ่ม object ใหม่ไว้บนสุดของ JOURNAL_ARTICLES + วางภาพใน public/journal/<slug>.jpg
 * แล้วรัน `npm run sitemap:gen` (build บน Vercel รันให้เอง)
 *
 * แพทเทิร์นบทความ SAMECOR: docs/JOURNAL_PATTERN.md
 * ปก: public/journal/<slug>-cover.jpg (คอลลาจ 16:9) · ภาพจริงในเนื้อหา: public/journal/<slug>*.jpg
 *
 * บล็อกเนื้อหา: { h: "หัวข้อย่อย" } · { p: "ย่อหน้า" } · { ul: ["ข้อ", ...] } · { quote: "ประโยคเด่น" }
 *   { img: { src, alt, caption?, credit } }   ภาพจริงในเนื้อหา (ต้องมีเครดิต)
 *   { graphic: { src, alt, caption? } }       กราฟิก/โมชันกราฟิก SVG ที่ทำเอง (public/journal/graphics/)
 *
 * แหล่งอ้างอิง (บังคับทุกบทความ): sources: [{ title, publisher, url }]
 * เรียงจากสำคัญสุด — หน้าเว็บโชว์ 2 แหล่งแรก ที่เหลือพับไว้ใต้ปุ่ม "ดูแหล่งอ้างอิงเพิ่มเติม"
 * ใส่เฉพาะลิงก์ที่มีอยู่จริงและตรงกับเนื้อหา ห้ามเดา URL
 */

/** ลำดับนี้คือลำดับในแถบหมวดด้านซ้ายของหน้า Journal */
export const JOURNAL_CATEGORIES = {
  design: { id: "design", label: "Design", labelTh: "ดีไซน์และเลย์เอาต์" },
  branding: { id: "branding", label: "Branding", labelTh: "แบรนด์และอัตลักษณ์" },
  people: { id: "people", label: "People", labelTh: "ผู้คนและครีเอเตอร์" },
  career: { id: "career", label: "Career", labelTh: "อาชีพและพอร์ตโฟลิโอ" },
  art: { id: "art", label: "Art", labelTh: "ศิลปะและนิทรรศการ" },
  culture: { id: "culture", label: "Culture", labelTh: "วัฒนธรรมและเทรนด์" },
};

/** @type {import("./articles").JournalArticle[]} — เฉพาะข้อมูลหัวเรื่อง (เนื้อหาอยู่ใน content/<slug>.js) */
export const JOURNAL_ARTICLES = [
  {
    slug: "sustainable-design",
    category: "culture",
    titleEn: "Designing for sustainability",
    title: "ออกแบบให้ยั่งยืน เริ่มตั้งแต่ก่อนจะมีของเสีย",
    description:
      "ของเสียคือผลของการตัดสินใจในการออกแบบ 3 หลักเศรษฐกิจหมุนเวียนจากมูลนิธิ Ellen MacArthur และสิ่งที่นักออกแบบสื่อและครีเอเตอร์ทำได้ในงานถัดไป",
    image: {
      src: "/journal/sustainable-design-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ ใบไม้ กล่องกระดาษ ขวดแก้ว และมือประคองต้นกล้าในดิน ลูกศรเส้นสีแดงเชื่อมทุกชิ้นเป็นวงกลม",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T15:05:00+07:00",
    dateModified: "2026-11-19T15:05:00+07:00",
    readMinutes: 4,
    tags: ["ความยั่งยืน", "เศรษฐกิจหมุนเวียน", "ดีไซน์", "วัฒนธรรม"],
  },
  {
    slug: "curating-small-show",
    category: "art",
    titleEn: "Curating a small show",
    title: "จัดนิทรรศการเล็กของตัวเอง ตั้งแต่เลือกงานจนถึงแขวนผนัง",
    description:
      "นิทรรศการเล็กจัดได้ในร้านกาแฟหรือสตูดิโอ วิธีตั้งโจทย์ คัดงาน วางแผนผนัง แขวนที่ระดับสายตาราว 145 ซม. และรายละเอียดที่ทำให้ดูมืออาชีพ",
    image: {
      src: "/journal/curating-small-show-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ ห้องผนังขาวมีกรอบภาพวางพิงผนัง ค้อน ตลับเมตร และบันได เส้นประสีแดงแสดงระดับการแขวนบนผนัง",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T15:04:00+07:00",
    dateModified: "2026-11-19T15:04:00+07:00",
    readMinutes: 5,
    tags: ["ศิลปะ", "นิทรรศการ", "ภัณฑารักษ์", "จัดแสดงงาน"],
  },
  {
    slug: "contract-basics",
    category: "career",
    titleEn: "Contract basics for freelancers",
    title: "สัญญางานฟรีแลนซ์ 6 ข้อที่ต้องคุยก่อนเริ่มงาน",
    description:
      "สัญญาไม่ได้มีไว้เพราะไม่ไว้ใจ แต่ให้เข้าใจตรงกัน 6 หัวข้อที่ควรมี ตั้งแต่ขอบเขตงาน รอบแก้ ลิขสิทธิ์ ไปจนถึงค่ายกเลิกงาน โดยอ้างอิงแบบฟอร์มของ AIGA",
    image: {
      src: "/journal/contract-basics-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ ปากกาหมึกซึม กระดาษที่มีเส้นลงชื่อ คลิปหนีบกระดาษ และมือสองคนจับมือกัน เส้นสีแดงขีดใต้ช่องลงชื่อ",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T15:03:00+07:00",
    dateModified: "2026-11-19T15:03:00+07:00",
    readMinutes: 4,
    tags: ["ฟรีแลนซ์", "สัญญา", "อาชีพ", "ลิขสิทธิ์"],
  },
  {
    slug: "finding-a-mentor",
    category: "people",
    titleEn: "Finding a mentor",
    title: "หาพี่เลี้ยงในสายงานสร้างสรรค์ ไม่ต้องมีคนเดียว",
    description:
      "คำแนะนำจากคนที่เดินมาก่อนช่วยประหยัดเวลาได้มาก แนวคิดคณะที่ปรึกษาส่วนตัว หาพี่เลี้ยงได้จากที่ไหน ขออย่างไรไม่ให้เป็นภาระ และทำให้ความสัมพันธ์ไปต่อ",
    image: {
      src: "/journal/finding-a-mentor-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ ช่างฝีมือสูงวัยจับมือคนหนุ่มสาวช่วยวาดเส้น โคมไฟ กองสมุดสเก็ตช์ และบันได เส้นสีแดงไต่ขึ้นตามขั้นบันได",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T15:02:00+07:00",
    dateModified: "2026-11-19T15:02:00+07:00",
    readMinutes: 4,
    tags: ["ครีเอเตอร์", "พี่เลี้ยง", "อาชีพ", "คอมมูนิตี้"],
  },
  {
    slug: "choosing-brand-colors",
    category: "branding",
    titleEn: "Choosing brand colors",
    title: "เลือกสีแบรนด์ ให้มากกว่าความหมายของสี",
    description:
      "ตารางความหมายของสีอาจทำให้แบรนด์เหมือนคู่แข่ง 4 คำถามก่อนเลือกสี สัดส่วน 60-30-10 และทำไมความสม่ำเสมอสำคัญกว่าสีที่สมบูรณ์แบบ",
    image: {
      src: "/journal/choosing-brand-colors-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ แถบตัวอย่างสีกางเป็นพัด แปรงทาสี ขวดผงสี และถุงกระดาษ กรอบเส้นสีแดงล้อมแถบสีที่ถูกเลือก",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T15:01:00+07:00",
    dateModified: "2026-11-19T15:01:00+07:00",
    readMinutes: 4,
    tags: ["แบรนด์", "สี", "อัตลักษณ์", "ดีไซน์"],
  },
  {
    slug: "thai-latin-type-pairing",
    category: "design",
    titleEn: "Pairing Thai and Latin fonts",
    title: "จับคู่ฟอนต์ไทยกับอังกฤษ ให้ดูมาจากบ้านเดียวกัน",
    description:
      "งานออกแบบในไทยแทบทุกชิ้นมีสองภาษา ทำไมจับคู่ฟอนต์ยาก 4 จุดที่ต้องเทียบ ทั้งความสูง ความเข้ม โครงสร้าง และระยะบรรทัด พร้อมวิธีทดสอบ",
    image: {
      src: "/journal/thai-latin-type-pairing-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ ตัวเรียงพิมพ์โลหะสองชิ้นรูปทรงต่างกัน รางเรียงตัวพิมพ์ และมือจัดแถบกระดาษ เส้นฐานสีแดงลากผ่านตัวพิมพ์ทั้งสอง",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T15:00:00+07:00",
    dateModified: "2026-11-19T15:00:00+07:00",
    readMinutes: 4,
    tags: ["ดีไซน์", "ตัวอักษร", "ฟอนต์ไทย", "Typography"],
  },
  {
    slug: "slow-design",
    category: "culture",
    titleEn: "What is slow design",
    title: "สโลว์ดีไซน์ ออกแบบให้คนใส่ใจ มากกว่าให้คนรีบ",
    description:
      "สโลว์ดีไซน์ไม่ได้แปลว่าทำงานช้า แต่ชวนออกแบบอย่างใส่ใจและยั่งยืน 6 หลักจาก Strauss และ Fuad-Luke พร้อมตัวอย่างและวิธีนำไปใช้กับงานของคุณ",
    image: {
      src: "/journal/slow-design-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ หอยทาก ชามเซรามิกทำมือ เก้าอี้ไม้ และมือที่กำลังทอผ้า เส้นก้นหอยสีแดงลากผ่านทุกชิ้นอย่างช้าๆ",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T14:05:00+07:00",
    dateModified: "2026-11-19T14:05:00+07:00",
    readMinutes: 4,
    tags: ["สโลว์ดีไซน์", "ความยั่งยืน", "คราฟต์", "วัฒนธรรม"],
  },
  {
    slug: "reading-wall-labels",
    category: "art",
    titleEn: "How to read a museum label",
    title: "อ่านป้ายข้างงานศิลปะให้เป็น ก่อนเดินผ่านไป",
    description:
      "ป้ายเล็กข้างงานศิลปะบอกอะไรมากกว่าชื่อศิลปิน วิธีอ่านข้อมูลพื้นฐาน ความหมายของ circa และ credit line และควรอ่านป้ายก่อนหรือหลังดูงาน",
    image: {
      src: "/journal/reading-wall-labels-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ ผู้ชมยืนมองภาพวาดทิวทัศน์ในกรอบทอง ป้ายคำอธิบายเปล่าข้างกรอบ และแว่นขยาย เส้นสีแดงเชื่อมป้ายกับภาพ",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T14:04:00+07:00",
    dateModified: "2026-11-19T14:04:00+07:00",
    readMinutes: 4,
    tags: ["ศิลปะ", "พิพิธภัณฑ์", "นิทรรศการ", "การดูงานศิลปะ"],
  },
  {
    slug: "portfolio-curation",
    category: "career",
    titleEn: "Curating your portfolio",
    title: "คัดงานลงพอร์ตโฟลิโอ น้อยชิ้นแต่ชัดกว่า",
    description:
      "คนดูพอร์ตกวาดตาและตัดสินจากงานไม่กี่ชิ้น ควรใส่กี่โปรเจกต์ คำถามสำหรับคัดงาน และการเรียงลำดับให้งานที่ดีที่สุดถูกเห็นก่อน",
    image: {
      src: "/journal/portfolio-curation-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ มือหยิบภาพถ่ายหนึ่งใบจากภาพที่วางเรียงบนโต๊ะ แฟ้มผลงาน และกรรไกร กรอบสีแดงล้อมภาพที่ถูกคัด",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T14:03:00+07:00",
    dateModified: "2026-11-19T14:03:00+07:00",
    readMinutes: 4,
    tags: ["พอร์ตโฟลิโอ", "อาชีพ", "ครีเอเตอร์", "หางาน"],
  },
  {
    slug: "creative-burnout",
    category: "people",
    titleEn: "Creative burnout",
    title: "เมื่อครีเอเตอร์หมดไฟ สังเกตอย่างไร และเริ่มดูแลตัวเองจากตรงไหน",
    description:
      "หมดไฟเกิดได้กับทุกคนที่ทำงานสร้างสรรค์ นิยามจาก WHO สัญญาณที่ควรสังเกตจาก Mayo Clinic และสิ่งที่ลองทำได้ รวมถึงเมื่อไรควรปรึกษาผู้เชี่ยวชาญ",
    image: {
      src: "/journal/creative-burnout-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ คนฟุบหน้ากับโต๊ะข้างแล็ปท็อป เทียนที่ละลายจนสั้น ต้นไม้ในกระถาง และแก้วกาแฟ เส้นสีแดงเป็นรูปแบตเตอรี่ใกล้หมด",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T14:02:00+07:00",
    dateModified: "2026-11-19T14:02:00+07:00",
    readMinutes: 4,
    tags: ["ครีเอเตอร์", "หมดไฟ", "สุขภาพใจ", "การทำงาน"],
  },
  {
    slug: "one-page-brand-guideline",
    category: "branding",
    titleEn: "A one-page brand guideline",
    title: "แบรนด์ไกด์ไลน์หน้าเดียว ที่คนอื่นหยิบไปใช้ได้ทันที",
    description:
      "แบรนด์เล็กไม่จำเป็นต้องมีคู่มือหนา สิ่งที่ต้องมีในไกด์หน้าเดียว ทั้งโลโก้ สี ตัวอักษร น้ำเสียง และภาพ พร้อมส่วนห้ามทำที่ช่วยกันงานเพี้ยน",
    image: {
      src: "/journal/one-page-brand-guideline-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ กระดาษพับหนึ่งแผ่น แถบตัวอย่างสี ไม้บรรทัด และตรายาง กรอบเส้นสีแดงล้อมกระดาษแผ่นเดียว",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T14:01:00+07:00",
    dateModified: "2026-11-19T14:01:00+07:00",
    readMinutes: 4,
    tags: ["แบรนด์", "ไกด์ไลน์", "อัตลักษณ์", "ธุรกิจเล็ก"],
  },
  {
    slug: "color-contrast-readability",
    category: "design",
    titleEn: "Color contrast and readability",
    title: "คอนทราสต์สี ตัวอักษรต้องเข้มแค่ไหนถึงอ่านง่ายสำหรับทุกคน",
    description:
      "ตัวอักษรเทาอ่อนดูสวยแต่หลายคนอ่านไม่ออก เกณฑ์ 4.5:1 ของ WCAG ทำไมใกล้เกณฑ์ไม่ได้แปลว่าผ่าน ข้อควรระวังกับฟอนต์ไทย และวิธีเช็กในหนึ่งนาที",
    image: {
      src: "/journal/color-contrast-readability-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ แว่นตา หน้ากระดาษที่มีตัวอักษรหลายขนาด แผ่นวัดสายตา และมือถือกระดาษเทาวางบนกระดาษดำ วงเส้นสีแดงล้อมแผ่นวัดสายตา",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T14:00:00+07:00",
    dateModified: "2026-11-19T14:00:00+07:00",
    readMinutes: 4,
    tags: ["ดีไซน์", "สี", "การเข้าถึง", "Accessibility"],
  },
  {
    slug: "using-trends-wisely",
    category: "culture",
    titleEn: "Using trends wisely",
    title: "ใช้เทรนด์ดีไซน์อย่างไร ไม่ให้งานตกยุคเร็ว",
    description:
      "เทรนด์ทำให้งานดูทันสมัย แต่ก็ตกยุคได้เร็ว วิธีแยกเทรนด์ชั่วคราวออกจากการเปลี่ยนแปลงจริง และวางฐานงานให้นิ่งขณะที่ผิวหน้าเปลี่ยนได้",
    image: {
      src: "/journal/using-trends-wisely-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ เก้าอี้ไม้ กองนิตยสารเก่า คลื่นทะเล นาฬิกาทราย และสมาร์ตโฟน เส้นสีแดงลากตามแนวคลื่น",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T13:05:00+07:00",
    dateModified: "2026-11-19T13:05:00+07:00",
    readMinutes: 4,
    tags: ["เทรนด์", "ดีไซน์", "แบรนด์", "วัฒนธรรม"],
  },
  {
    slug: "photographing-artwork",
    category: "art",
    titleEn: "Photographing your artwork",
    title: "ถ่ายภาพผลงานศิลปะ ให้สีและสัดส่วนใกล้ของจริง",
    description:
      "ภาพถ่ายผลงานคือสิ่งที่คนส่วนใหญ่ได้เห็นก่อนของจริง วิธีจัดแสง 45 องศา ตั้งกล้องให้ขนาน และใช้การ์ดอ้างอิงสี โดยไม่ต้องมีสตูดิโอราคาแพง",
    image: {
      src: "/journal/photographing-artwork-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ กล้องบนขาตั้งหันหาภาพวาดในกรอบ ไฟซอฟต์บ็อกซ์สองดวง และการ์ดสีอ้างอิง เส้นประสีแดงแสดงมุมแสง",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T13:04:00+07:00",
    dateModified: "2026-11-19T13:04:00+07:00",
    readMinutes: 5,
    tags: ["ศิลปะ", "ถ่ายภาพผลงาน", "พอร์ตโฟลิโอ", "แสง"],
  },
  {
    slug: "creative-brief",
    category: "career",
    titleEn: "Writing a creative brief",
    title: "บรีฟที่ดีหน้าตาเป็นอย่างไร และช่วยลดการแก้งานได้แค่ไหน",
    description:
      "งานที่แก้หลายรอบมักเริ่มจากบรีฟที่ไม่ชัด 8 หัวข้อที่บรีฟควรมี วิธีช่วยลูกค้าที่ไม่มีบรีฟ และคำถามที่ทำให้ทุกฝ่ายเห็นทิศทางเดียวกัน",
    image: {
      src: "/journal/creative-brief-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ คลิปบอร์ดกระดาษเปล่า เข็มทิศ แผนที่ และเป้าธนู เส้นสีแดงพุ่งจากคลิปบอร์ดเข้ากลางเป้า",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T13:03:00+07:00",
    dateModified: "2026-11-19T13:03:00+07:00",
    readMinutes: 5,
    tags: ["บรีฟ", "ลูกค้า", "ฟรีแลนซ์", "อาชีพ"],
  },
  {
    slug: "finding-collaborators",
    category: "people",
    titleEn: "Finding the right collaborators",
    title: "หาคนทำงานร่วมที่ใช่ ให้ผลงานไปได้ไกลกว่าทำคนเดียว",
    description:
      "ผลงานที่ดีหลายชิ้นเกิดจากความร่วมมือ วิธีมองหาคู่ทำงานจากผลงาน เริ่มจากโปรเจกต์เล็ก คุยเรื่องเครดิตให้ชัด และทักไปโดยไม่อึดอัด",
    image: {
      src: "/journal/finding-collaborators-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ มือสองคนทำงานบนกระดาษแผ่นเดียวกัน คนหนึ่งถือกล้อง อีกคนถือพู่กัน และจิ๊กซอว์ที่ต่อกัน เส้นสีแดงเชื่อมมือทั้งสอง",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T13:02:00+07:00",
    dateModified: "2026-11-19T13:02:00+07:00",
    readMinutes: 4,
    tags: ["ครีเอเตอร์", "ความร่วมมือ", "คอมมูนิตี้", "เครดิต"],
  },
  {
    slug: "brand-voice",
    category: "branding",
    titleEn: "Finding your brand voice",
    title: "น้ำเสียงแบรนด์ เขียนอย่างไรให้คนจำได้แม้ไม่เห็นโลโก้",
    description:
      "แบรนด์ที่ดีจำได้จากวิธีพูด ไม่ใช่แค่หน้าตา ความต่างของ voice กับ tone 4 มิติของน้ำเสียงจาก NN/g และวิธีเขียนไกด์น้ำเสียงในหน้าเดียว",
    image: {
      src: "/journal/brand-voice-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ ไมโครโฟนวินเทจ กรอบคำพูด สมาร์ตโฟน ซองจดหมาย และผู้หญิงกำลังพูด เส้นคลื่นเสียงสีแดงลากผ่านทุกชิ้น",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T13:01:00+07:00",
    dateModified: "2026-11-19T13:01:00+07:00",
    readMinutes: 4,
    tags: ["แบรนด์", "น้ำเสียง", "การเขียน", "อัตลักษณ์"],
  },
  {
    slug: "type-hierarchy",
    category: "design",
    titleEn: "Typographic hierarchy",
    title: "ลำดับชั้นตัวอักษร บอกคนอ่านว่าต้องอ่านอะไรก่อน",
    description:
      "คนส่วนใหญ่กวาดตาก่อนอ่าน 5 คันโยกที่ใช้สร้างลำดับชั้นตัวอักษร ทำไม 3 ระดับก็พอ สิ่งที่ต้องคิดเพิ่มกับภาษาไทย และการทดสอบแบบหรี่ตา",
    image: {
      src: "/journal/type-hierarchy-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ ตัวเรียงพิมพ์โลหะขนาดใหญ่ไล่ไปเล็ก แว่นขยาย และมือจับตัวเรียงชิ้นเล็ก เส้นสีแดงไล่ระดับเป็นขั้นบันได",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T13:00:00+07:00",
    dateModified: "2026-11-19T13:00:00+07:00",
    readMinutes: 4,
    tags: ["ดีไซน์", "ตัวอักษร", "Typography", "เลย์เอาต์"],
  },
  {
    slug: "ai-and-your-creative-work",
    category: "culture",
    titleEn: "AI and your creative work",
    title: "ใช้ AI อย่างไร ให้งานยังเป็นของคุณ",
    description:
      "AI ช่วยร่างไอเดียได้เร็ว แต่ส่วนไหนของงานที่ยังเป็นของคุณ สรุปหลักลิขสิทธิ์ล่าสุด และวิธีใช้ AI โดยเก็บการตัดสินใจสำคัญไว้กับตัวเอง",
    image: {
      src: "/journal/ai-and-your-creative-work-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ มือคนวาดเก้าอี้ด้วยดินสอ ข้างแขนกลถือพู่กันและลูกศรเมาส์ เส้นสีแดงล้อมรอบมือคน",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T12:05:00+07:00",
    dateModified: "2026-11-19T12:05:00+07:00",
    readMinutes: 5,
    tags: ["AI", "ลิขสิทธิ์", "ครีเอเตอร์", "เทรนด์"],
  },
  {
    slug: "writing-an-artist-statement",
    category: "art",
    titleEn: "Writing an artist statement",
    title: "เขียน Artist Statement ให้คนอ่านเข้าใจงานของคุณ",
    description:
      "Artist statement ที่ดีไม่ต้องสละสลวย แค่ตอบว่าคุณทำอะไร ทำอย่างไร และทำไม โครง 3 ย่อหน้าและวิธีทดสอบก่อนส่ง Open Call",
    image: {
      src: "/journal/writing-an-artist-statement-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ มือเขียนด้วยปากกาหมึกซึม จานสี และชิ้นภาพวาดนามธรรม มีเส้นสีแดงเชื่อมภาพวาดกับมือที่เขียน",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T12:04:00+07:00",
    dateModified: "2026-11-19T12:04:00+07:00",
    readMinutes: 4,
    tags: ["ศิลปะ", "Artist Statement", "Open Call", "ศิลปิน"],
  },
  {
    slug: "pricing-creative-work",
    category: "career",
    titleEn: "Pricing creative work",
    title: "ตั้งราคางานสร้างสรรค์ ให้อธิบายได้และไม่ขาดทุน",
    description:
      "คิดราคางานฟรีแลนซ์จากต้นทุนจริง เลือกรูปแบบการคิดราคาให้เหมาะกับงาน และรับมือเมื่อลูกค้าบอกว่าแพง โดยไม่ต้องลดคุณค่างานตัวเอง",
    image: {
      src: "/journal/pricing-creative-work-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ ตาชั่งโบราณ นาฬิกาจับเวลา สมุดสเก็ตช์ และเครื่องคิดเลข มีเส้นสีแดงเชื่อมเวลาและงานเข้ากับตาชั่ง",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T12:03:00+07:00",
    dateModified: "2026-11-19T12:03:00+07:00",
    readMinutes: 5,
    tags: ["ฟรีแลนซ์", "ราคา", "อาชีพ", "ใบเสนอราคา"],
  },
  {
    slug: "when-you-feel-not-good-enough",
    category: "people",
    titleEn: "When you feel not good enough",
    title: "เมื่อรู้สึกว่าตัวเองเก่งไม่พอ แม้ผลงานจะบอกตรงข้าม",
    description:
      "ความรู้สึกว่าตัวเองเป็นของปลอมพบได้บ่อยในคนทำงานสร้างสรรค์ รู้จัก impostor phenomenon และวิธีที่นักจิตวิทยาแนะนำให้รับมือ",
    image: {
      src: "/journal/when-you-feel-not-good-enough-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ คนยืนหันหลังมองผลงานที่แปะบนผนังสตูดิโอ ถือหน้ากากไว้ข้างตัว เส้นสีแดงวาดรอบเงา",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T12:02:00+07:00",
    dateModified: "2026-11-19T12:02:00+07:00",
    readMinutes: 5,
    tags: ["ครีเอเตอร์", "สุขภาพใจ", "Impostor", "ความมั่นใจ"],
  },
  {
    slug: "brand-is-not-a-logo",
    category: "branding",
    titleEn: "A brand is not a logo",
    title: "แบรนด์ไม่ใช่โลโก้ แล้วนักออกแบบควรส่งมอบอะไร",
    description:
      "โลโก้ อัตลักษณ์ และแบรนด์ต่างกันอย่างไร ทำไมความเข้าใจนี้ช่วยให้คุณคุยกับลูกค้าได้ลึกขึ้น พร้อมคำถาม 5 ข้อก่อนเริ่มออกแบบโลโก้",
    image: {
      src: "/journal/brand-is-not-a-logo-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ หน้าร้าน มือส่งถุงให้ลูกค้าที่ยิ้ม แก้วกาแฟ และนามบัตรที่มีวงกลมสีแดง เส้นแดงล้อมทุกชิ้นไว้ด้วยกัน",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T12:01:00+07:00",
    dateModified: "2026-11-19T12:01:00+07:00",
    readMinutes: 5,
    tags: ["แบรนด์", "โลโก้", "อัตลักษณ์", "ลูกค้า"],
  },
  {
    slug: "grid-systems-explained",
    category: "design",
    titleEn: "Grid systems, explained",
    title: "กริดคืออะไร ทำไมเลย์เอาต์ที่ดีถึงมีโครงที่มองไม่เห็น",
    description:
      "กริดไม่ใช่กรงขังความคิดสร้างสรรค์ แต่คือข้อตกลงที่ทำให้หน้าอ่านง่าย รู้จักส่วนประกอบของกริด เลือกแบบให้เหมาะกับงาน และเริ่มใช้ได้ใน 4 ขั้น",
    image: {
      src: "/journal/grid-systems-explained-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ มือวางกระดาษลงช่องกริด ข้างภาพภูเขาและอาคาร ไม้ทีสแควร์ด้านล่าง เส้นสีแดงตีเป็นคอลัมน์",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T12:00:00+07:00",
    dateModified: "2026-11-19T12:00:00+07:00",
    readMinutes: 5,
    tags: ["ดีไซน์", "กริด", "เลย์เอาต์", "กราฟิกดีไซน์"],
  },
  {
    slug: "four-questions-at-the-gallery",
    category: "art",
    titleEn: "Four questions to ask at a gallery",
    title: "4 คำถามเวลาดูงานศิลปะ เมื่อคุณไม่ใช่นักวิจารณ์",
    description:
      "ไม่ต้องรู้ประวัติศาสตร์ศิลป์ก็ดูงานในแกลเลอรีได้ลึกขึ้น ลองถาม 4 คำถามง่าย ๆ กับผลงานตรงหน้า แล้วคุณจะเห็นมากกว่าที่ป้ายข้างผนังบอก",
    image: {
      src: "/journal/four-questions-at-the-gallery-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ ผู้หญิงยืนมองภาพนามธรรมในกรอบ มีดวงตา รูปปั้น และกรอบรูปเปล่าตัดแปะ เส้นสีแดงล้อมรอบผลงาน",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T09:00:00+07:00",
    dateModified: "2026-11-19T09:00:00+07:00",
    readMinutes: 4,
    tags: ["ศิลปะ", "แกลเลอรี", "นิทรรศการ", "การดูงานศิลปะ"],
  },
  {
    slug: "tell-the-story-behind-the-work",
    category: "career",
    titleEn: "Tell the story behind the work",
    title: "เล่าเบื้องหลังผลงาน ให้คนอยากคุยกับคุณต่อ",
    description:
      "ผลงานสวยอย่างเดียวยังไม่พอให้คนทักมา เรื่องเล่าสั้น ๆ ว่าคุณคิดอะไร ทำอย่างไร และเจออะไรระหว่างทาง คือสิ่งที่เปลี่ยนคนดูให้เป็นคนที่อยากเชื่อมต่อ",
    image: {
      src: "/journal/tell-the-story-behind-the-work-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ มือสเก็ตช์ในสมุด โคมไฟ ภาพร่าง และภาพงานจริงที่แปะเทป มีเส้นสีแดงลากจากภาพร่างไปยังงานเสร็จ",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T09:01:00+07:00",
    dateModified: "2026-11-19T09:01:00+07:00",
    readMinutes: 5,
    tags: ["ครีเอเตอร์", "พอร์ตโฟลิโอ", "เล่าเรื่อง", "ฟรีแลนซ์"],
  },
  {
    slug: "white-space-is-a-design-tool",
    category: "design",
    titleEn: "White space is a design tool",
    title: "พื้นที่ว่างคือเครื่องมือออกแบบ ไม่ใช่ส่วนที่เหลือ",
    description:
      "พื้นที่ว่างไม่ได้แปลว่างานยังไม่เสร็จ มันคือเครื่องมือที่กำหนดว่าสายตาไปไหนก่อน 5 วิธีใช้ white space ให้เลย์เอาต์ชัดและดูมีน้ำหนักขึ้น",
    image: {
      src: "/journal/white-space-is-a-design-tool-cover.jpg",
      alt: "ภาพคอลลาจขาวดำ มือถือดินสอวาดกริดเลย์เอาต์ ช่องหนึ่งว่างและมีเส้นสีแดงล้อมรอบ ข้างไม้บรรทัดและกระดาษฉีก",
      credit: "Illustration: SAMECOR (AI-assisted collage)",
    },
    author: "ทีม SAMECOR",
    datePublished: "2026-11-19T09:02:00+07:00",
    dateModified: "2026-11-19T09:02:00+07:00",
    readMinutes: 5,
    tags: ["ดีไซน์", "เลย์เอาต์", "White space", "กราฟิกดีไซน์"],
  },
];

/** slug ที่มีอยู่จริงเท่านั้น (กันการ import ไฟล์มั่ว) */
export function isJournalSlug(slug) {
  return JOURNAL_ARTICLES.some((a) => a.slug === slug);
}

/**
 * โหลดเนื้อหา (body + sources) แบบแยกไฟล์ ให้หน้าเว็บโหลดเฉพาะบทความที่เปิด
 * ฝั่งเซิร์ฟเวอร์ (api/seo-preview.js) ใช้ content/index.js แทน
 * @returns {Promise<import("./articles").JournalContent | undefined>}
 */
export async function loadJournalContent(slug) {
  if (!isJournalSlug(slug)) return undefined;
  const mod = await import(`./content/${slug}.js`);
  return mod.default;
}

export function getJournalArticle(slug) {
  return JOURNAL_ARTICLES.find((a) => a.slug === slug);
}

export function journalArticlePath(slug) {
  return `/journal/${slug}`;
}

/** ใหม่สุดก่อน */
export function sortedJournalArticles() {
  return [...JOURNAL_ARTICLES].sort(
    (a, b) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime(),
  );
}
