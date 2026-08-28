import { parseInboxPriority } from "@/lib/inboxPriority";

export const INBOX_SORT_KEYS = [
  "latest",
  "deadline_asc",
  "deadline_desc",
  "priority",
  "status",
] as const;
export type InboxSortKey = (typeof INBOX_SORT_KEYS)[number];

export const DEFAULT_INBOX_SORT: InboxSortKey = "latest";

export const INBOX_SORT_OPTIONS: { key: InboxSortKey; label: string }[] = [
  { key: "latest", label: "เรียงล่าสุด" },
  { key: "deadline_asc", label: "กำหนดส่งก่อน" },
  { key: "deadline_desc", label: "กำหนดส่งหลัง" },
  { key: "priority", label: "ความสำคัญ" },
  { key: "status", label: "สถานะ" },
];

/** Collab has a period field, not a hire deadline. */
export const COLLAB_INBOX_SORT_OPTIONS: { key: InboxSortKey; label: string }[] = [
  { key: "deadline_asc", label: "ช่วงเวลา" },
  { key: "status", label: "สถานะ" },
  { key: "priority", label: "ความสำคัญ" },
];

export const DEFAULT_COLLAB_INBOX_SORT: InboxSortKey = "deadline_asc";

export type InboxSortableRow = {
  deadlineRaw?: string | null;
  priority?: string | null;
  statusRank: number;
  createdAt?: string | null;
};

/** Soonest first. Missing dates go last. */
export function deadlineSortMs(raw: string | null | undefined): number {
  if (!raw?.trim()) return Number.POSITIVE_INFINITY;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const d = new Date(`${t.slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  const parsed = Date.parse(t);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function compareDeadlineDesc(aRaw: string | null | undefined, bRaw: string | null | undefined): number {
  const a = deadlineSortMs(aRaw);
  const b = deadlineSortMs(bRaw);
  const aEmpty = !Number.isFinite(a);
  const bEmpty = !Number.isFinite(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return b - a;
}

/** Urgent first: ด่วน → รอได้ → ปกติ */
export function inboxPriorityRank(value: string | null | undefined): number {
  switch (parseInboxPriority(value)) {
    case "ด่วน":
      return 0;
    case "รอได้":
      return 1;
    default:
      return 2;
  }
}

function createdAtMs(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = Date.parse(raw);
  return Number.isNaN(n) ? 0 : n;
}

export function compareInboxSortRows(
  a: InboxSortableRow,
  b: InboxSortableRow,
  key: InboxSortKey,
): number {
  let delta = 0;
  if (key === "latest") {
    delta = createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
  } else if (key === "deadline_asc") {
    delta = deadlineSortMs(a.deadlineRaw) - deadlineSortMs(b.deadlineRaw);
  } else if (key === "deadline_desc") {
    delta = compareDeadlineDesc(a.deadlineRaw, b.deadlineRaw);
  } else if (key === "priority") {
    delta = inboxPriorityRank(a.priority) - inboxPriorityRank(b.priority);
  } else {
    delta = a.statusRank - b.statusRank;
  }
  if (delta !== 0) return delta;
  if (key === "latest") return 0;
  return createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
}

export function sortInboxRows<T>(
  rows: T[],
  key: InboxSortKey | null,
  toSortable: (row: T) => InboxSortableRow,
): T[] {
  const sortKey = key ?? DEFAULT_INBOX_SORT;
  return [...rows].sort((a, b) => compareInboxSortRows(toSortable(a), toSortable(b), sortKey));
}
