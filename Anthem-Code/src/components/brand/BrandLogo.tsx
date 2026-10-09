import { cn } from "@/lib/utils";
import { BRAND_MARK, BRAND_NAME } from "@/lib/brandConfig";

type Props = {
  showWordmark?: boolean;
  size?: "sm" | "md";
  /** Ink on paper, or paper on the dark homepage field. Brand keeps the orange tile. */
  tone?: "brand" | "ink" | "paper";
  className?: string;
};

/** Header / auth mark — small tile plus the SAMECOR wordmark. */
export function BrandLogo({ showWordmark = true, size = "md", tone = "brand", className }: Props) {
  const box =
    size === "sm"
      ? "w-8 h-8 rounded-lg text-[9px]"
      : "w-9 h-9 rounded-xl text-[10px]";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          box,
          tone === "paper" ? "bg-[#f5f5f5] text-[#2f2e2c]" : tone === "ink" ? "bg-[#2f2e2c] text-white" : "bg-gradient-brand text-white",
          "flex items-center justify-center font-medium leading-none",
          tone === "brand" && "shadow-sm",
        )}
        aria-hidden
      >
        {BRAND_MARK}
      </div>
      {showWordmark && (
        <span className={cn("font-medium text-lg leading-tight tracking-tight", tone === "paper" ? "text-[#f5f5f5]" : tone === "ink" ? "text-[#2f2e2c]" : "text-foreground")}>
          {BRAND_NAME}
        </span>
      )}
    </div>
  );
}
