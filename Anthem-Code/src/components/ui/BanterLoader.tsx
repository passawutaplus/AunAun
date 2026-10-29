import { cn } from "@/lib/utils";
import { BrandLoader } from "@/components/ui/BrandLoader";

type Size = "sm" | "md";

type BanterLoaderProps = {
  size?: Size;
  className?: string;
  "aria-label"?: string;
};

/** App-wide loading mark (SAMECOR spotlight symbol). Name kept for the many existing callers. */
export function BanterLoader({ size = "md", className, "aria-label": ariaLabel }: BanterLoaderProps) {
  return <BrandLoader size={size === "sm" ? 24 : 56} className={className} aria-label={ariaLabel ?? "กำลังโหลด"} />;
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
        <p className={cn("sr-only", labelClassName)}>{label}</p>
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
        <span className={cn("sr-only", labelClassName)}>{label}</span>
      ) : null}
    </div>
  );
}
