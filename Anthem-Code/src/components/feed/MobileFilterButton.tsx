import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { FILTER } from "@/lib/i18n/social";

/** Round filter button in the one-row phone bar, left of the mode pill. Shows how many filters are on. */
export default function MobileFilterButton({
  count = 0,
  onClick,
  className,
}: {
  count?: number;
  onClick: () => void;
  className?: string;
}) {
  const t = useT(FILTER);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? t("filtersOn", { n: count }) : t("filters")}
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <SlidersHorizontal className="h-5 w-5" aria-hidden />
      {count > 0 ? (
        <span
          className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background"
          aria-hidden
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
