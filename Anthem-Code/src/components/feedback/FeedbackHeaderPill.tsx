import { MessageSquareHeart } from "lucide-react";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";
import { cn } from "@/lib/utils";

/** Header button that opens the Beta feedback composer. Icon only; the label slides out on hover / focus. */
export default function FeedbackHeaderPill({ className }: { className?: string }) {
  const openFeedback = useOpenFeedbackTicket();
  return (
    <button
      type="button"
      onClick={() => openFeedback()}
      aria-label="ส่งฟีดแบ็ก"
      className={cn(
        "group inline-flex h-9 shrink-0 items-center rounded-full px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <MessageSquareHeart className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span
        aria-hidden
        className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-out group-hover:ml-1.5 group-hover:max-w-[6rem] group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-[6rem] group-focus-visible:opacity-100"
      >
        ส่งฟีดแบ็ก
      </span>
    </button>
  );
}
