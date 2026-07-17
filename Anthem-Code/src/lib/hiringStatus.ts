/** DB enum `hire_status` values used in anthem.hiring_requests (Thai labels). */
export const HIRE_STATUS_NEW = "ใหม่" as const;
export const HIRE_STATUS_NEEDS_REPLY = "ที่ต้องตอบ" as const;
export const HIRE_STATUS_CONTACTED = "ติดต่อแล้ว" as const;
export const HIRE_STATUS_ACCEPTED = "ตอบรับ" as const;
export const HIRE_STATUS_DECLINED = "ปฏิเสธ" as const;
/** DB completed — UI label is จบงาน */
export const HIRE_STATUS_COMPLETED = "ปิดแล้ว" as const;
export const HIRE_STATUS_CANCELLED = "ยกเลิก" as const;

/**
 * UI label for contacted / new-inbox bucket.
 * DB still stores `ติดต่อแล้ว`; legacy `ใหม่` / `ที่ต้องตอบ` fold into this tab.
 */
export const HIRE_TAB_CONTACTED_NEW = "ติดต่อใหม่" as const;
export const HIRE_TAB_ACCEPTED = "ตอบรับ" as const;
export const HIRE_TAB_DECLINED = "ปฏิเสธ" as const;
export const HIRE_TAB_FORWARDED = "ส่งต่อ" as const;
export const HIRE_TAB_CANCELLED = "ยกเลิก" as const;
/** Completed jobs (DB: ปิดแล้ว) */
export const HIRE_TAB_COMPLETED = "จบงาน" as const;
export const HIRE_TAB_ALL = "ทั้งหมด" as const;

export type HireInboxTab =
  | typeof HIRE_TAB_CONTACTED_NEW
  | typeof HIRE_TAB_ACCEPTED
  | typeof HIRE_TAB_DECLINED
  | typeof HIRE_TAB_FORWARDED
  | typeof HIRE_TAB_CANCELLED
  | typeof HIRE_TAB_COMPLETED
  | typeof HIRE_TAB_ALL;

export const HIRE_TAB_ORDER: HireInboxTab[] = [
  HIRE_TAB_CONTACTED_NEW,
  HIRE_TAB_ACCEPTED,
  HIRE_TAB_DECLINED,
  HIRE_TAB_FORWARDED,
  HIRE_TAB_CANCELLED,
  HIRE_TAB_COMPLETED,
  HIRE_TAB_ALL,
];

/** Statuses shown under the 「ติดต่อใหม่」 inbox tab. */
export const CONTACTED_NEW_STATUSES = [
  HIRE_STATUS_CONTACTED,
  HIRE_STATUS_NEW,
  HIRE_STATUS_NEEDS_REPLY,
] as const;

/** Statuses that count as "awaiting freelancer response" for badges and inbox. */
export const PENDING_HIRE_STATUSES = [
  HIRE_STATUS_CONTACTED,
  HIRE_STATUS_NEW,
  HIRE_STATUS_NEEDS_REPLY,
  "pending",
] as const;

export function isPendingHireStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (PENDING_HIRE_STATUSES as readonly string[]).includes(status);
}

export function isContactedNewStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (CONTACTED_NEW_STATUSES as readonly string[]).includes(status);
}

export function isHireCompletedStatus(status: string | null | undefined): boolean {
  return status === HIRE_STATUS_COMPLETED;
}

export function isHireCancelledStatus(status: string | null | undefined): boolean {
  return status === HIRE_STATUS_CANCELLED;
}

export function isHireTerminalStatus(status: string | null | undefined): boolean {
  return (
    status === HIRE_STATUS_DECLINED ||
    isHireCompletedStatus(status) ||
    isHireCancelledStatus(status)
  );
}

/** Active job that can be completed (จบงาน) — after accept only. */
export function canCompleteHireStatus(status: string | null | undefined): boolean {
  return status === HIRE_STATUS_ACCEPTED;
}

/** Client can cancel mid-way (not already terminal / not forwarded-out). */
export function canCancelHireStatus(status: string | null | undefined): boolean {
  if (!status || isHireTerminalStatus(status)) return false;
  return (
    isContactedNewStatus(status) ||
    status === HIRE_STATUS_ACCEPTED ||
    status === HIRE_STATUS_CONTACTED
  );
}

/** Badge / list label — never show legacy 「ใหม่」/「ที่ต้องตอบ」; map ปิดแล้ว → จบงาน. */
export function labelHireStatus(status: string | null | undefined): string {
  if (!status) return "—";
  if (isContactedNewStatus(status)) return HIRE_TAB_CONTACTED_NEW;
  if (isHireCompletedStatus(status)) return HIRE_TAB_COMPLETED;
  if (isHireCancelledStatus(status)) return HIRE_TAB_CANCELLED;
  return status;
}
