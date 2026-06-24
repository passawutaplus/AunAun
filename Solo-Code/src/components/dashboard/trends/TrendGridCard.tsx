import * as React from "react";
import { ExternalLink } from "lucide-react";
import { safeHref } from "@/lib/security";
import type { DailyTrendItem } from "@/lib/dailyTrends.types";
import { TrendCoverImage } from "@/components/dashboard/TrendCoverImage";
import { TrendSourceFavicon } from "./TrendSourceFavicon";

export function TrendGridCard({ item, index }: { item: DailyTrendItem; index: number }) {
  const href = safeHref(item.source_url);
  const Wrapper: React.ElementType = href ? "a" : "div";
  const wrapperProps = href ? { href, target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <Wrapper
      key={`${index}-${item.title}`}
      {...wrapperProps}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <TrendCoverImage
          item={item}
          variant="card"
          className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />
        <span className="absolute top-3 left-3 rounded-full bg-black/45 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1">
          {item.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h4 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </h4>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {item.body}
        </p>
        {item.source && (
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground font-medium truncate inline-flex items-center gap-1.5">
              {item.source_url && <TrendSourceFavicon url={item.source_url} size={16} />}
              {item.source}
            </span>
            {href && (
              <ExternalLink
                className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                aria-hidden
              />
            )}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
