/**
 * Mock "Revision agent": turns an owner comment into targeted, deterministic edits.
 * Phase 2 swaps the parser + edits for Claude with a structured `revision_plan` schema;
 * the contract stays the same: only targets change, locked components are never touched.
 */
import { contentHash } from "./hash";
import type { ArtifactComponent, CampaignVersion, CommentScope, ComponentChange, FeedTile, Platform } from "./types";

export interface RevisionInput {
  scope: CommentScope;
  targetId?: string;
  platform?: Platform;
  body: string;
}

export type EditOp =
  | { op: "reduce_text"; pct: number }
  | { op: "casual_tone" }
  | { op: "add_checklist" }
  | { op: "rebalance_feed" }
  | { op: "editorial_direction" };

export interface RevisionPlan {
  targets: string[];
  /** Components the comment says to leave alone ("อย่าแก้ภาพ 3"). They get locked. */
  protect: string[];
  ops: EditOp[];
  understood: boolean;
  note: string;
}

const FRAME_WORD = "(?:ภาพ|รูป|สไลด์|เฟรม|slide|frame|image)";
const PROTECT_RE = new RegExp(`(?:อย่าแก้|ห้ามแก้|ไม่ต้องแก้|อย่าแตะ|เก็บ|keep|lock|ล็อก)\\s*${FRAME_WORD}?\\s*(?:ที่\\s*)?(\\d+)`, "gi");
const FRAME_RE = new RegExp(`${FRAME_WORD}\\s*(?:ที่\\s*)?(\\d+)`, "gi");
const REDUCE_RE = /(?:ลด|ตัด|reduce|cut)\s*(?:ข้อความ|ตัวหนังสือ|ตัวอักษร|คำ|text|copy)?\s*(?:ลง|by)?\s*(\d{1,2})\s*%/i;
const DENSE_RE = /แน่น|รก|เยอะไป|ยาวไป|dense|crowded|too long/i;
const CASUAL_RE = /เป็นกันเอง|คุยกัน|ดูเป็นแบรนด์|เหมือนคน|casual|human|friendly/i;
const CHECKLIST_RE = /checklist|เช็กลิสต์|เช็คลิสต์|ตัวอย่างจริง/i;
const FEED_RE = /ดำ|มืด|ขาว|ติดกัน|แถว|สมดุล|dark|row|balance|tone/i;
const EDITORIAL_RE = /editorial|gallery|แกลเลอรี|โฆษณาเกิน|ดูโฆษณา/i;

export const MOCK_PARSER_HELP = "mock เข้าใจ: ลดข้อความ 30%, อย่าแก้ภาพ 3, ขอโทนเป็นกันเอง, เพิ่ม checklist, อย่าให้พื้นดำติดกัน, ขอเป็น editorial gallery";

function frameIdsFrom(text: string, re: RegExp, v: CampaignVersion): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(re)) {
    const id = `frame-${m[1]}`;
    if (v.components[id] && !out.includes(id)) out.push(id);
  }
  return out;
}

