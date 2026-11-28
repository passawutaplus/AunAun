/**
 * Event search sentence → filters (owner 2026-11-28): "ฉันอยากไปงานวาดรูปฟรีที่เชียงใหม่เสาร์นี้"
 * → งานวาดรูป · ฟรี · เชียงใหม่ · เสาร์นี้. Rule based, no outside service.
 *
 * Thai has no spaces, so the sentence is scanned for known words (longest first): category words, "ฟรี",
 * provinces, time words, "ใกล้ฉัน". What is left is split where the known words were, everyday words
 * ("ฉัน", "อยาก", "ไป", "งาน", "ที่" …) are trimmed off both ends, and the rest become keywords. Keywords
 * that have a Thai / English twin (เซรามิก ↔ ceramic) carry both, joined by "|".
 * The server half is public.event_search (migration 20261129130000).
 */
import { PROVINCES, type Province } from "./thaiProvinces";

export type EventCategoryId = "exhibition" | "open_call" | "workshop" | "talk_forum" | "art_fair" | "meetup";

export type IntentKind = "category" | "topic" | "free" | "place" | "date" | "near" | "keyword";

/** One understood piece of the sentence; `start`/`end` index the text as typed (used to take a word back out). */
export type IntentToken = { kind: IntentKind; value: string; start: number; end: number; label: string };

export type DateRange = { from: string; to: string };

export type EventIntent = {
  /** Event types asked for (any of them). */
  categories: EventCategoryId[];
  /** Soft words: they move matching events up but never filter (from "วาดรูป" and friends). */
  boost: string[];
  free: boolean;
  provinces: Province[];
  nearMe: boolean;
  /** Days the event must be on (overlap), local days YYYY-MM-DD. Several time words → the span of them all. */
  range: DateRange | null;
  /** Each item: one keyword, its twins joined by "|"; every item must match. */
  keywords: string[];
  tokens: IntentToken[];
  /** Nothing to search for. */
  empty: boolean;
};

/* ------------------------------------------------------------------ words */

export const CATEGORY_LABEL: Record<EventCategoryId, string> = {
  open_call: "Open Call",
  exhibition: "Exhibition",
  workshop: "Workshop",
  talk_forum: "Talk",
  art_fair: "Art Fair",
  meetup: "Meetup",
};

const CATEGORY_WORDS: Record<EventCategoryId, string[]> = {
  workshop: [
    "เวิร์กช็อป", "เวิร์คช็อป", "เวิร์กชอป", "เวิร์คชอป", "เวิร์กชอบ", "เวิร์คชอบ", "workshop", "workshops", "work shop",
    "คลาส", "class", "classes", "อบรม", "คอร์ส", "course",
  ],
  art_fair: [
    "ตลาดนัด", "ตลาด", "แฟร์", "fair", "fairs", "art fair", "อาร์ตแฟร์", "บูธ", "บูท", "booth", "market", "มาร์เก็ต",
    "มาร์เกต", "flea market", "มหกรรม",
  ],
  open_call: [
    "ประกวด", "ส่งประกวด", "open call", "opencall", "open-call", "โอเพ่นคอล", "รับสมัคร", "เปิดรับ", "เปิดรับผลงาน",
    "ส่งผลงาน", "ส่งงาน", "competition", "contest", "ชิงรางวัล", "ทุน", "grant", "residency", "เรซิเดนซี", "เรซิเดนซี่",
  ],
  talk_forum: [
    "ทอล์ก", "ทอล์ค", "ทอค", "talk", "talks", "สัมมนา", "seminar", "forum", "ฟอรั่ม", "ฟอรัม", "เสวนา", "บรรยาย",
    "lecture", "panel", "conference",
  ],
  exhibition: [
    "นิทรรศการ", "นิทัศการ", "exhibition", "exhibitions", "exhibit", "ดูงาน", "ดูงานศิลปะ", "แกลเลอรี่", "แกลเลอรี",
    "แกลลอรี่", "แกลอรี่", "gallery", "galleries", "art show", "เอ็กซิบิชั่น", "โชว์งาน", "พิพิธภัณฑ์", "museum",
  ],
  meetup: [
    "meetup", "meet up", "meet-up", "มีตอัพ", "มีทอัพ", "sketch club", "sketchclub", "สเก็ตช์คลับ", "สเก็ตคลับ",
    "urban sketch", "urban sketchers", "เออร์เบินสเก็ตช์", "พบปะ", "hangout", "แฮงเอาท์", "คลับ", "club",
  ],
};

