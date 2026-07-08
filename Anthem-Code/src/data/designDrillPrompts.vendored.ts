/** AUTO-GENERATED — do not edit. Source: Solo-Code/F:\So1o\AunAun-fresh\Solo-Code\src\data\designDrillPrompts.ts */
export type DrillCategory =
  | "logo"
  | "uiux"
  | "poster"
  | "social"
  | "illustration"
  | "branding"
  | "typography";

export type DrillDifficulty = "easy" | "medium" | "hard";
export type DrillMode = "constraints" | "free";

export interface DrillPromptTemplate {
  id: string;
  category: DrillCategory;
  difficulty: DrillDifficulty;
  brief: string;
  constraints?: string[];
  timeHint?: string;
  freeHint?: string;
  /** Short headline for daily brief card */
  friendlyTitle?: string;
  /** One-line context for daily brief card */
  friendlyDescription?: string;
  /** Checklist items shown as "สิ่งที่ควรมี" */
  deliverables?: string[];
  /** Mood / context image for daily brief card */
  previewImage?: string;
}

export const DRILL_CATEGORY_META: Record<DrillCategory, { label: string; anthemCategory: string }> =
  {
    logo: { label: "Logo", anthemCategory: "Graphic" },
    uiux: { label: "UI/UX", anthemCategory: "Web/UI" },
    poster: { label: "Poster", anthemCategory: "Graphic" },
    social: { label: "Social", anthemCategory: "Graphic" },
    illustration: { label: "Illustration", anthemCategory: "Illustration" },
    branding: { label: "Branding", anthemCategory: "Branding" },
    typography: { label: "Typography", anthemCategory: "Graphic" },
  };

export const DRILL_DIFFICULTY_META: Record<DrillDifficulty, { label: string; hint: string }> = {
  easy: { label: "ง่าย", hint: "30–45 นาที" },
  medium: { label: "กลาง", hint: "1–2 ชม." },
  hard: { label: "ท้าทาย", hint: "2–4 ชม." },
};

export const CONSTRAINT_POOL: string[] = [
  "ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ",
  "ห้ามใช้ gradient",
  "ต้องทำงานได้ทั้งพื้นเข้มและพื้นอ่อน",
  "ใช้ฟอนต์เดียวทั้งชิ้น",
  "ห้ามใช้ stock photo",
  "ต้องมี negative space อย่างน้อย 40%",
  "ออกแบบให้เห็นชัดใน thumbnail 120px",
  "ใช้ geometric shape เป็นหลัก",
  "ห้ามใช้ drop shadow",
  "ต้องมี wordmark + symbol",
  "จำกัด canvas 1:1 เท่านั้น",
  "ใช้ grid 8px ทั้งชิ้น",
  "ห้ามใช้ illustration ตัวการ์ตูน",
  "ต้อง responsive 3 breakpoints",
  "ใช้ icon จาก Lucide/Feather เท่านั้น",
];

/** Rotates daily category Mon–Sun */
export const DAILY_CATEGORY_ROTATION: DrillCategory[] = [
  "logo",
  "uiux",
  "poster",
  "social",
  "illustration",
  "branding",
  "typography",
];

