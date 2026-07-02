import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** compact glyph for buttons */
  variant?: "inline" | "badge";
  filled?: boolean;
};

/** Appreciation heart mark (likes — not PX currency). */
export function PlusOneMark({ className, variant = "inline", filled }: Props) {
  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center leading-none",
          "p-0.5 rounded border border-primary/40 bg-primary/10 text-primary",
          className,
        )}
        aria-hidden
      >
        <Heart className={cn("w-2.5 h-2.5", filled && "fill-current")} strokeWidth={filled ? 0 : 2} />
      </span>
    );
  }

  return (
    <Heart
      className={cn("w-[1em] h-[1em] inline-block", filled && "fill-current", className)}
      strokeWidth={filled ? 0 : 2}
      aria-hidden
    />
  );
}
