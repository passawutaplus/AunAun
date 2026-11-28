/**
 * FOR YOU ranking for the weekly e-mail: the same rules as My Studio → Overview (owner 2026-11-28: "posts
 * many Graphic works → Graphic open calls first"). Copied from Anthem-Code/src/redesign/studio/forYou.ts and
 * src/redesign/lib/categoryWords.ts because an edge function cannot import the web app; the test
 * Anthem-Code/src/redesign/studio/__tests__/forYouWeeklySync.test.ts fails when the two drift apart.
 * No imports, so the web app's tests can load this file.
 */

export const SC_CATEGORIES = [
  "Illustration",
  "Graphic",
  "Branding",
  "Typography",
  "Painting",
  "Drawing",
  "Printmaking",
  "Risograph",
  "Collage",
  "Zine",
  "Photography",
  "Motion",
  "3D",
  "Sculpture",
  "Ceramics",
  "Textile",
  "Fashion",
  "Product",
  "Character",
  "UX/UI",
  "Mixed Media",
  "Other",
] as const;

export type ScCategory = (typeof SC_CATEGORIES)[number];

export function isScCategory(value: string | null | undefined): value is ScCategory {
  return !!value && (SC_CATEGORIES as readonly string[]).includes(value);
}

/** Words that point to a CATEGORY in free text (open call titles and descriptions, Thai and English). */
export const CATEGORY_WORDS: Record<ScCategory, readonly string[]> = {
  Illustration: ["illustration", "illustrator", "ภาพประกอบ", "วาดภาพประกอบ"],
  Graphic: ["graphic", "กราฟิก", "กราฟฟิก", "poster", "โปสเตอร์", "graphic design"],
  Branding: [
    "branding",
    "brand",
    "แบรนด์",
    "logo",
    "โลโก้",
    "identity",
    "อัตลักษณ์",
    "ตราสัญลักษณ์",
  ],
  Typography: ["typography", "typeface", "font", "ฟอนต์", "ตัวอักษร", "lettering"],
  Painting: ["painting", "จิตรกรรม", "ภาพวาด", "สีน้ำ", "สีน้ำมัน", "acrylic", "อะคริลิก"],
  Drawing: ["drawing", "วาดเส้น", "sketch", "สเก็ตช์", "ลายเส้น"],
  Printmaking: ["printmaking", "ภาพพิมพ์", "screen print", "ซิลค์สกรีน", "etching"],
  Risograph: ["risograph", "riso", "ริโซ"],
  Collage: ["collage", "คอลลาจ", "ปะติด"],
  Zine: ["zine", "ซีน", "publication", "สิ่งพิมพ์", "หนังสือภาพ"],
  Photography: ["photography", "photo", "photographer", "ภาพถ่าย", "ถ่ายภาพ", "ช่างภาพ"],
  Motion: [
    "motion",
    "animation",
    "แอนิเมชัน",
    "อนิเมชัน",
    "video",
    "วิดีโอ",
    "short film",
    "หนังสั้น",
    "ภาพเคลื่อนไหว",
  ],
  "3D": ["3d", "สามมิติ", "3 มิติ", "render", "blender"],
  Sculpture: ["sculpture", "ประติมากรรม", "installation", "ศิลปะจัดวาง"],
  Ceramics: ["ceramic", "ceramics", "เซรามิก", "pottery", "เครื่องปั้น"],
  Textile: ["textile", "สิ่งทอ", "ผ้าทอ", "fabric"],
  Fashion: ["fashion", "แฟชั่น", "เครื่องแต่งกาย", "costume"],
  Product: [
    "product design",
    "ผลิตภัณฑ์",
    "industrial design",
    "packaging",
    "บรรจุภัณฑ์",
    "furniture",
    "เฟอร์นิเจอร์",
  ],
  Character: ["character", "คาแรคเตอร์", "คาแรกเตอร์", "mascot", "มาสคอต", "art toy", "อาร์ตทอย"],
  "UX/UI": ["ux", "ui", "user interface", "แอปพลิเคชัน", "website", "เว็บไซต์"],
  "Mixed Media": ["mixed media", "สื่อผสม", "contemporary art", "ศิลปะร่วมสมัย"],
  Other: [],
};

const LATIN = /^[a-z0-9 ]+$/i;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Latin words need word edges ("ui" must not hit "build"); Thai has no spaces, so it matches anywhere. */
export function hasWord(text: string, word: string): boolean {
  const w = word.trim().toLowerCase();
  if (!w) return false;
  if (LATIN.test(w)) return new RegExp(`(^|[^a-z0-9])${escapeRe(w)}($|[^a-z0-9])`).test(text);
  return text.includes(w);
}

export type WorkSignal = {
  status: string | null;
  sc_category: string | null;
  tags: string[] | null;
  tools: string[] | null;
};

/** Each published work counts 3 for its CATEGORY, 1 per tag and tool; profile CATEGORIES count 2. */
export function interestWords(
  works: readonly WorkSignal[],
  profileCats: readonly string[] | null | undefined,
): Map<string, number> {
  const w = new Map<string, number>();
  const add = (word: string, n: number) => {
    const k = word.trim().toLowerCase().replace(/^#+/, "");
    if (k.length < 2) return;
    w.set(k, (w.get(k) ?? 0) + n);
  };
  const addCat = (cat: string, n: number) => {
    if (!isScCategory(cat)) return;
    add(cat, n);
    for (const word of CATEGORY_WORDS[cat]) add(word, n);
  };
  for (const work of works) {
    if (work.status !== "Published") continue;
    if (work.sc_category) addCat(work.sc_category, 3);
    for (const t of work.tags ?? []) if (t && !t.includes(":")) add(t, 1);
    for (const t of work.tools ?? []) if (t) add(t, 1);
  }
  for (const c of profileCats ?? []) addCat(c, 2);
  return w;
}

export type OpenCallText = {
  id: string;
  title: string;
  description: string | null;
  insights: unknown;
  ends_on: string | null;
};

const textOf = (e: OpenCallText) =>
  `${e.title} ${e.description ?? ""} ${e.insights ? JSON.stringify(e.insights) : ""}`.toLowerCase();

/** Open calls that fit the person best first, then the ones closing soonest; `score` 0 = no fit. */
export function scoreOpenCalls<T extends OpenCallText>(
  calls: readonly T[],
  words: Map<string, number>,
): Array<{ call: T; score: number }> {
  const scored = calls.map((call) => {
    const text = textOf(call);
    let score = 0;
    for (const [word, n] of words) if (hasWord(text, word)) score += n;
    return { call, score };
  });
  return scored.sort(
    (a, b) =>
      b.score - a.score || (a.call.ends_on ?? "9999").localeCompare(b.call.ends_on ?? "9999"),
  );
}

/** Same order as My Studio's rankOpenCalls(). */
export function rankOpenCalls<T extends OpenCallText>(
  calls: readonly T[],
  words: Map<string, number>,
): T[] {
  return scoreOpenCalls(calls, words).map((x) => x.call);
}
