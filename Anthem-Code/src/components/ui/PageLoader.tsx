import { Skeleton } from "@/components/ui/skeleton";
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
        fullPage ? "min-h-[50vh] bg-background" : "py-12",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
        </span>
        <span className="text-sm thai-body">{label}</span>
      </div>
      <div className="w-full max-w-xs space-y-2 px-4">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-2 w-4/5 mx-auto rounded-full" />
      </div>
    </div>
  );
}
