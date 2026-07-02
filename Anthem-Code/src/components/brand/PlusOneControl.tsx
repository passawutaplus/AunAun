import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  active?: boolean;
  count?: number;
  showCount?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  ariaLabel?: string;
};

/**
 * Appreciation control — heart icon (+1 in aria/copy); backend still uses likes/project_likes.
 */
export function PlusOneControl({
  active = false,
  count,
  showCount = true,
  size = "sm",
  disabled,
  className,
  onClick,
  ariaLabel = "Give +1",
}: Props) {
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const heartSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  const inner = (
    <>
      <Heart
        className={cn(
          heartSize,
          "shrink-0",
          active ? "fill-primary text-primary" : "text-current",
        )}
        strokeWidth={active ? 0 : 2}
        aria-hidden
      />
      {showCount && count != null && count > 0 && (
        <span className="tabular-nums">{count}</span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors",
          textSize,
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1", textSize, active && "text-primary", className)}
    >
      {inner}
    </span>
  );
}