/**
 * "วาดรูป" → a Workshop unless the sentence names another type ("ประกวดวาดรูป" = an open call about drawing);
 * either way it lifts events that talk about drawing.
 */
const TOPICS: { words: string[]; category: EventCategoryId; label: string; boost: string[] }[] = [
  {
    words: [
      "วาดรูป", "วาดภาพ", "วาดเขียน", "ระบายสี", "สีน้ำ", "สีอะคริลิค", "สีน้ำมัน", "สเก็ตช์", "สเก็ต", "drawing", "draw",
      "painting", "paint", "sketch", "sketching", "watercolor", "watercolour",
    ],
    category: "workshop",
    label: "งานวาดรูป",
    boost: ["วาด", "ระบายสี", "สีน้ำ", "สเก็ต", "drawing", "paint", "sketch", "watercolor"],
  },
];

const FREE_WORDS = [
  "ฟรี", "free", "เข้าฟรี", "เข้าชมฟรี", "ฟรีค่าเข้า", "ไม่เสียเงิน", "ไม่เสียค่าใช้จ่าย", "ไม่มีค่าใช้จ่าย", "ไม่มีค่าเข้า",
  "ไม่เสียค่าเข้า", "free entry", "free admission",
];

export const NEAR_WORD = "ใกล้ฉัน";
const NEAR_WORDS = [
  NEAR_WORD, "ใกล้ๆ", "ใกล้ ๆ", "ใกล้บ้าน", "ใกล้ตัว", "ใกล้เรา", "ใกล้ผม", "ใกล้หนู", "แถวนี้", "แถวบ้าน", "ใกล้",
  "near me", "nearby", "around me", "near",
];

/** Words that look like ours but mean something else; kept whole as keywords. */
const LITERALS = ["ฟรีแลนซ์", "ฟรีแลนซ์", "freelance", "การตลาด", "เผยแพร่", "ตากอากาศ", "ทุนนิยม", "สเก็ตบอร์ด", "ตลาดน้อย"];

const DOW_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
const DOW_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTH_TH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const MONTH_TH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MONTH_TH_SPOKEN = [["มกรา"], ["กุมภา"], ["มีนา"], ["เมษา"], ["พฤษภา"], ["มิถุนา"], ["กรกฎา"], ["สิงหา"], ["กันยา"], ["ตุลา"], ["พฤศจิกา", "พฤศจิ"], ["ธันวา"]];
const MONTH_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTH_EN_SHORT = [["jan"], ["feb"], ["mar"], ["apr"], [], ["jun"], ["jul"], ["aug"], ["sep", "sept"], ["oct"], ["nov"], ["dec"]];

