import { parseInboxPriority } from "@/lib/inboxPriority";

export const INBOX_SORT_KEYS = ["deadline", "priority", "status"] as const;
export type InboxSortKey = (typeof INBOX_SORT_KEYS)[number];

export const INBOX_SORT_OPTIONS: { key: InboxSortKey; label: string }[] = [
  { key: "deadline", label: "เรียงตามวันกำหนดส่ง" },
  { key: "priority", label: "เรียงตามความสำคัญ" },
  { key: "status", label: "เรียงตามสถานะ" },
];

export function inboxDeadlineTime(raw: string | null | undefined): number {
  if (!raw?.trim()) return Number.POSITIVE_INFINITY;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const t = Date.parse(`${s.slice(0, 10)}T12:00:00`);
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/** ด่วน first, then ปกติ, then รอได้. */
export function inboxPriorityRank(value: string | null | undefined): number {
  const p = parseInboxPriority(value);
  if (p === "ด่วน") return 0;
  if (p === "ปกติ") return 1;
  return 2;
}

export function inboxStatusOrderRank(label: string, order: readonly string[]): number {
  const i = order.indexOf(label);
  return i < 0 ? order.length : i;
}

export type InboxSortFields = {
  deadline?: string | null;
  priority?: string | null;
  statusRank: number;
  createdAt?: string | null;
};

export function sortInboxRows<T>(
  rows: T[],
  key: InboxSortKey | null,
  pick: (row: T) => InboxSortFields,
): T[] {
  const copy = [...rows];
  if (!key) {
    return copy.sort((a, b) =>
      String(pick(b).createdAt ?? "").localeCompare(String(pick(a).createdAt ?? "")),
    );
  }
  copy.sort((a, b) => {
    const pa = pick(a);
    const pb = pick(b);
    let cmp = 0;
    if (key === "deadline") {
      cmp = inboxDeadlineTime(pa.deadline) - inboxDeadlineTime(pb.deadline);
    } else if (key === "priority") {
      cmp = inboxPriorityRank(pa.priority) - inboxPriorityRank(pb.priority);
    } else {
      cmp = pa.statusRank - pb.statusRank;
    }
    if (cmp !== 0) return cmp;
    return String(pb.createdAt ?? "").localeCompare(String(pa.createdAt ?? ""));
  });
  return copy;
}
