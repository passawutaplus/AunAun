import type { ReactNode } from "react";
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
};

export function IconSegmentPill<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
}: IconSegmentPillProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-muted/70 p-0.5 border border-border/50",
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
              "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
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
