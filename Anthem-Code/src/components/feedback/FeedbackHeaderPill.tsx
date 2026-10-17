import { MessageSquareHeart } from "lucide-react";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";
import { cn } from "@/lib/utils";

/** Header pill that opens the Beta feedback composer. Text collapses to icon + BETA on small screens. */
export default function FeedbackHeaderPill({ className }: { className?: string }) {
  const openFeedback = useOpenFeedbackTicket();
  return (
    <button
      type="button"
      onClick={() => openFeedback()}
      aria-label="ส่งฟีดแบ็ก (Beta)"
      title="ส่งฟีดแบ็ก"
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:px-3",
        className,
      )}
    >
      <MessageSquareHeart className="h-4 w-4 text-primary" aria-hidden />
      <span className="hidden sm:inline">ส่งฟีดแบ็ก</span>
      <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-bold leading-tight tracking-wide text-primary-foreground">
        BETA
      </span>
    </button>
  );
}
