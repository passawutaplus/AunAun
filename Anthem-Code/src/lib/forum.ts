/** Forum status / helpers for Aplus1 Community webboard */

export type ForumTopicStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "done"
  | "wont_fix"
  | "duplicate"
  | "answered"
  | "closed";

export type ForumSortTab = "latest" | "popular" | "unanswered";

export const FORUM_STATUS_LABELS: Record<ForumTopicStatus, string> = {
  open: "เปิดอยู่",
  under_review: "กำลังพิจารณา",
  planned: "วางแผนแล้ว",
  in_progress: "กำลังทำ",
  done: "เสร็จแล้ว",
  wont_fix: "ไม่ทำ",
  duplicate: "ซ้ำ",
  answered: "มีคำตอบแล้ว",
  closed: "ปิดแล้ว",
};

/** Badge tone classes (Tailwind) */
export const FORUM_STATUS_TONES: Record<ForumTopicStatus, string> = {
  open: "bg-sky-50 text-sky-800 border-sky-200",
  under_review: "bg-amber-50 text-amber-800 border-amber-200",
  planned: "bg-violet-50 text-violet-800 border-violet-200",
  in_progress: "bg-blue-50 text-blue-800 border-blue-200",
  done: "bg-emerald-50 text-emerald-800 border-emerald-200",
  wont_fix: "bg-muted text-muted-foreground border-border",
  duplicate: "bg-muted text-muted-foreground border-border",
  answered: "bg-emerald-50 text-emerald-800 border-emerald-200",
  closed: "bg-muted text-muted-foreground border-border",
};

export const PRODUCT_FEEDBACK_STATUSES: ForumTopicStatus[] = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "done",
  "wont_fix",
  "duplicate",
];

export const HELP_STATUSES: ForumTopicStatus[] = ["open", "answered", "closed"];

export function statusesForCategory(slug: string): ForumTopicStatus[] {
  return slug === "help" ? HELP_STATUSES : PRODUCT_FEEDBACK_STATUSES;
}

export function formatRelativeTh(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

export function formatForumDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return formatRelativeTh(iso);
  if (diff < 7 * day) return `${Math.floor(diff / day)} วัน`;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export type ForumRankSlug = "helper" | "guide" | "steward";

export const FORUM_RANK_LABELS: Record<ForumRankSlug, string> = {
  helper: "ผู้ช่วยชุมชน",
  guide: "ไกด์ชุมชน",
  steward: "ดูแลชุมชน",
};

export const FORUM_RANK_TONES: Record<ForumRankSlug, string> = {
  helper: "bg-emerald-500 text-white",
  guide: "bg-sky-500 text-white",
  steward: "bg-violet-500 text-white",
};

export function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[,#\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2 && t.length <= 32)
    .slice(0, 8);
}
