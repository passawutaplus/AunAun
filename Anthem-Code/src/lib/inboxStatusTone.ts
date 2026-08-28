/** Colored pills for hire / collab inbox status labels (Thai UI tabs). */
export function inboxStatusPillClass(label: string): string {
  switch (label) {
    case "ติดต่อใหม่":
    case "ติดต่อแล้ว":
      return "bg-primary/10 text-primary border-primary/25";
    case "ตอบรับ":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
    case "ปฏิเสธ":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "ส่งต่อ":
      return "bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))] border-[hsl(var(--chat-hire))/0.25]";
    case "ยกเลิก":
    case "จบงาน":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
