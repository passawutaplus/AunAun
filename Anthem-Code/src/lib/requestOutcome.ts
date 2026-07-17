/** Shared cancel reasons for hire (client) and collab (requester). */

export const REQUEST_CANCEL_REASONS = [
  { id: "changed_mind", label: "เปลี่ยนใจ / ไม่ต้องการแล้ว" },
  { id: "found_other", label: "หาคนอื่นแล้ว" },
  { id: "budget_change", label: "งบหรือขอบเขตเปลี่ยน" },
  { id: "timeline_change", label: "ไทม์ไลน์ไม่ตรงแล้ว" },
  { id: "other", label: "อื่นๆ" },
] as const;

export type RequestCancelReasonId = (typeof REQUEST_CANCEL_REASONS)[number]["id"];

export function requestCancelReasonLabel(id: string | null | undefined): string {
  if (!id) return "";
  return REQUEST_CANCEL_REASONS.find((r) => r.id === id)?.label ?? id;
}
