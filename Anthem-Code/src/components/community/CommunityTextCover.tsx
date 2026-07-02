import { postHeadline } from "@/lib/classifyCommunityPost";
import { resolveCommunityTextCoverTheme } from "@/lib/communityTextCover";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  body?: string;
  tags?: string[];
  seed: string;
  themeId?: string | null;
  aspectClass?: string;
  className?: string;
  /** Smaller type for thumbnails */
  compact?: boolean;
};

export function CommunityTextCover({
  title = "",
  body = "",
  tags = [],
  seed,
  themeId,
  aspectClass = "aspect-square",
  className,
  compact,
}: Props) {
  const theme = resolveCommunityTextCoverTheme(themeId, seed, tags);
  const headline = postHeadline(title, body);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden flex items-center justify-center p-4 sm:p-6",
        aspectClass,
        className,
      )}
      style={{ background: theme.background }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />
      <p
        className={cn(
          "relative z-10 text-center font-semibold text-white leading-snug thai-body drop-shadow-md line-clamp-6",
          compact ? "text-xs sm:text-sm px-1" : "text-sm sm:text-base md:text-lg px-2",
        )}
      >
        {headline}
      </p>
    </div>
  );
}
