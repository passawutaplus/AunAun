import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

/** The "?" that replays a page tour. Always available, finished or not. */
export function TourHelpButton({ onClick, className, label = "ดูทัวร์แนะนำ" }: { onClick: () => void; className?: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <CircleHelp className="h-4 w-4" aria-hidden />
    </button>
  );
}
