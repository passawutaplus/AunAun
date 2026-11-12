import { cn } from "@/lib/utils";
import { COMMON, useT } from "@/lib/i18n";

type Props = {
  href?: string;
  className?: string;
};

/** First Tab stop — skip chrome to main content (above cookie/dialog stacks). */
export function SkipLink({ href = "#main-content", className }: Props) {
  const t = useT(COMMON);
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200]",
        "focus:rounded-lg focus:bg-background focus:px-4 focus:py-2.5",
        "focus:text-sm focus:font-medium focus:text-foreground",
        "focus:shadow-sm focus:ring-2 focus:ring-ring focus:outline-none",
        className,
      )}
    >
      {t("skipToContent")}
    </a>
  );
}

export default SkipLink;