/** Time words → a key that dateRange() turns into days. */
function dateWords(): [string, string][] {
  const out: [string, string][] = [
    ["วันนี้", "today"], ["today", "today"], ["คืนนี้", "tonight"], ["tonight", "tonight"],
    ["ตอนนี้", "now"], ["now", "now"], ["ช่วงนี้", "soon"], ["เร็วๆนี้", "soon"], ["เร็ว ๆ นี้", "soon"], ["soon", "soon"],
    ["พรุ่งนี้", "tomorrow"], ["tomorrow", "tomorrow"], ["มะรืนนี้", "dayafter"], ["มะรืน", "dayafter"],
    ["สุดสัปดาห์นี้", "weekend"], ["สุดสัปดาห์", "weekend"], ["เสาร์อาทิตย์นี้", "weekend"], ["เสาร์อาทิตย์", "weekend"],
    ["เสาร์-อาทิตย์", "weekend"], ["เสาร์ อาทิตย์", "weekend"], ["วันหยุดนี้", "weekend"], ["วันหยุด", "weekend"],
    ["this weekend", "weekend"], ["weekend", "weekend"],
    ["สุดสัปดาห์หน้า", "nextweekend"], ["เสาร์อาทิตย์หน้า", "nextweekend"], ["next weekend", "nextweekend"],
    ["สัปดาห์นี้", "thisweek"], ["อาทิตย์นี้", "thisweek"], ["วีคนี้", "thisweek"], ["this week", "thisweek"],
    ["สัปดาห์หน้า", "nextweek"], ["อาทิตย์หน้า", "nextweek"], ["วีคหน้า", "nextweek"], ["next week", "nextweek"],
    ["เดือนนี้", "thismonth"], ["this month", "thismonth"], ["เดือนหน้า", "nextmonth"], ["next month", "nextmonth"],
  ];
  DOW_TH.forEach((d, i) => {
    out.push([`วัน${d}นี้`, `dow:${i}`], [`วัน${d}หน้า`, `dow+:${i}`], [`วัน${d}`, `dow:${i}`]);
    if (i !== 0) out.push([`${d}นี้`, `dow:${i}`], [`${d}หน้า`, `dow+:${i}`], [d, `dow:${i}`]); // bare "อาทิตย์" = week, below
  });
  out.push(["วันพฤหัสบดี", "dow:4"], ["พฤหัสบดี", "dow:4"], ["อาทิตย์", "dow:0"]);
  DOW_EN.forEach((d, i) => out.push([`this ${d}`, `dow:${i}`], [`next ${d}`, `dow+:${i}`], [d, `dow:${i}`]));
  for (let m = 0; m < 12; m++) {
    const key = `month:${m + 1}`;
    for (const w of [MONTH_TH[m], `เดือน${MONTH_TH[m]}`, MONTH_TH_SHORT[m], MONTH_TH_SHORT[m].replace(/\./g, ""), ...MONTH_TH_SPOKEN[m], MONTH_EN[m], ...MONTH_EN_SHORT[m]])
      out.push([w, key]);
  }
  return out;
}

/** Everyday words trimmed off the ends of what is left (longest first). */
const FILLERS_TH = [
  "ช่วยหา", "อยากจะ", "อยากได้", "อยาก", "ฉัน", "ผม", "เรา", "หนู", "เค้า", "จะ", "ไปเที่ยว", "เที่ยว", "ไปดู", "ไป", "ดู", "หา",
  "งานศิลปะ", "ศิลปะ", "ศิลป์", "อาร์ต", "อีเวนต์", "อีเว้นท์", "อีเว้นต์", "กิจกรรม", "งาน", "ที่", "ใน", "แถวๆ", "แถว", "ย่าน",
  "จังหวัด", "จ.", "มีไหม", "มีมั้ย", "มี", "ไหม", "มั้ย", "บ้าง", "อะไร", "ครับ", "ค่ะ", "คะ", "นะ", "จ้า", "จ้ะ", "หน่อย",
  "เกี่ยวกับ", "สำหรับ", "แบบ", "ช่วง", "วัน", "เดือน", "เลย", "กับ", "และ", "หรือ", "ของ", "ให้", "ได้", "เข้า", "ร่วม", "ไหน",
  "ดีๆ", "สนุกๆ", "สนุก", "นี้", "ๆ",
];
/** Only dropped when they stand alone ("หน้า" is also a word of its own). */
const FILLERS_WHOLE = new Set(["หน้า", "นะคะ", "นะครับ"]);
const FILLERS_EN = new Set([
  "i", "im", "i'm", "we", "me", "my", "want", "wanna", "would", "like", "to", "go", "going", "see", "find", "show", "look",
  "looking", "for", "a", "an", "the", "in", "at", "on", "of", "and", "or", "with", "some", "any", "please", "event", "events",
  "art", "arts", "thing", "things", "this", "next", "is", "are", "there",
]);

