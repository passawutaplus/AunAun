import type { ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const underlineTransition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 32,
};

type SlidingChipRailProps = {
  /** Unique layoutId scope — required when multiple rails can exist. */
  layoutGroupId: string;
  className?: string;
  children: ReactNode;
};

/** Horizontal chip rail with a shared sliding underline scope. */
export function SlidingChipRail({ layoutGroupId, className, children }: SlidingChipRailProps) {
  return (
    <LayoutGroup id={layoutGroupId}>
      <div className={className}>{children}</div>
    </LayoutGroup>
  );
}

type SlidingChipProps = {
  label: ReactNode;
  active: boolean;
  onClick: () => void;
  layoutGroupId: string;
  className?: string;
};

/** Category chip — orange underline slides between active items. */
export function SlidingChip({
  label,
  active,
  onClick,
  layoutGroupId,
  className,
}: SlidingChipProps) {
  const reduced = useReducedMotion();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative shrink-0 whitespace-nowrap text-sm font-medium py-1.5 transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {label}
      {active &&
        (reduced ? (
          <span
            className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-primary rounded-full"
            aria-hidden
          />
        ) : (
          <motion.span
            layoutId={`${layoutGroupId}-underline`}
            className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-primary rounded-full"
            transition={underlineTransition}
            aria-hidden
          />
        ))}
    </button>
  );
}
