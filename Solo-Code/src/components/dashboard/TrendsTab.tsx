import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDailyTrends, type DailyTrendItem } from "@/lib/dailyTrends.functions";
import { DAILY_TRENDS_QUERY_KEY, DAILY_TRENDS_STALE_MS } from "@/hooks/useDailyTrendsPrefetch";
import { Newspaper, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";
import { TrendFeaturedCard } from "@/components/dashboard/trends/TrendFeaturedCard";
import { TrendGridCard } from "@/components/dashboard/trends/TrendGridCard";

export function TrendsTab({ embedded = false }: { embedded?: boolean }) {
  const fetchTrends = useServerFn(getDailyTrends);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: DAILY_TRENDS_QUERY_KEY,
    queryFn: () => fetchTrends(),
    staleTime: DAILY_TRENDS_STALE_MS,
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 5000 : false),
  });

  const isPending = data?.status === "pending" && (data.items?.length ?? 0) === 0;

  const items: DailyTrendItem[] = data?.items ?? [];
  const [activeCat, setActiveCat] = React.useState<string>("ทั้งหมด");

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return ["ทั้งหมด", ...Array.from(set)];
  }, [items]);

  const filtered = activeCat === "ทั้งหมด" ? items : items.filter((i) => i.category === activeCat);
  const featured = filtered[0];
  const rest = filtered.slice(1);

  const dateLabel = data?.date
    ? new Date(data.date).toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <div className={embedded ? "space-y-5" : "space-y-6 animate-fade-in"}>
      {!embedded && (
        <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-7 shadow-soft">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="rounded-2xl bg-gradient-primary text-primary-foreground p-3 shadow-elevated shrink-0">
                <Newspaper className="h-6 w-6" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">
                  So1o Daily
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 leading-tight">
                  ข่าวสาร & เทรนด์วันนี้
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 capitalize">
                  {dateLabel}
                </p>
              </div>
            </div>
          </div>
        </header>
      )}

      {categories.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                activeCat === c
                  ? "bg-primary text-primary-foreground border-primary shadow-soft"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {!isLoading && isPending && (
        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-10 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" aria-hidden />
          <p className="text-sm font-semibold">กำลังเตรียมข่าววันนี้ให้อยู่…</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            ระบบดึงข่าวจากแหล่งจริงแล้วสรุปเป็นภาษาไทย — ใช้เวลาสักครู่ หน้านี้จะอัปเดตอัตโนมัติ
          </p>
          {isFetching && (
            <p className="text-[11px] text-muted-foreground/70">กำลังตรวจสอบอีกครั้ง…</p>
          )}
        </div>
      )}

      {isLoading && !data && (
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      )}

      {!isLoading && featured && <TrendFeaturedCard item={featured} />}

      {!isLoading && rest.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              เทรนด์อื่นๆ วันนี้
            </h3>
            <span className="text-[11px] text-muted-foreground">{rest.length} บทความ</span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rest.map((t, i) => (
              <TrendGridCard key={`${i}-${t.title}`} item={t} index={i} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && !isPending && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          ยังไม่มีข่าวสารในหมวดนี้
        </div>
      )}

      {!embedded && <PageFooterActions feature="trends" label="ข่าวสาร & เทรนด์" />}
    </div>
  );
}
