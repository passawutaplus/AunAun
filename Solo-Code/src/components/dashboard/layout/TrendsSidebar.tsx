import * as React from "react";
import { safeHref } from "@/lib/security";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDailyTrends, type DailyTrendItem } from "@/lib/dailyTrends.functions";
import { DAILY_TRENDS_QUERY_KEY, DAILY_TRENDS_STALE_MS } from "@/hooks/useDailyTrendsPrefetch";
import {
  Newspaper,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendCoverImage } from "@/components/dashboard/TrendCoverImage";

interface TrendsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function TrendsSidebar({ collapsed, onToggle }: TrendsSidebarProps) {
  const fetchTrends = useServerFn(getDailyTrends);
  const { data, isLoading } = useQuery({
    queryKey: DAILY_TRENDS_QUERY_KEY,
    queryFn: () => fetchTrends(),
    staleTime: DAILY_TRENDS_STALE_MS,
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 5000 : false),
  });

  if (collapsed) {
    return (
      <aside className="hidden xl:flex shrink-0 w-10 border-l border-border bg-card/40 flex-col items-center py-3 gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={onToggle}
          aria-label="เปิดแผงเทรนด์"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="rounded-lg bg-primary-soft text-primary p-1.5">
          <Newspaper className="h-4 w-4" />
        </div>
      </aside>
    );
  }

  const items: DailyTrendItem[] = data?.items ?? [];
  const featured = items[0];
  const rest = items.slice(1);

  return (
    <aside className="hidden xl:flex shrink-0 w-[320px] border-l border-border bg-card/40 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center gap-1.5 min-w-0">
          <Newspaper className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold truncate">ข่าวสาร & เทรนด์</h2>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={onToggle}
          aria-label="หุบแผง"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดเทรนด์วันนี้…
            </div>
          )}

          {!isLoading && data?.status === "pending" && items.length === 0 && (
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary mx-auto mb-2" />
              กำลังเตรียมข่าววันนี้…
            </div>
          )}

          {/* Featured card */}
          {featured && (
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-soft">
              <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/20 blur-2xl pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-semibold mb-2">
                  <Sparkles className="h-3 w-3" /> {featured.category}
                </div>
                <div className="mb-2 h-28 rounded-lg overflow-hidden border border-border/60 bg-muted">
                  <TrendCoverImage item={featured} variant="card" className="w-full h-full" />
                </div>
                <h3 className="text-sm font-semibold leading-snug mb-1">{featured.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {featured.body}
                </p>
                {featured.source_url && safeHref(featured.source_url) && (
                  <a
                    href={safeHref(featured.source_url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    อ่านต่อที่ {featured.source ?? "แหล่งอ้างอิง"}{" "}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* List */}
          {rest.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
                เทรนด์อื่นๆ วันนี้
              </p>
              {rest.map((t, i) => (
                <a
                  key={`${i}-${t.title}`}
                  href={safeHref(t.source_url) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-border/60 bg-card hover:shadow-soft hover:-translate-y-0.5 transition-all p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-border/50 bg-muted">
                      <TrendCoverImage item={t} variant="thumb" className="w-full h-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="inline-block text-[9px] font-semibold uppercase tracking-wider text-primary mb-0.5">
                        {t.category}
                      </span>
                      <p className="text-xs font-semibold leading-snug line-clamp-2">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                        {t.body}
                      </p>
                      {t.source && (
                        <p className="text-[10px] text-muted-foreground/80 mt-1 inline-flex items-center gap-0.5">
                          <ExternalLink className="h-2.5 w-2.5" /> {t.source}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {data?.date && (
            <p className="text-center text-[10px] text-muted-foreground/70 pt-2">
              อัปเดตล่าสุด{" "}
              {new Date(data.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}{" "}
              · คัดสรรประจำวัน
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
