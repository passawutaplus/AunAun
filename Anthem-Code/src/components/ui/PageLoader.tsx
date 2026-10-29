import { BrandLoader } from "@/components/ui/BrandLoader";
import { cn } from "@/lib/utils";

interface Props {
  label?: string;
  className?: string;
  /** full page vs inline block */
  fullPage?: boolean;
}

export default function PageLoader({ label = "กำลังโหลด...", className, fullPage = true }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-muted-foreground",
        fullPage ? "min-h-screen brand-loading-screen" : "py-16",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <BrandLoader size={fullPage ? 96 : 56} aria-label={label} />
      {/* Logo only on screen; the label is for screen readers. */}
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}
