import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  /** Show empty stars up to max (always 5). */
  className?: string;
  "aria-label"?: string;
};

const SIZE = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-7 w-7",
} as const;

/** Interactive or display stars — full scale 1–5. */
export function StarRating({
  value,
  onChange,
  size = "md",
  readOnly = false,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const clamped = Math.max(0, Math.min(5, Math.round(value)));
  const interactive = !readOnly && typeof onChange === "function";

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : "img"}
      aria-label={ariaLabel ?? (interactive ? "ให้คะแนน 1 ถึง 5 ดาว" : `${clamped} จาก 5 ดาว`)}
    >
      {([1, 2, 3, 4, 5] as const).map((n) => {
        const filled = n <= clamped;
        if (!interactive) {
          return (
            <Star
              key={n}
              className={cn(
                SIZE[size],
                filled ? "fill-primary text-primary" : "text-muted-foreground/30",
              )}
              aria-hidden
            />
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={clamped === n}
            aria-label={`${n} ดาว`}
            className="rounded-sm p-0.5 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onChange(n)}
          >
            <Star
              className={cn(
                SIZE[size],
                filled ? "fill-primary text-primary" : "text-muted-foreground/35",
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

/** Average display e.g. ★ 4.8 / 5 */
export function StarAverageLabel({
  average,
  count,
  className,
}: {
  average: number | null;
  count: number;
  className?: string;
}) {
  if (!count || average == null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>ยังไม่มีรีวิว</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-foreground", className)}>
      <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden />
      <span className="font-semibold tabular-nums">{average.toFixed(1)}</span>
      <span className="text-muted-foreground">/ 5</span>
      <span className="text-muted-foreground">· {count} รีวิว</span>
    </span>
  );
}