/** Thai ↔ English twins for keywords; the first word is the one shown. */
const TWINS: string[][] = [
  ["เซรามิก", "เซรามิค", "ceramic", "ceramics", "pottery", "ปั้นดิน", "ปั้น"],
  ["ภาพถ่าย", "ถ่ายภาพ", "ถ่ายรูป", "photo", "photography", "photograph"],
  ["คราฟต์", "คราฟท์", "craft", "crafts", "งานฝีมือ", "handmade", "แฮนด์เมด"],
  ["ดีไซน์", "design", "ออกแบบ"],
  ["ภาพประกอบ", "illustration", "illust", "อิลลัส"],
  ["การ์ตูน", "comic", "comics", "มังงะ", "manga"],
  ["อาร์ตทอย", "art toy", "arttoy", "ของเล่น", "toy"],
  ["ภาพพิมพ์", "print", "printmaking"],
  ["ประติมากรรม", "sculpture"],
  ["หนังสือ", "book", "books"],
  ["ภาพยนตร์", "หนัง", "film", "movie", "cinema"],
  ["ดนตรี", "music", "คอนเสิร์ต", "concert"],
  ["แฟชั่น", "fashion"],
  ["ผ้า", "textile", "ทอผ้า"],
  ["สถาปัตย์", "สถาปัตยกรรม", "architecture"],
  ["ดิจิทัล", "ดิจิตอล", "digital"],
  ["เครื่องประดับ", "จิวเวลรี่", "jewelry", "jewellery", "อัญมณี"],
  ["กาแฟ", "coffee", "คาเฟ่", "cafe", "café"],
  ["อาหาร", "food"],
  ["เด็ก", "kids", "children", "ครอบครัว", "family"],
];

/* ------------------------------------------------------------------ dictionary */

type Entry = { term: string; kind: IntentKind | "literal"; value: string };

const LATIN = /^[a-z0-9 .'&-]+$/;

let DICT: Entry[] | null = null;
function dictionary(): Entry[] {
  if (DICT) return DICT;
  const out: Entry[] = [];
  const add = (term: string, kind: Entry["kind"], value: string) => out.push({ term: term.toLowerCase(), kind, value });
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) for (const w of words) add(w, "category", cat);
  TOPICS.forEach((t, i) => t.words.forEach((w) => add(w, "topic", String(i))));
  FREE_WORDS.forEach((w) => add(w, "free", "free"));
  NEAR_WORDS.forEach((w) => add(w, "near", "near"));
  PROVINCES.forEach((prov, i) => prov.say.forEach((w) => add(w, "place", String(i))));
  for (const [w, key] of dateWords()) add(w, "date", key);
  LITERALS.forEach((w) => add(w, "literal", w));
  // Longest first, so "สุดสัปดาห์หน้า" wins over "สุดสัปดาห์" and "พระนครศรีอยุธยา" over "นครศรี".
  DICT = out.sort((a, b) => b.term.length - a.term.length);
  return DICT;
}

/* ------------------------------------------------------------------ Thai text helpers */

const isWordChar = (c: string | undefined) => !!c && /[a-z0-9]/i.test(c);
/** Marks that sit on the letter before them (vowels above / below, tone marks) and the vowels that follow one. */
const isThaiTrailing = (c: string | undefined) => !!c && /[ะ-ฺๅ-๎]/.test(c);
/** Vowels written before their consonant (เ แ โ ใ ไ): a word never starts right after one. */
const isThaiLeading = (c: string | undefined) => !!c && /[เ-ไ]/.test(c);