export function planRevision(input: RevisionInput, v: CampaignVersion): RevisionPlan {
  const body = input.body ?? "";
  const protect = frameIdsFrom(body, PROTECT_RE, v);
  // Strip the "don't touch N" phrases first so "อย่าแก้ภาพ 3" is not read as a target.
  const refs = frameIdsFrom(body.replace(PROTECT_RE, " "), FRAME_RE, v).filter((id) => !protect.includes(id));

  const ops: EditOp[] = [];
  const pct = body.match(REDUCE_RE)?.[1];
  if (pct) ops.push({ op: "reduce_text", pct: Math.min(80, Math.max(5, Number(pct))) });
  else if (DENSE_RE.test(body)) ops.push({ op: "reduce_text", pct: 25 });
  if (CASUAL_RE.test(body)) ops.push({ op: "casual_tone" });
  if (CHECKLIST_RE.test(body)) ops.push({ op: "add_checklist" });
  if (input.scope === "FEED" && FEED_RE.test(body)) ops.push({ op: "rebalance_feed" });
  if (input.scope === "CAMPAIGN" && EDITORIAL_RE.test(body)) ops.push({ op: "editorial_direction" });

  const allFrames = Object.values(v.components)
    .filter((c) => c.kind === "frame")
    .map((c) => c.id);
  let targets: string[] = [];
  switch (input.scope) {
    case "IMAGE_FRAME":
      targets = [input.targetId, ...refs].filter((id): id is string => !!id);
      break;
    case "CAMPAIGN":
      targets = refs.length ? refs : ops.length ? allFrames : [];
      break;
    case "COPY_CHANNEL":
      targets = [input.targetId ?? (input.platform ? `copy:${input.platform}` : "")];
      break;
    case "SEO_SECTION":
      targets = input.targetId ? [input.targetId] : [];
      break;
    case "FEED":
      targets = ["feed:grid"];
      break;
  }
  targets = Array.from(new Set(targets)).filter((id) => !!v.components[id] && !protect.includes(id));

  const understood = ops.length > 0 && targets.length > 0;
  let note = "";
  if (!understood) {
    note = protect.length && !ops.length ? `ล็อก ${protect.map((id) => v.components[id].label).join(", ")} ให้แล้ว ไม่มีส่วนไหนต้องแก้` : `${MOCK_PARSER_HELP} (Phase 2 ใช้ Claude จริง)`;
  }
  return { targets, protect, ops, understood, note };
}

/* ---------- edits ---------- */

