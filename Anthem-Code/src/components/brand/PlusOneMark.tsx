import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** compact glyph for buttons */
  variant?: "inline" | "badge";
};

/** +1 brand mark — appreciation signal (not PX currency). */
export function PlusOneMark({ className, variant = "inline" }: Props) {
  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center font-semibold tabular-nums leading-none",
          "text-[10px] px-1 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary",
          className,
        )}
        aria-hidden
      >
        +1
      </span>
    );
  }
  return (
    <span className={cn("font-semibold tabular-nums tracking-tight", className)} aria-hidden>
      +1
    </span>
  );
}
