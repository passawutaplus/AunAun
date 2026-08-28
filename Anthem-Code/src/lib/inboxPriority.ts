export const INBOX_PRIORITIES = ["ปกติ", "รอได้", "ด่วน"] as const;
export type InboxPriority = (typeof INBOX_PRIORITIES)[number];

export function parseInboxPriority(value: string | null | undefined): InboxPriority {
  if (value === "รอได้" || value === "ด่วน") return value;
  return "ปกติ";
}

export function inboxPriorityDotClass(priority: InboxPriority): string {
  switch (priority) {
    case "ด่วน":
      return "bg-red-500";
    case "รอได้":
      return "bg-amber-500";
    default:
      return "bg-emerald-500";
  }
}