type SegmenterLike = { segment: (s: string) => Iterable<{ segment: string }> };
function wordSegmenter(): SegmenterLike | null {
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: "word" }) => SegmenterLike }).Segmenter;
  return Seg ? new Seg("th", { granularity: "word" }) : null;
}

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const seg = wordSegmenter();
  if (!seg) return `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
  let out = "";
  for (const { segment } of seg.segment(text)) {
    if (out.length + segment.length > maxChars - 1) break;
    out += segment;
  }
  return `${(out || text.slice(0, maxChars - 1)).trimEnd()}…`;
}

const sumLen = (xs: string[]) => xs.reduce((n, x) => n + x.length, 0);

/** Drop the least important (last) lines until the text is ≤ (100 - pct)% of its length. */
export function reduceLines(lines: string[], pct: number): string[] {
  const target = Math.round(sumLen(lines) * (1 - pct / 100));
  const out = [...lines];
  while (out.length > 1 && sumLen(out) > target) out.pop();
  if (out.length === 1 && out[0].length > target) out[0] = truncateText(out[0], Math.max(target, 8));
  return out;
}

function pctNote(before: number, after: number): string {
  const d = before ? Math.round(((after - before) / before) * 100) : 0;
  return `ข้อความ ${d}% (${before}→${after} ตัวอักษร)`;
}

const CHECKLIST_MOCK = ["ตัวอย่างจริง 1 ชิ้น พร้อมก่อน/หลัง", "เช็กบนมือถือก่อนส่ง", "ลิงก์ไปหน้าที่ใช้งานได้จริง"];
const CASUAL_TAIL = "คุณคิดยังไง เล่าให้ฟังหน่อย";

function rebalance(tiles: FeedTile[]): { tiles: FeedTile[]; swaps: string[] } {
  const out = [...tiles];
  const swaps: string[] = [];
  for (let i = 2; i < out.length; i++) {
    if (out[i].tone === out[i - 1].tone && out[i].tone === out[i - 2].tone && !out[i].own) {
      const j = out.findIndex((t, k) => k > i && !t.own && t.tone !== out[i].tone);
      if (j > i) {
        [out[i], out[j]] = [out[j], out[i]];
        swaps.push(`ช่อง ${i + 1}↔${j + 1}`);
      }
    }
  }
  return { tiles: out, swaps };
}

function applyOps(comp: ArtifactComponent, ops: EditOp[]): { after: ArtifactComponent; notes: string[] } {
  let after: ArtifactComponent = comp;
  const notes: string[] = [];
  for (const o of ops) {
    if (after.kind === "frame" && (o.op === "reduce_text" || o.op === "editorial_direction")) {
      const pct = o.op === "reduce_text" ? o.pct : 20;
      const before = sumLen(after.content.lines);
      const lines = reduceLines(after.content.lines, pct);
      const content = { ...after.content, lines };
      if (o.op === "editorial_direction") {
        if (!content.visualNote.startsWith("Editorial gallery")) content.visualNote = `Editorial gallery: ${content.visualNote}`;
        notes.push("art direction → editorial gallery");
      }
      after = { ...after, content };
      if (sumLen(lines) !== before) notes.push(pctNote(before, sumLen(lines)));
    } else if (after.kind === "copy" && o.op === "reduce_text") {
      const joiner = after.content.text.includes("\n\n") ? "\n\n" : "\n";
      const parts = after.content.text.split(/\n+/).filter(Boolean);
      const before = after.content.text.length;
      const text = reduceLines(parts, o.pct).join(joiner);
      after = { ...after, content: { ...after.content, text } };
      notes.push(pctNote(before, text.length));
    } else if (after.kind === "copy" && o.op === "casual_tone") {
      const text = after.content.text.trimEnd();
      after = { ...after, content: { ...after.content, hashtags: [], text: text.endsWith(CASUAL_TAIL) ? text : `${text}\n\n${CASUAL_TAIL}` } };
      notes.push("โทนเป็นกันเอง, เอา hashtag ออก");
    } else if (after.kind === "seo_section" && o.op === "reduce_text") {
      const before = after.content.body.length;
      const body = reduceLines(after.content.body.split(/(?<=[.!?。])\s+|\n+/).filter(Boolean), o.pct).join(" ");
      after = { ...after, content: { ...after.content, body } };
      notes.push(pctNote(before, body.length));
    } else if (after.kind === "seo_section" && o.op === "add_checklist") {
      const have = after.content.bullets;
      const add = CHECKLIST_MOCK.filter((b) => !have.includes(b));
      after = { ...after, content: { ...after.content, bullets: [...after.content.bullets, ...add] } };
      if (add.length) notes.push(`เพิ่ม checklist ${add.length} ข้อ`);
    } else if (after.kind === "feed" && o.op === "rebalance_feed") {
      const r = rebalance(after.content.tiles);
      after = { ...after, content: { tiles: r.tiles } };
      if (r.swaps.length) notes.push(`สลับ ${r.swaps.join(", ")}`);
    }
  }
  return { after, notes };
}

export function derivePin(pin: ArtifactComponent, components: Record<string, ArtifactComponent>): ArtifactComponent {
  if (pin.kind !== "pin" || !pin.derivedFrom) return pin;
  const items = pin.derivedFrom.map((id) => {
    const src = components[id];
    return src?.kind === "frame" ? src.content.headline : "";
  });
  return { ...pin, content: { ...pin.content, items } };
}

export function applyPlan(
  plan: RevisionPlan,
  v: CampaignVersion,
  locks: string[],
): { components: Record<string, ArtifactComponent>; changes: ComponentChange[]; keptLocked: string[] } {
  const components: Record<string, ArtifactComponent> = { ...v.components };
  const changes: ComponentChange[] = [];
  const kept = new Set<string>([...plan.protect, ...plan.targets.filter((id) => locks.includes(id))]);
  const same = (a: ArtifactComponent, b: ArtifactComponent) => contentHash(a) === contentHash(b);

  for (const id of plan.targets) {
    if (locks.includes(id)) continue;
    const before = components[id];
    const { after, notes } = applyOps(before, plan.ops);
    if (same(before, after)) continue;
    components[id] = after;
    changes.push({ componentId: id, label: before.label, before, after, note: notes.join(", ") });
  }

  const changed = new Set(changes.map((ch) => ch.componentId));
  for (const comp of Object.values(components)) {
    if (!comp.derivedFrom?.some((d) => changed.has(d))) continue;
    if (locks.includes(comp.id)) {
      kept.add(comp.id);
      continue;
    }
    const after = derivePin(comp, components);
    if (same(comp, after)) continue;
    components[comp.id] = after;
    changes.push({ componentId: comp.id, label: comp.label, before: comp, after, note: "render ใหม่ตามเฟรมที่แก้" });
  }
  return { components, changes, keptLocked: Array.from(kept).filter((id) => !!v.components[id]) };
}
