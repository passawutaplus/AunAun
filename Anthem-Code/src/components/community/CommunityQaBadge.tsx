import { cn } from "@/lib/utils";

export function CommunityQaBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-primary/30 bg-primary/10",
        "px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary",
        className,
      )}
    >
      Q&A
    </span>
  );
}
