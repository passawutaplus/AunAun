/** Collab inbox helpers: UI tabs + local hide (terminal rows only). */

const hiddenKey = (userId: string) => `aplus1_collab_inbox_hidden_v1:${userId}`;

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(ids.slice(0, 500)));
  } catch {
    /* ignore */
  }
}

export const COLLAB_STATUS_PENDING = "pending" as const;
export const COLLAB_STATUS_ACCEPTED = "accepted" as const;
export const COLLAB_STATUS_DECLINED = "declined" as const;
export const COLLAB_STATUS_CANCELLED = "cancelled" as const;
export const COLLAB_STATUS_COMPLETED = "completed" as const;
/** Legacy — treat as completed (จบงาน) */
export const COLLAB_STATUS_ARCHIVED = "archived" as const;

export const COLLAB_TAB_CONTACTED_NEW = "ติดต่อใหม่" as const;
export const COLLAB_TAB_ACCEPTED = "ตอบรับ" as const;
export const COLLAB_TAB_DECLINED = "ปฏิเสธ" as const;
export const COLLAB_TAB_CANCELLED = "ยกเลิก" as const;
export const COLLAB_TAB_COMPLETED = "จบงาน" as const;
export const COLLAB_TAB_ALL = "ทั้งหมด" as const;

export type CollabInboxTab =
  | typeof COLLAB_TAB_CONTACTED_NEW
  | typeof COLLAB_TAB_ACCEPTED
  | typeof COLLAB_TAB_DECLINED
  | typeof COLLAB_TAB_CANCELLED
  | typeof COLLAB_TAB_COMPLETED
  | typeof COLLAB_TAB_ALL;

export const COLLAB_TAB_ORDER: CollabInboxTab[] = [
  COLLAB_TAB_CONTACTED_NEW,
  COLLAB_TAB_ACCEPTED,
  COLLAB_TAB_DECLINED,
  COLLAB_TAB_CANCELLED,
  COLLAB_TAB_COMPLETED,
  COLLAB_TAB_ALL,
];

export function getHiddenCollabIds(userId: string): Set<string> {
  return new Set(readIds(hiddenKey(userId)));
}

export function hideCollabFromInbox(userId: string, id: string): void {
  writeIds(hiddenKey(userId), [id, ...readIds(hiddenKey(userId)).filter((x) => x !== id)]);
}

export function unhideCollabFromInbox(userId: string, id: string): void {
  writeIds(
    hiddenKey(userId),
    readIds(hiddenKey(userId)).filter((x) => x !== id),
  );
}

export function isCollabDeclinedStatus(status: string | null | undefined): boolean {
  return status === "declined" || status === "passed";
}

export function isCollabAcceptedStatus(status: string | null | undefined): boolean {
  return status === "accepted" || status === "interested";
}

export function isCollabContactedNewStatus(status: string | null | undefined): boolean {
  return status === "pending" || status === "ใหม่";
}

export function isCollabCompletedStatus(status: string | null | undefined): boolean {
  return status === COLLAB_STATUS_COMPLETED || status === COLLAB_STATUS_ARCHIVED;
}

export function isCollabCancelledStatus(status: string | null | undefined): boolean {
  return status === COLLAB_STATUS_CANCELLED;
}

export function isCollabTerminalStatus(status: string | null | undefined): boolean {
  return (
    isCollabDeclinedStatus(status) ||
    isCollabCompletedStatus(status) ||
    isCollabCancelledStatus(status)
  );
}

export function canCancelCollabStatus(status: string | null | undefined): boolean {
  if (!status || isCollabTerminalStatus(status)) return false;
  return isCollabContactedNewStatus(status) || isCollabAcceptedStatus(status);
}

export function labelCollabStatus(status: string | null | undefined): string {
  if (isCollabContactedNewStatus(status)) return COLLAB_TAB_CONTACTED_NEW;
  if (isCollabAcceptedStatus(status)) return COLLAB_TAB_ACCEPTED;
  if (isCollabDeclinedStatus(status)) return COLLAB_TAB_DECLINED;
  if (isCollabCancelledStatus(status)) return COLLAB_TAB_CANCELLED;
  if (isCollabCompletedStatus(status)) return COLLAB_TAB_COMPLETED;
  return status || "—";
}

export function canHideCollabFromInbox(status: string | null | undefined): boolean {
  return isCollabDeclinedStatus(status) || isCollabCompletedStatus(status) || isCollabCancelledStatus(status);
}
