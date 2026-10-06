/**
 * Where a Vault item came from, whether it still waits in the Inbox, and why the owner kept it.
 * All three are derived from / stored in `captureContext`, so they sync with the item and need no migration.
 */

export const ORIGINS = [
  { id: "web", label: "From the web", short: "Web" },
  { id: "upload", label: "My files", short: "My files" },
  { id: "museum", label: "From Museum", short: "Museum" },
];
const ORIGIN_ALIASES = { web: "web", site: "web", link: "web", upload: "upload", uploads: "upload", file: "upload", files: "upload", mine: "upload", my: "upload", museum: "museum", discover: "museum" };

export const originLabel = id => (ORIGINS.find(o => o.id === id) || {}).label || "";
export const originShort = id => (ORIGINS.find(o => o.id === id) || {}).short || "";
export const normalizeOrigin = v => ORIGIN_ALIASES[String(v || "").toLowerCase()] || "";

/** web / upload / museum. A stored `captureContext.origin` wins; otherwise it is inferred from how the item was kept. */
export function originOf(item) {
  const cc = (item && item.captureContext) || {};
  const stored = normalizeOrigin(cc.origin);
  if (stored) return stored;
  const method = String(cc.method || "").toLowerCase();
  if (method === "discover" || method === "museum") return "museum";
  if (method.includes("upload") || item.itemType === "upload") return "upload";
  if (item.sourceUrl) return "web";
  return "upload";
}

/** Inbox = kept after this date, not yet put in a collection, not yet marked sorted. Older items are never in the Inbox. */
export const INBOX_EPOCH = Date.UTC(2026, 9, 6);

export function isInbox(item) {
  if (!item || (Number(item.createdAt) || 0) < INBOX_EPOCH) return false;
  const cc = item.captureContext || {};
  if (cc.triagedAt) return false;
  return !(item.collectionIds || []).some(id => id && id !== "all" && id !== "inbox");
}

/** "Why I kept it" chips. `cue` ties a reason to the engine's intent cues where one exists. */
export const KEPT_REASONS = [
  { id: "color", label: "Color", th: "สี", cue: "color_reference" },
  { id: "layout", label: "Layout", th: "เลย์เอาต์", cue: "layout_reference" },
  { id: "type", label: "Lettering", th: "ตัวอักษร" },
  { id: "illustration", label: "Illustration", th: "ภาพประกอบ" },
  { id: "material", label: "Material", th: "วัสดุ", cue: "material_reference" },
  { id: "mood", label: "Mood", th: "มู้ด", cue: "mood_reference" },
  { id: "similar", label: "Like my work", th: "คล้ายงานที่ทำอยู่", cue: "similar_to" },
];
const REASON_ALIASES = {
  color: "color", colour: "color", สี: "color",
  layout: "layout", เลย์เอาต์: "layout",
  type: "type", typography: "type", lettering: "type", font: "type", ตัวอักษร: "type", ฟอนต์: "type",
  illustration: "illustration", illustrations: "illustration", ภาพประกอบ: "illustration",
  material: "material", texture: "material", วัสดุ: "material",
  mood: "mood", มู้ด: "mood",
  similar: "similar", คล้าย: "similar",
};
export const normalizeReason = v => REASON_ALIASES[String(v || "").toLowerCase()] || "";
export const reasonLabel = id => (KEPT_REASONS.find(r => r.id === id) || {}).label || "";

export const KEPT_TEXT_MAX = 80;

export function keptForOf(item) {
  const raw = (item && item.captureContext && item.captureContext.keptFor) || {};
  const reasons = (Array.isArray(raw.reasons) ? raw.reasons : []).map(String).filter(id => KEPT_REASONS.some(r => r.id === id));
  return { reasons: [...new Set(reasons)], text: String(raw.text || "").slice(0, KEPT_TEXT_MAX) };
}

/** `why:color` matches the chip; any other word matches the one-line note. */
export function matchesWhy(item, value) {
  const v = String(value || "").toLowerCase();
  if (!v) return true;
  const kept = keptForOf(item);
  const id = normalizeReason(v);
  if (id && kept.reasons.includes(id)) return true;
  return kept.text.toLowerCase().includes(v);
}
