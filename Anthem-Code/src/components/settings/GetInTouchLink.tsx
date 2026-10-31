import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Settings → the About / Get in Touch page (contact channels + what is coming next). */
export function GetInTouchLink({ className }: { className?: string }) {
  return (
    <Link
      to="/learn#contact"
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-accent",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-light tracking-tight text-foreground">Get in Touch</span>
        <span className="block truncate text-xs text-muted-foreground">รู้จัก SAMECOR · ติดต่อทีม · ฟีเจอร์ที่กำลังมา</span>
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden />
    </Link>
  );
}
