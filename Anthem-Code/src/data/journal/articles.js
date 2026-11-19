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
