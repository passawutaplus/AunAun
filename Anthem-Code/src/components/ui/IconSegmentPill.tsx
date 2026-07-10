import { useId } from "react";
import type { ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon: ReactNode;
};

type IconSegmentPillProps<T extends string> = {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  /** Unique layoutId scope when multiple pills are on screen. */
  layoutGroupId?: string;
  /** `ghost` = no track background/border (icons only). */
  variant?: "default" | "ghost";
};

const indicatorTransition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
} as const;

export function IconSegmentPill<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
  layoutGroupId,
  variant = "default",
}: IconSegmentPillProps<T>) {
  const autoId = useId();
  const groupId = layoutGroupId ?? `icon-segment-${autoId}`;
  const reduced = useReducedMotion();
  const ghost = variant === "ghost";

  return (
    <LayoutGroup id={groupId}>
      <div
        className={cn(
          "inline-flex items-center",
          ghost
            ? "gap-0.5 bg-transparent p-0 border-0"
            : "rounded-full bg-muted/70 p-0.5 border border-border/50",
          disabled && "opacity-50 pointer-events-none",
          className,
        )}
        role="group"
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-label={opt.label}
              aria-pressed={active}
              title={opt.label}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "relative flex items-center justify-center rounded-full transition-colors",
                ghost ? "h-8 w-8" : "h-7 w-7",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active &&
                (reduced ? (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full",
                      ghost ? "bg-muted/50" : "bg-background shadow-sm",
                    )}
                    aria-hidden
                  />
                ) : (
                  <motion.span
                    layoutId={`${groupId}-indicator`}
                    className={cn(
                      "absolute inset-0 rounded-full",
                      ghost ? "bg-muted/50" : "bg-background shadow-sm",
                    )}
                    transition={indicatorTransition}
                    aria-hidden
                  />
                ))}
              <span className="relative z-10 flex items-center justify-center">{opt.icon}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

type PreferenceSegmentRowProps<T extends string> = {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
};

export function PreferenceSegmentRow<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  className,
}: PreferenceSegmentRowProps<T>) {
  return (
    <div className={cn("flex items-center justify-between gap-3 min-h-8", className)}>
      <span className="text-sm text-foreground">{label}</span>
      <IconSegmentPill value={value} options={options} onChange={onChange} disabled={disabled} />
    </div>
  );
}
