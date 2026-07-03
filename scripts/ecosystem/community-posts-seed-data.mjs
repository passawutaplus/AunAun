/** Designer Area mock posts — 3 per work category (8 categories → 24 posts). */

export const COMMUNITY_SEED_CATEGORIES = [
  "Graphic",
  "Illustration",
  "Photography",
  "Video",
  "Craft",
  "Web/UI",
  "Content",
  "Music/Audio",
];

/** @type {Record<string, Array<{ kind: 'tip'|'question', title: string, body: string, tags: string[], questionTopic?: string }>>} */
export const COMMUNITY_POSTS_BY_CATEGORY = {
  Graphic: [
    {
      kind: "tip",
      title: "จัด Hierarchy โปสเตอร์ให้อ่านง่ายใน 3 วินาที",
      body: "เริ่มจากหัวข้อใหญ่ 1 บรรทัด → รองรับด้วย subhead ขนาด 60–70% → รายละเอียดเล็กสุด\n\nเว้น whitespace รอบหัวข้อหลักอย่างน้อย 1.5× ของตัวอักษร จะช่วยให้สายตาไหลลงมาตามลำดับได้เอง",
      tags: ["poster", "typography", "layout"],
    },
    {
      kind: "tip",
      title: "เช็กสี Pantone ก่อนส่งไฟล์พิมพ์",
      body: "export PDF/X-1a แล้วเปิด Overprint Preview ใน Illustrator\nถ้าใช้สีพิเศษ แนบ swatch Pantone ให้โรงพิมพ์ทุกครั้ง — ลด revision เรื่องสีเพี้ยนได้เยอะ",
      tags: ["print", "color", "workflow"],
    },
    {
      kind: "question",
      title: "ส่งไฟล์โลโก้ให้ลูกค้าแบบไหนดีที่สุด?",
      body: "ลูกค้าขอทั้ง AI, PNG, SVG และ mockup บน signage — ควรแพ็กเป็น zip ชุดเดียวหรือแยกตาม use case?\n\nมี template folder structure ที่ใช้บ่อยไหมครับ",
      tags: ["logo", "handoff", "client"],
      questionTopic: "client",
    },
  ],
  Illustration: [
    {
      kind: "tip",
      title: "Brush 3 ตัวที่ใช้บ่อยใน Procreate",
      body: "Gouache, Soft Airbrush, และ Technical Pen\nตั้ง brush หลักเป็น default แล้ว lock layer sketch ไว้ — สีทับทีหลังจะไม่เลอะเส้น",
      tags: ["procreate", "brush", "digital"],
    },
    {
      kind: "question",
      title: "ขอ feedback สไตล์ภาพประกอบ character",
      body: "กำลังหาทิศทางระหว่าง flat color กับ painterly\nโจทย์คือหนังสือเด็กวัย 6–8 ปี อยากได้โทนอบอุ่น ไม่น่ากลัว\n\nควรเน้น expression หรือ background มากกว่ากันครับ?",
      tags: ["character", "feedback", "children"],
      questionTopic: "feedback",
    },
    {
      kind: "tip",
      title: "ส่ง line art ให้ art director ตรวจก่อนลงสี",
      body: "export PNG 2000px ขาวดำ + layer แยก character/background\nใส่ note บน Figma ว่าจุดไหนต้องการ emphasis — ลดรอบ revision ตอนลงสีได้ครึ่งหนึ่ง",
      tags: ["lineart", "workflow", "review"],
    },
  ],
  Photography: [
    {
      kind: "tip",
      title: "ตั้ง White Balance ในสตูดิโอสินค้า",
      body: "ใช้ gray card ถ่าย reference ทุกครั้งที่เปลี่ยนแสง\nใน Lightroom sync WB กับทุกภาพใน set ก่อนเริ่ม retouch — สีสินค้าจะสม่ำเสมอ",
      tags: ["lightroom", "product", "studio"],
    },
    {
      kind: "question",
      title: "เรตถ่ายพรีเวดดิ้งช่วง low season ควรอยู่ที่เท่าไหร่?",
      body: "พอร์ตอยู่เชียงใหม่ ชุด 2–3 ชม. รวมแต่งหน้า location ใกล้เมือง\n\nlow season ลดจาก 12k เหลือเท่าไหร่ถึงยังคุ้มค่าเวลา?",
      tags: ["wedding", "pricing", "freelance"],
      questionTopic: "career",
    },
    {
      kind: "tip",
      title: "แสงธรรมชาติ vs Softbox สำหรับพอร์ตเทรต",
      body: "แสงหน้าต่าง diffused ช่วง 9–10 โมงให้ skin tone นุ่ม\nถ้าต้อง shoot บ่าย ใช้ 1 softbox 45° + reflector ขาวฝั่งตรงข้าม",
      tags: ["portrait", "lighting", "tips"],
    },
  ],
  Video: [
    {
      kind: "tip",
      title: "Export Premiere สำหรับ Reels / TikTok",
      body: "1080×1920, 30fps, H.264, bitrate 12–15 Mbps\nใส่ safe zone กลางจอสำหรับ caption — อย่าให้ข้อความสำคัญโดน UI แอปบัง",
      tags: ["premiere", "reels", "export"],
    },
    {
      kind: "tip",
      title: "Color grade โทนอบอุ่นแบบ cinematic",
      body: "lift shadow ไปทาง teal เล็กน้อย, push highlight ไป orange\nใช้ LUT เป็น reference แล้วปรับ curve เอง — อย่าให้ skin tone กลายเป็นส้มเกิน",
      tags: ["colorgrade", "cinematic", "davinci"],
    },
    {
      kind: "question",
      title: "Laptop ตัดตอบ 4K แนะนำสเปกเท่าไหร่?",
      body: "งานส่วนใหญ่ Premiere + After Effects สั้นๆ ไม่เกิน 5 นาที\nRAM 32GB พอไหม หรือควรลง 64GB + GPU แยก?",
      tags: ["gear", "premiere", "setup"],
      questionTopic: "tools",
    },
  ],
  Craft: [
    {
      kind: "tip",
      title: "เผาเซรามิกไม่ให้แตก — คุมความชื้นก่อนเข้าเตา",
      body: "ตากชิ้นงานให้ leather-hard สนิทก่อน bisque\nเพิ่มความเร็วอุณหภูมิช่วง 100–200°C ช้าๆ ชั่วโมงแรกสำคัญมาก",
      tags: ["ceramic", "kiln", "handmade"],
    },
    {
      kind: "question",
      title: "ขายงาน craft ออนไลน์ช่องทางไหนดี?",
      body: "ทำเครื่องประดับเงินแฮนด์เมด ลอง IG + Etsy แล้วยอดยังไม่ค่อยนิ่ง\n\nมี marketplace ไทยที่ conversion ดีกว่าไหม หรือควรโฟกัส popup?",
      tags: ["craft", "selling", "marketplace"],
      questionTopic: "career",
    },
    {
      kind: "tip",
      title: "จัด composition งานจักสานให้ดูพรีเมียม",
      body: "ถ่ายบนพื้นหลัง neutral + เงาเดียวด้านข้าง\nวาง props น้อยชิ้น เน้น texture วัสดุ — อย่าใส่ของรกๆ รอบชิ้นงาน",
      tags: ["photography", "craft", "styling"],
    },
  ],
  "Web/UI": [
    {
      kind: "tip",
      title: "Figma Auto Layout ที่ใช้บ่อยใน design system",
      body: "ตั้ง padding + gap เป็น token (8, 12, 16)\nใช้ min/max width แทน fixed width — responsive ปรับเองตอน dev handoff",
      tags: ["figma", "autolayout", "designsystem"],
    },
    {
      kind: "question",
      title: "Portfolio web ควรมีกี่โปรเจกต์?",
      body: "กำลังรีดจาก 15 เหลือ 6 ชิ้นที่ภูมิใจ\nกลัวดูน้อยไปสำหรับ client องค์กร — 6–8 พอไหม?",
      tags: ["portfolio", "career", "web"],
      questionTopic: "feedback",
    },
    {
      kind: "tip",
      title: "เช็ก contrast ก่อนส่งมอบ UI",
      body: "ใช้ plugin Stark หรือเช็ก WCAG AA อย่างน้อย 4.5:1 สำหรับ body text\nปุ่ม primary อย่าใช้ gradient ที่ทำให้อ่าน label ยาก",
      tags: ["accessibility", "ui", "wcag"],
    },
  ],
  Content: [
    {
      kind: "tip",
      title: "Hook 3 วิแรกของ TikTok ที่ยึดคนไว้",
      body: "เปิดด้วยผลลัพธ์ก่อน แล้วค่อยย้อน process\nตัด jump cut ทุก 1.5–2 วิ ใน 5 วิแรก — retention ดีขึ้นชัดเจน",
      tags: ["tiktok", "hook", "content"],
    },
    {
      kind: "question",
      title: "โพสต์ IG กี่ครั้งต่อสัปดาห์ถึงจะโต?",
      body: "ทำคอนเทนต์รีวิวคาเฟ่ ตอนนี้โพสต์ 3 ครั้ง/สัปดาห์\nreach นิ่งมา 2 เดือน ควรเพิ่มเป็น reel ทุกวันไหม?",
      tags: ["instagram", "growth", "strategy"],
      questionTopic: "technique",
    },
    {
      kind: "tip",
      title: "เขียน caption ให้คนอ่านจบ",
      body: "บรรทัดแรก = insight หรือคำถาม\nย่อหน้าสั้น 1–2 บรรทัด ใส่ CTA ท้ายโพสต์ชัดเจน (save / comment / link)",
      tags: ["caption", "copywriting", "social"],
    },
  ],
  "Music/Audio": [
    {
      kind: "tip",
      title: "Mix vocal podcast ให้ชัดบนมือถือ",
      body: "high-pass 80Hz, de-ess 6–8kHz เบาๆ\ncompress ratio 3:1, แล้ว bus กับ music ลด music -18 LUFS ตอนมีเสียงพูด",
      tags: ["podcast", "mixing", "audio"],
    },
    {
      kind: "question",
      title: "ใช้ sample ในงาน commercial ต้องระวังอะไร?",
      body: "ซื้อ license จาก Splice แล้ว client เอาไปโฆษณา TV ได้ไหม\nต้องอัปเกรด license แยกหรือเปล่า?",
      tags: ["license", "sample", "commercial"],
      questionTopic: "other",
    },
    {
      kind: "tip",
      title: "เลือก BPM ตาม mood board",
      body: "brand สาย lifestyle มักอยู่ 90–110 BPM\nงาน tech/corporate 120–128 BPM — ส่ง reference track 2–3 เพลงให้ client approve ก่อน compose",
      tags: ["bpm", "music", "brief"],
    },
  ],
};

