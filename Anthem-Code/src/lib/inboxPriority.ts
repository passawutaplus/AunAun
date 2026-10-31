export const INBOX_PRIORITIES = ["ปกติ", "รอได้", "ด่วน"] as const;
export type InboxPriority = (typeof INBOX_PRIORITIES)[number];

export function parseInboxPriority(value: string | null | undefined): InboxPriority {
  if (value === "รอได้" || value === "ด่วน") return value;
  return "ปกติ";
}

export function inboxPriorityDotClass(priority: InboxPriority): string {
  switch (priority) {
    case "ด่วน":
      return "bg-destructive";
    case "รอได้":
      return "bg-warning";
    default:
      return "bg-success";
  }
}
