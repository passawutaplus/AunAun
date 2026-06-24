import type { ProfanityCategory } from "@/data/profanityWords";

export const COMMUNITY_STRIKE_LADDER = [
  { strikes: "1–2", effect: "เตือน — ยังโพสต์ได้", banDays: 0 },
  { strikes: "3", effect: "จำกัดการโพสต์", banDays: 3 },
  { strikes: "4–5", effect: "จำกัดการโพสต์", banDays: 7 },
  { strikes: "6+", effect: "จำกัดการโพสต์", banDays: 30 },
] as const;

export const COMMUNITY_STRIKE_RESET_DAYS = 90;

export const COMMUNITY_MODERATION_CONTEXTS = {
  post_title: "community_post_title",
  post_body: "community_post_body",
  post_tag: "community_post_tag",
  comment: "community_comment",
  reply: "community_comment_reply",
} as const;

export type CommunityModerationContext =
  (typeof COMMUNITY_MODERATION_CONTEXTS)[keyof typeof COMMUNITY_MODERATION_CONTEXTS];

export const COMMUNITY_FIELD_RULES = {
  post_title: {
    label: "หัวข้อโพสต์",
    maxLength: 120,
    maskOnProfanity: true,
    blockOnProfanity: false,
    recordStrike: true,
  },
  post_body: {
    label: "เนื้อหาโพสต์",
    maxLength: 3000,
    maskOnProfanity: true,
    blockOnProfanity: false,
    recordStrike: true,
  },
  post_tag: {
    label: "แท็ก",
    maxLength: 40,
    maskOnProfanity: false,
    blockOnProfanity: true,
    recordStrike: true,
  },
  comment: {
    label: "ความคิดเห็น",
    maxLength: 800,
    maskOnProfanity: true,
    blockOnProfanity: false,
    recordStrike: true,
  },
} as const;

export const COMMUNITY_CONTENT_RULES = [
  {
    id: "profanity",
    title: "ห้ามคำหยาบ / ดูหมิ่น / คุกคาม",
    desc: "ทั้งภาษาไทยและอังกฤษ รวมถึงการสะกดเลี่ยง (เว้นวรรค, ตัวเลขแทนตัวอักษร, ตัวซ้ำ)",
  },
  {
    id: "hate",
    title: "ห้าม hate speech และเหยียดกลุ่มคน",
    desc: "เชื้อชาติ เพศ ศาสนา ความพิการ หรือสถานะใดๆ",
  },
  {
    id: "sexual",
    title: "ห้ามเนื้อหาทางเพศโจ่งแจ้ง",
    desc: "ข้อความหรือรูป NSFW ที่ไม่เกี่ยวกับงานออกแบบอย่างเหมาะสม",
  },
  {
    id: "spam",
    title: "ห้าม spam / โฆษณาหลอกลวง",
    desc: "ลิงก์ฟิชชิ่ง โปรโมทซ้ำๆ หรือเชิญกลุ่มนอกแพลตฟอร์มโดยไม่เกี่ยวข้อง",
  },
  {
    id: "harassment",
    title: "ห้ามคุกคาม / ข่มขู่ / doxx",
    desc: "เผยข้อมูลส่วนตัวผู้อื่น หรือกดดันในคอมเมนต์",
  },
  {
    id: "ip",
    title: "เคารพลิขสิทธิ์",
    desc: "ไม่โพสต์งานที่ละเมิด IP หรืออ้างผลงานผู้อื่น",
  },
] as const;

export const PROFANITY_CATEGORY_LABELS: Record<ProfanityCategory, string> = {
  thai_vulgar: "คำหยาบ (ไทย)",
  thai_insult: "คำดูหมิ่น (ไทย)",
  thai_sexual: "เนื้อหาทางเพศหยาบ",
  english_vulgar: "คำหยาบ (อังกฤษ)",
  english_slurs: "คำเหยียด",
  harassment: "การคุกคาม / ข่มขู่",
};

export const COMMUNITY_GUIDELINES_PATH = "/legal/community";

export const COMMUNITY_PROFANITY_WARNING =
  "พบคำที่อาจละเมิดกฎชุมชน — ระบบจะแทนด้วย *** และอาจนับ strike";

export const COMMUNITY_TAG_BLOCKED_MSG =
  "แท็กมีคำที่ไม่อนุญาต — กรุณาแก้ไขก่อนโพสต์";
