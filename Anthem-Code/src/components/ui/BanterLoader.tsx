import "./banter-loader.css";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

type BanterLoaderProps = {
  size?: Size;
  className?: string;
  "aria-label"?: string;
};

export function BanterLoader({ size = "md", className, "aria-label": ariaLabel }: BanterLoaderProps) {
  return (
    <div
      className={cn("banter-loader", size === "sm" && "banter-loader--sm", className)}
      role="img"
      aria-label={ariaLabel ?? "กำลังโหลด"}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="banter-loader__box" />
      ))}
    </div>
  );
}

type InlineLoaderProps = {
  label?: string;
  size?: Size;
  className?: string;
  labelClassName?: string;
};

export function InlineLoader({
  label = "กำลังโหลด...",
  size = "sm",
  className,
  labelClassName,
}: InlineLoaderProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 py-10", className)}
      role="status"
      aria-live="polite"
    >
      <BanterLoader size={size} aria-label={label} />
      {label ? (
        <p className={cn("text-sm text-muted-foreground thai-body", labelClassName)}>{label}</p>
      ) : null}
    </div>
  );
}

export function CompactLoader({
  label = "กำลังโหลด...",
  className,
  labelClassName,
}: {
  label?: string;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-center gap-2.5 py-4", className)}
      role="status"
      aria-live="polite"
    >
      <BanterLoader size="sm" aria-label={label} />
      {label ? (
        <span className={cn("text-xs text-muted-foreground thai-body", labelClassName)}>{label}</span>
      ) : null}
    </div>
  );
}
