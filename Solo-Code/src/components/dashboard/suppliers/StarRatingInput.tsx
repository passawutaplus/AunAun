import * as React from "react";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  className?: string;
}

export function StarRatingInput({ value, onChange, size = 28, className }: Props) {
  const [hover, setHover] = React.useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHover(null)}
        role="radiogroup"
        aria-label="ให้คะแนน 0 ถึง 5 ดาว"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= display;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(value === n ? 0 : n)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") onChange(Math.min(5, value + 1));
                if (e.key === "ArrowLeft") onChange(Math.max(0, value - 1));
              }}
              className="rounded-md p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`${n} ดาว`}
            >
              <Star
                style={{ width: size, height: size }}
                className={cn(
                  "transition-colors",
                  active
                    ? "fill-amber-400 stroke-amber-500"
                    : "fill-transparent stroke-muted-foreground/40",
                )}
              />
            </button>
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8">
        {display > 0 ? `${display}.0` : "—"}
      </span>
      {value > 0 && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-0.5"
          aria-label="ล้างคะแนน"
        >
          <X className="h-3 w-3" /> ล้าง
        </button>
      )}
    </div>
  );
}