export function catalogCommunityPostId(categoryIndex, postIndex) {
  const n = categoryIndex * 3 + postIndex;
  const hex = n.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0004-0000000000${hex}`;
}

export function buildCommunitySeedPosts(catalogUid, avatarSeedPrefix = "an1hem-community") {
  const posts = [];
  COMMUNITY_SEED_CATEGORIES.forEach((category, ci) => {
    const defs = COMMUNITY_POSTS_BY_CATEGORY[category];
    defs.forEach((def, pi) => {
      const authorIndex = (ci * 3 + pi) % 20;
      const img = `https://picsum.photos/seed/${avatarSeedPrefix}-${ci}-${pi}/800/1000`;
      posts.push({
        id: catalogCommunityPostId(ci, pi),
        author_id: catalogUid(authorIndex),
        post_kind: def.kind,
        title: def.title,
        body: def.body,
        category,
        tags: def.tags,
        gallery_urls: pi === 0 ? [img] : pi === 1 ? [img, `https://picsum.photos/seed/${avatarSeedPrefix}-${ci}-${pi}-b/800/600`] : [],
        video_urls: [],
        media_aspect: pi === 0 ? "portrait" : pi === 1 ? "landscape" : "square",
        text_cover_theme: null,
        question_topic: def.kind === "question" ? def.questionTopic ?? "other" : null,
        status: "published",
        reply_count: (ci + pi) % 5,
        like_count: 3 + ((ci * 7 + pi * 11) % 40),
        view_count: 40 + ((ci * 13 + pi * 17) % 350),
      });
    });
  });
  return posts;
}
