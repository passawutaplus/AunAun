import * as React from "react";
import { ChevronDown, Loader2, Newspaper } from "lucide-react";
import { useDailyTrendsQuery } from "@/hooks/useDailyTrendsQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendFeaturedCard } from "@/components/dashboard/trends/TrendFeaturedCard";
import { TrendGridCard } from "@/components/dashboard/trends/TrendGridCard";

const PREVIEW_COUNT = 4;

export function HomeTrendsBriefing() {
  const { data, isLoading } = useDailyTrendsQuery();
  const [expanded, setExpanded] = React.useState(false);

  const items = data?.items ?? [];
  const isPending = data?.status === "pending" && items.length === 0;
  const featured = items[0];
  const rest = items.slice(1);
  const preview = rest.slice(0, PREVIEW_COUNT);
  const more = rest.slice(PREVIEW_COUNT);

  const dateLabel = data?.date
    ? new Date(data.date).toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : new Date().toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

  return (
    <section id="news" className="space-y-4 scroll-mt-28">
      <div className="flex items-start gap-2.5">
        <span className="rounded-lg bg-primary-soft text-primary p-2 shrink-0">
          <Newspaper className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight">So1o Daily</h2>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{dateLabel}</p>
        </div>
      </div>

      {isLoading && !data && (
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      )}

      {isPending && (
        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" aria-hidden />
          <p className="text-sm font-semibold">กำลังเตรียมข่าววันนี้…</p>
          <p className="text-xs text-muted-foreground">หน้านี้จะอัปเดตอัตโนมัติ</p>
        </div>
      )}

      {!isLoading && featured && <TrendFeaturedCard item={featured} />}

      {!isLoading && preview.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {preview.map((t, i) => (
            <TrendGridCard key={`${i}-${t.title}`} item={t} index={i} />
          ))}
        </div>
      )}

      {!isLoading && more.length > 0 && (
        <>
          {expanded && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {more.map((t, i) => (
                <TrendGridCard key={`more-${i}-${t.title}`} item={t} index={i + PREVIEW_COUNT} />
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded((e) => !e)}
            className="gap-1.5 w-full sm:w-auto"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            />
            {expanded ? "ย่อเทรนด์" : `ดูเทรนด์เพิ่มอีก ${more.length} เรื่อง`}
          </Button>
        </>
      )}
    </section>
  );
}