function fitsWord(text: string, start: number, end: number, term: string): boolean {
  if (LATIN.test(term)) return !isWordChar(text[start - 1]) && !isWordChar(text[end]);
  // Thai: never cut a syllable in two.
  return !isThaiLeading(text[start - 1]) && !isThaiTrailing(text[end]);
}

/* ------------------------------------------------------------------ dates */

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayOf = (s: string) => new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
const plus = (s: string, n: number) => {
  const d = dayOf(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const endOfMonth = (y: number, m0: number) => iso(new Date(y, m0 + 1, 0));

/** Days a time word covers, seen from `today` (YYYY-MM-DD). Weeks run Monday–Sunday like the Event tab. */
export function dateRange(key: string, today: string): DateRange {
  const t = dayOf(today);
  const dow = t.getDay();
  const thisSat = dow === 0 ? plus(today, -1) : plus(today, 6 - dow);
  const sunday = dow === 0 ? today : plus(today, 7 - dow);
  if (key === "today" || key === "tonight" || key === "now") return { from: today, to: today };
  if (key === "tomorrow") return { from: plus(today, 1), to: plus(today, 1) };
  if (key === "dayafter") return { from: plus(today, 2), to: plus(today, 2) };
  if (key === "soon") return { from: today, to: plus(today, 13) };
  if (key === "weekend") return { from: thisSat < today ? today : thisSat, to: plus(thisSat, 1) };
  if (key === "nextweekend") return { from: plus(thisSat, 7), to: plus(thisSat, 8) };
  if (key === "thisweek") return { from: today, to: sunday };
  if (key === "nextweek") return { from: plus(sunday, 1), to: plus(sunday, 7) };
  if (key === "thismonth") return { from: today, to: endOfMonth(t.getFullYear(), t.getMonth()) };
  if (key === "nextmonth") {
    const first = new Date(t.getFullYear(), t.getMonth() + 1, 1);
    return { from: iso(first), to: endOfMonth(first.getFullYear(), first.getMonth()) };
  }
  const [kind, n] = key.split(":");
  const num = Number(n);
  if (kind === "dow" || kind === "dow+") {
    const day = plus(today, ((num - dow + 7) % 7) + (kind === "dow+" ? 7 : 0));
    return { from: day, to: day };
  }
  // month:1..12 — this month from today on; an earlier month means next year's.
  const m0 = num - 1;
  if (m0 === t.getMonth()) return { from: today, to: endOfMonth(t.getFullYear(), m0) };
  const year = m0 < t.getMonth() ? t.getFullYear() + 1 : t.getFullYear();
  return { from: iso(new Date(year, m0, 1)), to: endOfMonth(year, m0) };
}

const DATE_LABEL: Record<string, string> = {
  today: "วันนี้", tonight: "คืนนี้", now: "ตอนนี้", soon: "ช่วงนี้", tomorrow: "พรุ่งนี้", dayafter: "มะรืนนี้",
  weekend: "สุดสัปดาห์นี้", nextweekend: "สุดสัปดาห์หน้า", thisweek: "สัปดาห์นี้", nextweek: "สัปดาห์หน้า",
  thismonth: "เดือนนี้", nextmonth: "เดือนหน้า",
};
const DOW_LABEL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

function dateLabel(key: string): string {
  if (DATE_LABEL[key]) return DATE_LABEL[key];
  const [kind, n] = key.split(":");
  if (kind === "dow") return `${DOW_LABEL[Number(n)]}นี้`;
  if (kind === "dow+") return `${DOW_LABEL[Number(n)]}หน้า`;
  return MONTH_TH[Number(n) - 1];
}

/* ------------------------------------------------------------------ keywords */

function trimFillers(piece: string): string {
  let s = piece;
  for (let changed = true; changed && s; ) {
    changed = false;
    if (twinsOf(s) || FILLERS_WHOLE.has(s)) return FILLERS_WHOLE.has(s) ? "" : s; // "ดีไซน์" stays whole
    for (const f of FILLERS_TH) {
      if (s.startsWith(f) && !isThaiTrailing(s[f.length])) {
        s = s.slice(f.length);
        changed = true;
      }
      if (s.endsWith(f) && s.length > f.length && !isThaiLeading(s[s.length - f.length - 1])) {
        s = s.slice(0, -f.length);
        changed = true;
      }
      if (s === f) s = "";
    }
  }
  return s;
}

const twinsOf = (word: string) => TWINS.find((g) => g.includes(word));

/** Leftover text → keywords (each with its twins), in sentence order, at most 5. */
function keywordsFrom(rest: string): { words: string[]; spans: [number, number, string][] } {
  const spans: [number, number, string][] = [];
  const re = /[^\s,.;:!?()"'“”‘’/\\|+#@&*~_[\]{}<>-]+/g;
  for (let m = re.exec(rest); m; m = re.exec(rest)) {
    const raw = m[0];
    if (FILLERS_EN.has(raw)) continue;
    const word = /[฀-๿]/.test(raw) ? trimFillers(raw) : raw;
    // A lone Thai letter or mark is never a keyword.
    if (word.replace(/[ะ-ฺๅ-๎]/g, "").length < 2) continue;
    const at = m.index + raw.indexOf(word);
    spans.push([at, at + word.length, word]);
  }
  const words: string[] = [];
  for (const [, , w] of spans) {
    const group = twinsOf(w) ?? [w];
    const joined = group.join("|");
    if (!words.includes(joined)) words.push(joined);
  }
  return { words: words.slice(0, 5), spans };
}

/* ------------------------------------------------------------------ parse */

/** Same length as `text`, lower case, so indexes stay the same as in what was typed. */
function lowerSameLength(text: string): string {
  let out = "";
  for (const c of text) {
    const l = c.toLowerCase();
    out += l.length === c.length ? l : c;
  }
  return out;
}

/** The text the parser indexes; quick chips edit this same string. */
export const normalizeInput = (input: string) => input.normalize("NFC").replace(/[​-‍﻿]/g, " ");

export function parseEventIntent(input: string, today: string): EventIntent {
  const text = normalizeInput(input);
  const lower = lowerSameLength(text);
  const used = new Uint8Array(lower.length);
  const hits: { entry: Entry; start: number; end: number }[] = [];

  for (const entry of dictionary()) {
    for (let from = 0, i = lower.indexOf(entry.term); i !== -1; i = lower.indexOf(entry.term, from)) {
      const end = i + entry.term.length;
      from = i + 1;
      if (used.subarray(i, end).some(Boolean) || !fitsWord(lower, i, end, entry.term)) continue;
      used.fill(1, i, end);
      hits.push({ entry, start: i, end });
    }
  }
  hits.sort((a, b) => a.start - b.start);

  const tokens: IntentToken[] = [];
  const categories = new Set<EventCategoryId>();
  const topicCats = new Set<EventCategoryId>();
  const boost = new Set<string>();
  const provinces: Province[] = [];
  const ranges: DateRange[] = [];
  let free = false;
  let nearMe = false;
  const literalWords: [number, number, string][] = [];

  for (const { entry, start, end } of hits) {
    const tok = (kind: IntentKind, label: string) => tokens.push({ kind, value: entry.value, start, end, label });
    switch (entry.kind) {
      case "category":
        categories.add(entry.value as EventCategoryId);
        tok("category", CATEGORY_LABEL[entry.value as EventCategoryId]);
        break;
      case "topic": {
        const t = TOPICS[Number(entry.value)];
        topicCats.add(t.category);
        t.boost.forEach((b) => boost.add(b));
        tok("topic", t.label);
        break;
      }
      case "free":
        free = true;
        tok("free", "ฟรี");
        break;
      case "near":
        nearMe = true;
        tok("near", NEAR_WORD);
        break;
      case "place": {
        const prov = PROVINCES[Number(entry.value)];
        if (!provinces.includes(prov)) provinces.push(prov);
        tok("place", prov.label);
        break;
      }
      case "date":
        ranges.push(dateRange(entry.value, today));
        tok("date", dateLabel(entry.value));
        break;
      case "literal":
        literalWords.push([start, end, text.slice(start, end)]);
        break;
    }
  }

  // What is left, with the known words blanked out (so "ฉันอยากไปงาน|วาดรูป|ฟรี|ที่|เชียงใหม่" splits there).
  let rest = "";
  for (let i = 0; i < lower.length; i++) rest += used[i] ? " " : lower[i];
  const kw = keywordsFrom(rest);
  const keywords = [...kw.words];
  for (const [, , w] of literalWords) if (!keywords.includes(w.toLowerCase())) keywords.push(w.toLowerCase());
  for (const [start, end, w] of [...kw.spans, ...literalWords].sort((a, b) => a[0] - b[0]))
    tokens.push({ kind: "keyword", value: w, start, end, label: `“${(twinsOf(w.toLowerCase()) ?? [text.slice(start, end)])[0]}”` });
  tokens.sort((a, b) => a.start - b.start);

  // A topic word sets the type only when no type word was said.
  const cats = categories.size ? [...categories] : [...topicCats];
  const range = ranges.length
    ? { from: ranges.map((r) => r.from).sort()[0], to: ranges.map((r) => r.to).sort()[ranges.length - 1] }
    : null;

  return {
    categories: cats,
    boost: [...boost],
    free,
    provinces,
    nearMe,
    range,
    keywords: keywords.slice(0, 6),
    tokens,
    empty: !cats.length && !boost.size && !free && !provinces.length && !nearMe && !range && !keywords.length,
  };
}

/**
 * The one-line "what we understood": types, ฟรี, places, near me, times, keywords.
 * `nearLabel` names the province found for "ใกล้ฉัน" once the device said where it is.
 */
export function intentSummary(intent: EventIntent, nearLabel?: string | null): string {
  const order: IntentKind[] = ["topic", "category", "free", "place", "near", "date", "keyword"];
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const kind of order) {
    for (const t of intent.tokens) {
      if (t.kind !== kind) continue;
      const label = kind === "near" && nearLabel ? `${NEAR_WORD} (${nearLabel})` : t.label;
      if (seen.has(label)) continue;
      seen.add(label);
      parts.push(label);
    }
  }
  return parts.join(" · ");
}

/** Quick chips: is the word on, and the text with it added or taken out. */
export function hasIntent(intent: EventIntent, kind: "free" | "weekend" | "near"): boolean {
  if (kind === "free") return intent.free;
  if (kind === "near") return intent.nearMe;
  return intent.tokens.some((t) => t.kind === "date" && t.value === "weekend");
}

/** `intent` must be parseEventIntent(text). */
export function toggleIntentWord(input: string, intent: EventIntent, kind: "free" | "weekend" | "near"): string {
  const text = normalizeInput(input);
  const match = (t: IntentToken) =>
    kind === "free" ? t.kind === "free" : kind === "near" ? t.kind === "near" : t.kind === "date" && t.value === "weekend";
  const spans = intent.tokens.filter(match);
  if (!spans.length) {
    const word = kind === "free" ? "ฟรี" : kind === "near" ? NEAR_WORD : "สุดสัปดาห์นี้";
    return text.trim() ? `${text.trimEnd()} ${word}` : word;
  }
  let out = text;
  for (const s of [...spans].sort((a, b) => b.start - a.start)) out = out.slice(0, s.start) + " " + out.slice(s.end);
  return out.replace(/\s+/g, " ").trim();
}
