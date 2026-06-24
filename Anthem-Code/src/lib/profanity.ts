import {
  PROFANITY_CATEGORIES,
  PROFANITY_WORDS,
  PROFANITY_ALLOWLIST,
  type ProfanityCategory,
} from "@/data/profanityWords";
import {
  COMMUNITY_GUIDELINES_PATH,
  COMMUNITY_PROFANITY_WARNING,
} from "@/data/communityModerationPolicy";

const MASK = "***";

export { COMMUNITY_GUIDELINES_PATH, COMMUNITY_PROFANITY_WARNING };

export const PROFANITY_WARNING =
  "ไม่ควรใช้คำหยาบ — ระบบจะบันทึกและอาจจำกัดการโพสต์ชั่วคราว";

function collapseRepeats(text: string): string {
  return text.replace(/(.)\1{2,}/gu, "$1$1");
}

export function normalizeForMatch(text: string): string {
  let s = text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[@$]/g, "a")
    .replace(/0/g, "o")
    .replace(/1|!/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/[*_.\-]/g, "");

  s = s.replace(/(?<=[\u0E00-\u0E7F])\s+(?=[\u0E00-\u0E7F])/g, "");
  s = collapseRepeats(s);
  s = s.replace(/\bfck\b/g, "fuck");
  return s;
}

const wordToCategory = new Map<string, ProfanityCategory>();
for (const [cat, words] of Object.entries(PROFANITY_CATEGORIES) as [ProfanityCategory, string[]][]) {
  for (const w of words) {
    wordToCategory.set(w.toLowerCase(), cat);
  }
}

const patterns = PROFANITY_WORDS.map((word) => {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const spaced = escaped.split("").join("[\\s*._\\-]*");
  return { word, re: new RegExp(`(?:^|[^\\p{L}\\p{N}])${spaced}(?:[^\\p{L}\\p{N}]|$)`, "iu") };
});

export interface ProfanityMatch {
  term: string;
  category: ProfanityCategory | "unknown";
}

export interface ProfanityResult {
  hasProfanity: boolean;
  matches: string[];
  detailed: ProfanityMatch[];
}

function categorize(term: string): ProfanityCategory | "unknown" {
  return wordToCategory.get(term.toLowerCase()) ?? "unknown";
}

export function detectProfanity(text: string): ProfanityResult {
  const trimmed = text.trim();
  if (!trimmed) return { hasProfanity: false, matches: [], detailed: [] };

  const normalized = normalizeForMatch(trimmed);
  const matchSet = new Set<string>();

  for (const word of PROFANITY_WORDS) {
    if (PROFANITY_ALLOWLIST.includes(word)) continue;
    const w = normalizeForMatch(word);
    if (w.length < 2) continue;
    if (normalized.includes(w)) matchSet.add(word);
  }

  for (const { word, re } of patterns) {
    if (PROFANITY_ALLOWLIST.includes(word)) continue;
    const m = trimmed.match(re);
    if (m) {
      const hit = m[0].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").trim();
      if (hit) matchSet.add(word);
    }
  }

  const matches = Array.from(matchSet);
  return {
    hasProfanity: matches.length > 0,
    matches,
    detailed: matches.map((term) => ({ term, category: categorize(term) })),
  };
}

export function detectProfanityInFields(
  fields: Record<string, string>,
): ProfanityResult & { byField: Record<string, ProfanityResult> } {
  const byField: Record<string, ProfanityResult> = {};
  const allMatches = new Set<string>();
  const detailedMap = new Map<string, ProfanityMatch>();

  for (const [key, value] of Object.entries(fields)) {
    const r = detectProfanity(value);
    byField[key] = r;
    for (const m of r.matches) allMatches.add(m);
    for (const d of r.detailed) detailedMap.set(d.term, d);
  }

  const matches = Array.from(allMatches);
  return {
    hasProfanity: matches.length > 0,
    matches,
    detailed: Array.from(detailedMap.values()),
    byField,
  };
}

export function maskProfanity(text: string): string {
  let result = text;
  const sorted = [...PROFANITY_WORDS].sort((a, b) => b.length - a.length);
  for (const word of sorted) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "giu"), MASK);
  }
  return result;
}

const SPAM_PATTERNS = [
  /(?:https?:\/\/)?(?:t\.me|telegram\.me|line\.me)\/\S+/i,
  /(?:bit\.ly|tinyurl\.com|goo\.gl)\/\S+/i,
  /(?:รับงาน|หาเงิน).{0,20}(?:ง่าย|วันละ|รายได้)/iu,
  /(?:สนใจ|ทัก).{0,12}(?:dm|inbox|ไลน์)/iu,
];

export function detectCommunitySpam(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if ((t.match(/https?:\/\/\S+/gi) ?? []).length >= 4) return true;
  return SPAM_PATTERNS.some((re) => re.test(t));
}
