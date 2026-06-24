import { ArrowRight } from "lucide-react";
import { safeHref } from "@/lib/security";
import type { DailyTrendItem } from "@/lib/dailyTrends.types";
import { Button } from "@/components/ui/button";
import { TrendCoverImage } from "@/components/dashboard/TrendCoverImage";
import { TrendSourceFavicon } from "./TrendSourceFavicon";

export function TrendFeaturedCard({ item }: { item: DailyTrendItem }) {
  const sourceHref = item.source_url ? safeHref(item.source_url) : null;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:shadow-elevated transition-all">
      <div className="grid md:grid-cols-2 gap-0">
        <div className="relative aspect-[16/11] md:aspect-auto md:min-h-[300px] overflow-hidden bg-muted">
          <TrendCoverImage
            item={item}
            variant="featured"
            className="absolute inset-0 w-full h-full group-hover:scale-[1.03] transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5 pointer-events-none" />
          <span className="absolute top-4 left-4 rounded-full bg-black/45 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1">
            {item.category}
          </span>
        </div>
        <div className="p-6 sm:p-8 flex flex-col justify-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            ไฮไลท์วันนี้
          </p>
          <h2 className="mt-2 text-xl sm:text-2xl font-bold leading-snug tracking-tight">
            {item.title}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-4">
            {item.body}
          </p>
          {sourceHref && (
            <a href={sourceHref} target="_blank" rel="noopener noreferrer" className="mt-5 w-fit">
              <Button size="sm" className="gap-1.5">
                <TrendSourceFavicon url={item.source_url!} />
                อ่านที่ {item.source ?? "แหล่งอ้างอิง"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
