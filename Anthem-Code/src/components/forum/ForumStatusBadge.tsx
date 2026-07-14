import { FORUM_STATUS_LABELS, FORUM_STATUS_TONES, type ForumTopicStatus } from "@/lib/forum";
import { cn } from "@/lib/utils";

export function ForumStatusBadge({ status, className }: { status: ForumTopicStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        FORUM_STATUS_TONES[status] ?? FORUM_STATUS_TONES.open,
        className,
      )}
    >
      {FORUM_STATUS_LABELS[status] ?? status}
    </span>
  );
}
