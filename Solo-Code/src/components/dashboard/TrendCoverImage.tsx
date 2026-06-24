import * as React from "react";
import { safeHref } from "@/lib/security";
import type { DailyTrendItem } from "@/lib/dailyTrends.types";
import { trendCoverFallback } from "@/lib/trendCoverImages";
import { TrendIcon } from "@/lib/trendIcons";

interface TrendCoverImageProps {
  item: DailyTrendItem;
  variant?: "featured" | "card" | "thumb";
  className?: string;
}

export function TrendCoverImage({ item, variant = "card", className = "" }: TrendCoverImageProps) {
  const primary = item.image_url ? safeHref(item.image_url) : null;
  const fallback = safeHref(trendCoverFallback(item.iconKey, item.category));
  const [src, setSrc] = React.useState(primary ?? fallback);

  React.useEffect(() => {
    setSrc(primary ?? fallback);
  }, [primary, fallback]);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`object-cover ${className}`}
        onError={() => {
          if (fallback && src !== fallback) setSrc(fallback);
          else setSrc(null);
        }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  const iconSize = variant === "featured" ? "xl" : variant === "thumb" ? "xs" : "lg";

  return (
    <TrendIcon
      category={item.category}
      iconKey={item.iconKey}
      size={iconSize}
      variant="soft"
      className={className}
    />
  );
}
