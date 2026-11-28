import type { ScCategory } from "./categories";

/**
 * Words that point to a CATEGORY in free text (open call titles and descriptions, Thai and English).
 * Used to match open calls to a person's kind of work (My Studio → "FOR YOU").
 */
export const CATEGORY_WORDS: Record<ScCategory, readonly string[]> = {
  Illustration: ["illustration", "illustrator", "ภาพประกอบ", "วาดภาพประกอบ"],
  Graphic: ["graphic", "กราฟิก", "กราฟฟิก", "poster", "โปสเตอร์", "graphic design"],
  Branding: ["branding", "brand", "แบรนด์", "logo", "โลโก้", "identity", "อัตลักษณ์", "ตราสัญลักษณ์"],
  Typography: ["typography", "typeface", "font", "ฟอนต์", "ตัวอักษร", "lettering"],
  Painting: ["painting", "จิตรกรรม", "ภาพวาด", "สีน้ำ", "สีน้ำมัน", "acrylic", "อะคริลิก"],
  Drawing: ["drawing", "วาดเส้น", "sketch", "สเก็ตช์", "ลายเส้น"],
  Printmaking: ["printmaking", "ภาพพิมพ์", "screen print", "ซิลค์สกรีน", "etching"],
  Risograph: ["risograph", "riso", "ริโซ"],
  Collage: ["collage", "คอลลาจ", "ปะติด"],
  Zine: ["zine", "ซีน", "publication", "สิ่งพิมพ์", "หนังสือภาพ"],
  Photography: ["photography", "photo", "photographer", "ภาพถ่าย", "ถ่ายภาพ", "ช่างภาพ"],
  Motion: ["motion", "animation", "แอนิเมชัน", "อนิเมชัน", "video", "วิดีโอ", "short film", "หนังสั้น", "ภาพเคลื่อนไหว"],
  "3D": ["3d", "สามมิติ", "3 มิติ", "render", "blender"],
  Sculpture: ["sculpture", "ประติมากรรม", "installation", "ศิลปะจัดวาง"],
  Ceramics: ["ceramic", "ceramics", "เซรามิก", "pottery", "เครื่องปั้น"],
  Textile: ["textile", "สิ่งทอ", "ผ้าทอ", "fabric"],
  Fashion: ["fashion", "แฟชั่น", "เครื่องแต่งกาย", "costume"],
  Product: ["product design", "ผลิตภัณฑ์", "industrial design", "packaging", "บรรจุภัณฑ์", "furniture", "เฟอร์นิเจอร์"],
  Character: ["character", "คาแรคเตอร์", "คาแรกเตอร์", "mascot", "มาสคอต", "art toy", "อาร์ตทอย"],
  "UX/UI": ["ux", "ui", "user interface", "แอปพลิเคชัน", "website", "เว็บไซต์"],
  "Mixed Media": ["mixed media", "สื่อผสม", "contemporary art", "ศิลปะร่วมสมัย"],
  Other: [],
};

const LATIN = /^[a-z0-9 ]+$/i;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Does `text` (already lower-case) contain the word? Latin words need word edges ("ui" must not hit
 * "build"); Thai has no spaces between words, so a Thai word matches anywhere.
 */
export function hasWord(text: string, word: string): boolean {
  const w = word.trim().toLowerCase();
  if (!w) return false;
  if (LATIN.test(w)) return new RegExp(`(^|[^a-z0-9])${escape(w)}($|[^a-z0-9])`).test(text);
  return text.includes(w);
}
