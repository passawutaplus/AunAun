/** Official Thai province names (77) — canonical labels for address dropdowns. */
export const THAI_PROVINCES = [
  "กรุงเทพมหานคร",
  "กระบี่",
  "กาญจนบุรี",
  "กาฬสินธุ์",
  "กำแพงเพชร",
  "ขอนแก่น",
  "จันทบุรี",
  "ฉะเชิงเทรา",
  "ชลบุรี",
  "ชัยนาท",
  "ชัยภูมิ",
  "ชุมพร",
  "เชียงราย",
  "เชียงใหม่",
  "ตรัง",
  "ตราด",
  "ตาก",
  "นครนายก",
  "นครปฐม",
  "นครพนม",
  "นครราชสีมา",
  "นครศรีธรรมราช",
  "นครสวรรค์",
  "นนทบุรี",
  "นราธิวาส",
  "น่าน",
  "บึงกาฬ",
  "บุรีรัมย์",
  "ปทุมธานี",
  "ประจวบคีรีขันธ์",
  "ปราจีนบุรี",
  "ปัตตานี",
  "พระนครศรีอยุธยา",
  "พังงา",
  "พัทลุง",
  "พิจิตร",
  "พิษณุโลก",
  "เพชรบุรี",
  "เพชรบูรณ์",
  "แพร่",
  "พะเยา",
  "ภูเก็ต",
  "มหาสารคาม",
  "มุกดาหาร",
  "แม่ฮ่องสอน",
  "ยโสธร",
  "ยะลา",
  "ร้อยเอ็ด",
  "ระนอง",
  "ระยอง",
  "ราชบุรี",
  "ลพบุรี",
  "ลำปาง",
  "ลำพูน",
  "เลย",
  "ศรีสะเกษ",
  "สกลนคร",
  "สงขลา",
  "สตูล",
  "สมุทรปราการ",
  "สมุทรสงคราม",
  "สมุทรสาคร",
  "สระแก้ว",
  "สระบุรี",
  "สิงห์บุรี",
  "สุโขทัย",
  "สุพรรณบุรี",
  "สุราษฎร์ธานี",
  "สุรินทร์",
  "หนองคาย",
  "หนองบัวลำภู",
  "อ่างทอง",
  "อำนาจเจริญ",
  "อุดรธานี",
  "อุตรดิตถ์",
  "อุทัยธานี",
  "อุบลราชธานี",
] as const;

export type ThaiProvince = (typeof THAI_PROVINCES)[number];

const PROVINCE_SET = new Set<string>(THAI_PROVINCES);

/** Common shorthand → canonical province name. */
const PROVINCE_ALIASES: Record<string, ThaiProvince> = {
  กทม: "กรุงเทพมหานคร",
  "กทม.": "กรุงเทพมหานคร",
  กรุงเทพ: "กรุงเทพมหานคร",
  กรุงเทพฯ: "กรุงเทพมหานคร",
  bangkok: "กรุงเทพมหานคร",
  Bangkok: "กรุงเทพมหานคร",
};

/** Map free-text / shorthand to an official province name when possible. */
export function normalizeThaiProvince(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (PROVINCE_SET.has(t)) return t;
  const aliased = PROVINCE_ALIASES[t] ?? PROVINCE_ALIASES[t.replace(/\.$/, "")];
  if (aliased) return aliased;
  const lower = t.toLowerCase();
  const byAlias = Object.entries(PROVINCE_ALIASES).find(([k]) => k.toLowerCase() === lower);
  if (byAlias) return byAlias[1];
  const exactIgnoreSpace = THAI_PROVINCES.find((p) => p.replace(/\s/g, "") === t.replace(/\s/g, ""));
  return exactIgnoreSpace ?? "";
}

export function isThaiProvince(raw: string | null | undefined): boolean {
  return PROVINCE_SET.has(normalizeThaiProvince(raw) || String(raw ?? "").trim());
}
