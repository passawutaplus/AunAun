import { BanterLoader } from "@/components/ui/BanterLoader";
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
        fullPage ? "min-h-screen bg-background" : "py-16",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <BanterLoader size="md" aria-label={label} />
      {label ? <span className="text-sm thai-body">{label}</span> : null}
    </div>
  );
}