export const DRILL_PROMPTS: DrillPromptTemplate[] = [
  // logo — easy
  {
    id: "logo-e1",
    category: "logo",
    difficulty: "easy",
    brief: "ออกแบบ logo สำหรับร้านกาแฟชื่อ 'Bean & Bloom'",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ต้องมี wordmark + symbol"],
    timeHint: "45 นาที",
  },
  {
    id: "logo-e2",
    category: "logo",
    difficulty: "easy",
    brief: "สร้าง monogram logo จากตัวอักษร 'SK' สำหรับ personal brand",
    constraints: ["ใช้ geometric shape เป็นหลัก", "ห้ามใช้ gradient"],
    timeHint: "30 นาที",
  },
  // logo — medium
  {
    id: "logo-m1",
    category: "logo",
    difficulty: "medium",
    brief: "ออกแบบ logo system สำหรับ startup ด้าน sustainability ชื่อ 'GreenLoop'",
    constraints: ["ต้องทำงานได้ทั้งพื้นเข้มและพื้นอ่อน", "มี primary + icon-only variant"],
    timeHint: "90 นาที",
  },
  {
    id: "logo-m2",
    category: "logo",
    difficulty: "medium",
    brief: "Rebrand logo สำหรับ fitness studio 'Pulse Lab' ให้ดู modern แต่ยังรู้ว่าเป็น gym",
    constraints: ["ใช้ฟอนต์เดียวทั้งชิ้น", "ต้องออกแบบให้เห็นชัดใน thumbnail 120px"],
    timeHint: "2 ชม.",
  },
  // logo — hard
  {
    id: "logo-h1",
    category: "logo",
    difficulty: "hard",
    brief:
      "ออกแบบ logo + sub-brand lockup สำหรับ media group ที่มี 3 vertical (news, podcast, events)",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ต้องมี negative space อย่างน้อย 40%"],
    timeHint: "3 ชม.",
  },
  {
    id: "logo-h2",
    category: "logo",
    difficulty: "hard",
    brief: "สร้าง animated logo concept (static frame) สำหรับ tech conference 'DevWave 2026'",
    constraints: ["ห้ามใช้ drop shadow", "ต้อง scalable ตั้งแต่ favicon ถึง billboard"],
    timeHint: "4 ชม.",
  },

  // uiux — easy
  {
    id: "uiux-e1",
    category: "uiux",
    difficulty: "easy",
    brief: "ออกแบบ mobile login screen สำหรับแอปจองคิวร้านตัดผม",
    constraints: ["ใช้ grid 8px ทั้งชิ้น", "ต้อง responsive 3 breakpoints"],
    timeHint: "45 นาที",
  },
  {
    id: "uiux-e2",
    category: "uiux",
    difficulty: "easy",
    brief: "สร้าง empty state screen สำหรับ to-do app ที่ยังไม่มีรายการ",
    constraints: ["ใช้ icon จาก Lucide/Feather เท่านั้น", "ห้ามใช้ stock photo"],
    timeHint: "30 นาที",
  },
  // uiux — medium
  {
    id: "uiux-m1",
    category: "uiux",
    difficulty: "medium",
    brief: "ออกแบบ dashboard overview สำหรับ freelancer ที่แสดงรายได้, งานค้าง, และ deadline",
    constraints: ["ใช้ฟอนต์เดียวทั้งชิ้น", "ต้อง responsive 3 breakpoints"],
    timeHint: "2 ชม.",
  },
  {
    id: "uiux-m2",
    category: "uiux",
    difficulty: "medium",
    brief: "Redesign checkout flow 3 steps สำหรับ e-commerce เสื้อผ้า",
    constraints: ["ใช้ grid 8px ทั้งชิ้น", "ต้องมี negative space อย่างน้อย 40%"],
    timeHint: "90 นาที",
  },
  // uiux — hard
  {
    id: "uiux-h1",
    category: "uiux",
    difficulty: "hard",
    brief:
      "ออกแบบ design system starter: color tokens, typography scale, button + input components",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ต้อง responsive 3 breakpoints"],
    timeHint: "4 ชม.",
  },
  {
    id: "uiux-h2",
    category: "uiux",
    difficulty: "hard",
    brief: "สร้าง onboarding flow 5 screens สำหรับ fintech app พร้อม micro-interaction notes",
    constraints: ["ห้ามใช้ stock photo", "ใช้ icon จาก Lucide/Feather เท่านั้น"],
    timeHint: "3 ชม.",
  },

  // poster — easy
  {
    id: "poster-e1",
    category: "poster",
    difficulty: "easy",
    brief: "ออกแบบ poster A3 สำหรับ workshop 'Typography Basics' วันที่ 15 มี.ค.",
    constraints: ["ใช้ฟอนต์เดียวทั้งชิ้น", "ต้องมี negative space อย่างน้อย 40%"],
    timeHint: "45 นาที",
  },
  {
    id: "poster-e2",
    category: "poster",
    difficulty: "easy",
    brief: "สร้าง sale poster สำหรับร้านหนังสือ online flash sale 50%",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ห้ามใช้ gradient"],
    timeHint: "30 นาที",
  },
  // poster — medium
  {
    id: "poster-m1",
    category: "poster",
    difficulty: "medium",
    brief: "ออกแบบ event poster สำหรับ indie music festival 'Soundscape BKK'",
    constraints: ["ห้ามใช้ stock photo", "ต้องออกแบบให้เห็นชัดใน thumbnail 120px"],
    timeHint: "2 ชม.",
  },
  {
    id: "poster-m2",
    category: "poster",
    difficulty: "medium",
    brief: "สร้าง movie poster concept สำหรับหนังสั้นไทยเรื่อง 'รถไฟกลางคืน'",
    constraints: ["ใช้ geometric shape เป็นหลัก", "ห้ามใช้ drop shadow"],
    timeHint: "90 นาที",
  },
  // poster — hard
  {
    id: "poster-h1",
    category: "poster",
    difficulty: "hard",
    brief: "ออกแบบ poster series 3 แผ่น สำหรับ campaign รณรงค์สิ่งแวดล้อม 'Zero Waste Week'",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ต้องมี negative space อย่างน้อย 40%"],
    timeHint: "4 ชม.",
  },
  {
    id: "poster-h2",
    category: "poster",
    difficulty: "hard",
    brief: "สร้าง typographic poster ที่เล่า story ด้วยตัวอักษรอย่างเดียว (no imagery)",
    constraints: ["ใช้ฟอนต์เดียวทั้งชิ้น", "ห้ามใช้ illustration ตัวการ์ตูน"],
    timeHint: "3 ชม.",
  },

  // social — easy
  {
    id: "social-e1",
    category: "social",
    difficulty: "easy",
    brief: "ออกแบบ Instagram carousel 5 slides แนะนำ 5 tips สำหรับ freelancer ใหม่",
    constraints: ["จำกัด canvas 1:1 เท่านั้น", "ใช้ grid 8px ทั้งชิ้น"],
    timeHint: "45 นาที",
  },
  {
    id: "social-e2",
    category: "social",
    difficulty: "easy",
    brief: "สร้าง LinkedIn banner สำหรับ graphic designer portfolio",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ต้องออกแบบให้เห็นชัดใน thumbnail 120px"],
    timeHint: "30 นาที",
  },
  // social — medium
  {
    id: "social-m1",
    category: "social",
    difficulty: "medium",
    brief: "ออกแบบ social media kit สำหรับ product launch: feed post + story + cover",
    constraints: ["ต้อง responsive 3 breakpoints", "ใช้ฟอนต์เดียวทั้งชิ้น"],
    timeHint: "2 ชม.",
  },
  {
    id: "social-m2",
    category: "social",
    difficulty: "medium",
    brief: "สร้าง quote card template 5 variations สำหรับ personal brand coach",
    constraints: ["จำกัด canvas 1:1 เท่านั้น", "ห้ามใช้ gradient"],
    timeHint: "90 นาที",
  },
  // social — hard
  {
    id: "social-h1",
    category: "social",
    difficulty: "hard",
    brief: "ออกแบบ animated social ad concept (static frames) สำหรับ SaaS product 15 วินาที",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ห้ามใช้ stock photo"],
    timeHint: "4 ชม.",
  },
  {
    id: "social-h2",
    category: "social",
    difficulty: "hard",
    brief: "สร้าง cohesive feed grid 9 posts ที่เล่า brand story ของ specialty coffee roaster",
    constraints: ["จำกัด canvas 1:1 เท่านั้น", "ต้องมี negative space อย่างน้อย 40%"],
    timeHint: "3 ชม.",
  },

  // illustration — easy
  {
    id: "ill-e1",
    category: "illustration",
    difficulty: "easy",
    brief:
      "วาด icon set 6 icons สำหรับ productivity app (task, calendar, note, timer, folder, star)",
    constraints: ["ใช้ geometric shape เป็นหลัก", "ห้ามใช้ gradient"],
    timeHint: "45 นาที",
  },
  {
    id: "ill-e2",
    category: "illustration",
    difficulty: "easy",
    brief: "สร้าง spot illustration สำหรับ blog header เรื่อง 'working from home'",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ห้ามใช้ illustration ตัวการ์ตูน"],
    timeHint: "30 นาที",
  },
  // illustration — medium
  {
    id: "ill-m1",
    category: "illustration",
    difficulty: "medium",
    brief: "วาด character illustration 2 poses สำหรับ edtech app mascot",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ต้อง scalable เป็น SVG"],
    timeHint: "2 ชม.",
  },
  {
    id: "ill-m2",
    category: "illustration",
    difficulty: "medium",
    brief: "สร้าง isometric scene สำหรับ landing page ของ co-working space",
    constraints: ["ห้ามใช้ drop shadow", "ใช้ geometric shape เป็นหลัก"],
    timeHint: "90 นาที",
  },
  // illustration — hard
  {
    id: "ill-h1",
    category: "illustration",
    difficulty: "hard",
    brief: "วาด editorial illustration สำหรับ magazine cover เรื่อง 'Future of Work in Thailand'",
    constraints: ["ห้ามใช้ stock photo", "ต้องมี negative space อย่างน้อย 40%"],
    timeHint: "4 ชม.",
  },
  {
    id: "ill-h2",
    category: "illustration",
    difficulty: "hard",
    brief: "สร้าง illustration system: 12 scenes + 8 spot icons ใน style เดียวกัน",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ห้ามใช้ gradient"],
    timeHint: "3 ชม.",
  },

  // branding — easy
  {
    id: "brand-e1",
    category: "branding",
    difficulty: "easy",
    brief: "สร้าง mood board + color palette 5 สี สำหรับ artisan bakery brand",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ต้องมี negative space อย่างน้อย 40%"],
    timeHint: "45 นาที",
  },
  {
    id: "brand-e2",
    category: "branding",
    difficulty: "easy",
    brief: "ออกแบบ business card mockup สำหรับ freelance photographer",
    constraints: ["ใช้ฟอนต์เดียวทั้งชิ้น", "ห้ามใช้ gradient"],
    timeHint: "30 นาที",
  },
  // branding — medium
  {
    id: "brand-m1",
    category: "branding",
    difficulty: "medium",
    brief:
      "สร้าง mini brand guide: logo usage, colors, typography, do/don't สำหรับ skincare startup",
    friendlyTitle: "สร้าง mini brand guide สำหรับ skincare startup",
    friendlyDescription:
      "ออกแบบคู่มือแบรนด์ย่อ ๆ ครอบคลุมการใช้โลโก้ สี ฟอนต์ และ Do / Don't ให้ทีมใช้งานได้จริง",
    deliverables: [
      "ตัวอย่างการใช้โลโก้ สี และฟอนต์",
      "Do's / Don'ts ที่เข้าใจง่าย",
      "ออกแบบให้ใช้ได้ทั้งพื้นเข้มและพื้นอ่อน",
      "จัด layout ด้วย grid 8px",
    ],
    previewImage: "/drill-previews/branding.svg",
    constraints: ["ต้องทำงานได้ทั้งพื้นเข้มและพื้นอ่อน", "ใช้ grid 8px ทั้งชิ้น"],
    timeHint: "2 ชม.",
  },
  {
    id: "brand-m2",
    category: "branding",
    difficulty: "medium",
    brief: "ออกแบบ packaging concept สำหรับ craft beer 3 variants (IPA, Lager, Stout)",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ต้องออกแบบให้เห็นชัดใน thumbnail 120px"],
    timeHint: "90 นาที",
  },
  // branding — hard
  {
    id: "brand-h1",
    category: "branding",
    difficulty: "hard",
    brief:
      "Rebrand identity ครบชุด: logo, palette, typography, pattern, social templates สำหรับ hotel boutique",
    constraints: ["ต้องทำงานได้ทั้งพื้นเข้มและพื้นอ่อน", "ต้องมี negative space อย่างน้อย 40%"],
    timeHint: "4 ชม.",
  },
  {
    id: "brand-h2",
    category: "branding",
    difficulty: "hard",
    brief: "สร้าง brand architecture visual สำหรับ holding company ที่มี 4 sub-brands",
    constraints: ["ใช้ฟอนต์เดียวทั้งชิ้น", "ห้ามใช้ drop shadow"],
    timeHint: "3 ชม.",
  },

  // typography — easy
  {
    id: "type-e1",
    category: "typography",
    difficulty: "easy",
    brief: "จัด layout หน้า quote ด้วยฟอนต์ serif + sans-serif คู่กัน สำหรับ Instagram post",
    constraints: ["ใช้ฟอนต์เดียวทั้งชิ้น", "จำกัด canvas 1:1 เท่านั้น"],
    timeHint: "30 นาที",
    freeHint: "ลองเล่น hierarchy ด้วย size และ weight",
  },
  {
    id: "type-e2",
    category: "typography",
    difficulty: "easy",
    brief: "ออกแบบ typographic lockup สำหรับ event title 'Design Meetup BKK'",
    constraints: ["ห้ามใช้ gradient", "ต้องมี negative space อย่างน้อย 40%"],
    timeHint: "45 นาที",
  },
  // typography — medium
  {
    id: "type-m1",
    category: "typography",
    difficulty: "medium",
    brief: "สร้าง type specimen poster แสดง font pairing 2 ฟอนต์ พร้อม use cases",
    constraints: ["ใช้ฟอนต์เดียวทั้งชิ้น", "ใช้ grid 8px ทั้งชิ้น"],
    timeHint: "90 นาที",
  },
  {
    id: "type-m2",
    category: "typography",
    difficulty: "medium",
    brief: "ออกแบบ editorial spread 2 หน้า เน้น typographic hierarchy สำหรับ magazine article",
    constraints: ["ต้องมี negative space อย่างน้อย 40%", "ห้ามใช้ stock photo"],
    timeHint: "2 ชม.",
  },
  // typography — hard
  {
    id: "type-h1",
    category: "typography",
    difficulty: "hard",
    brief: "สร้าง kinetic typography concept (static keyframes) สำหรับ brand manifesto 30 วินาที",
    constraints: ["ใช้สีได้ไม่เกิน 2 สี + ขาว/ดำ", "ใช้ฟอนต์เดียวทั้งชิ้น"],
    timeHint: "4 ชม.",
  },
  {
    id: "type-h2",
    category: "typography",
    difficulty: "hard",
    brief: "ออกแบบ variable font showcase ที่เล่น weight axis อย่าง creative",
    constraints: ["ห้ามใช้ gradient", "ต้องออกแบบให้เห็นชัดใน thumbnail 120px"],
    timeHint: "3 ชม.",
  },
];
