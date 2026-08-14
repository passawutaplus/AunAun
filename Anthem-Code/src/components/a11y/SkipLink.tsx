import { cn } from "@/lib/utils";

type Props = {
  href?: string;
  className?: string;
};

/** First Tab stop — skip chrome to main content. */
export function SkipLink({ href = "#main-content", className }: Props) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100]",
        "focus:rounded-lg focus:bg-background focus:px-4 focus:py-2.5",
        "focus:text-sm focus:font-medium focus:text-foreground",
        "focus:shadow-lg focus:ring-2 focus:ring-ring focus:outline-none",
        className,
      )}
    >
      ข้ามไปเนื้อหาหลัก
    </a>
  );
}

export default SkipLink;
