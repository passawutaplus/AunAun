import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brandConfig";

type Props = {
  showWordmark?: boolean;
  size?: "sm" | "md";
  /**
   * Which Master file to show (Brand Book p10–11):
   * - "brand" / "theme": primary colour lockup on light, white lockup in dark mode
   * - "ink": primary colour lockup always (pages pinned to the light paper field)
   * - "paper": white lockup always (dark or photo backgrounds)
   */
  tone?: "brand" | "ink" | "paper" | "theme";
  className?: string;
  /** Small BETA tag after the wordmark (app headers during the Beta). */
  beta?: boolean;
};

const LOCKUP = { light: "/brand/logo-horizontal.svg", dark: "/brand/logo-horizontal-white.svg" };
const SYMBOL = { light: "/brand/symbol-red.svg", dark: "/brand/symbol-white.svg" };

/**
 * Master logo files only — never redraw or retype the wordmark (Brand Book p12).
 * The horizontal lockup must stay ≥96px wide; below that the symbol is used alone.
 */
export function BrandLogo({ showWordmark = true, size = "md", tone = "brand", className, beta = false }: Props) {
  const src = showWordmark ? LOCKUP : SYMBOL;
  const box = showWordmark
    ? size === "sm"
      ? "h-7 w-auto sm:h-8"
      : "h-9 w-auto sm:h-10"
    : size === "sm"
      ? "h-8 w-8"
      : "h-9 w-9";
  const followsTheme = tone === "brand" || tone === "theme";
  const single = tone === "paper" ? src.dark : src.light;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {followsTheme ? (
        <>
          <img src={src.light} alt={BRAND_NAME} className={cn(box, "block dark:hidden")} draggable={false} />
          <img src={src.dark} alt={BRAND_NAME} className={cn(box, "hidden dark:block")} draggable={false} />
        </>
      ) : (
        <img src={single} alt={BRAND_NAME} className={cn(box, "block")} draggable={false} />
      )}
      {beta && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold leading-tight tracking-wide text-primary-foreground">
          BETA
        </span>
      )}
    </div>
  );
}
