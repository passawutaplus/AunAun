/** DB enum `hire_status` values used in anthem.hiring_requests (Thai labels). */
export const HIRE_STATUS_NEW = "ใหม่" as const;
export const HIRE_STATUS_ACCEPTED = "ตอบรับ" as const;
export const HIRE_STATUS_DECLINED = "ปฏิเสธ" as const;

/** Statuses that count as "awaiting freelancer response" for badges and inbox. */
export const PENDING_HIRE_STATUSES = [HIRE_STATUS_NEW, "pending"] as const;

export function isPendingHireStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (PENDING_HIRE_STATUSES as readonly string[]).includes(status);
}
