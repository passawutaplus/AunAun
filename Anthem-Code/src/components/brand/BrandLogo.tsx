import { cn } from "@/lib/utils";
import { BRAND_MARK, BRAND_NAME } from "@/lib/brandConfig";

type Props = {
  showWordmark?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/** Header / auth mark — gradient square + optional Aplus1 wordmark */
export function BrandLogo({ showWordmark = true, size = "md", className }: Props) {
  const box =
    size === "sm"
      ? "w-8 h-8 rounded-lg text-[9px]"
      : "w-9 h-9 rounded-xl text-[10px]";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          box,
          "bg-gradient-brand flex items-center justify-center shadow-sm font-medium leading-none text-white",
        )}
        aria-hidden
      >
        {BRAND_MARK}
      </div>
      {showWordmark && (
        <span className="font-medium text-lg leading-tight text-foreground">
          <span className="text-gradient">Aplus</span>
          <span>1</span>
        </span>
      )}
    </div>
  );
}
