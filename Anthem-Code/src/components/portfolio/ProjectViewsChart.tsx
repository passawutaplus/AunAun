import { useEffect, useMemo, useState } from "react";
import { BanterLoader } from "@/components/ui/BanterLoader";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { ProjectStatsDateRange, ProjectStatsRangeBounds } from "@/lib/projectStatsDateRange";
import {
  averageViewSeries,
  buildProjectViewSeries,
  defaultViewGranularity,
  availableViewGranularities,
  sumViewSeries,
  viewGranularityLabel,
  viewSeriesTrendPercent,
  type ViewSeriesGranularity,
} from "@/lib/projectViewSeries";

type Props = {
  viewedAt: string[];
  previousViewedAt: string[];
  bounds: ProjectStatsRangeBounds;
  dateRange: ProjectStatsDateRange;
  loading?: boolean;
};

const chartConfig = {
  views: {
    label: "ผู้ชม",
    color: "hsl(var(--primary))",
  },
};

function formatTrend(pct: number | null): { text: string; positive: boolean } | null {
  if (pct === null) return null;
  const positive = pct >= 0;
  return {
    text: `${positive ? "+" : ""}${pct.toFixed(1)}% เทียบช่วงก่อน`,
    positive,
  };
}

export default function ProjectViewsChart({
  viewedAt,
  previousViewedAt,
  bounds,
  dateRange,
  loading,
}: Props) {
  const options = useMemo(
    () => availableViewGranularities(bounds.from, bounds.to, dateRange.preset),
    [bounds.from, bounds.to, dateRange.preset],
  );

  const [granularity, setGranularity] = useState<ViewSeriesGranularity>(() =>
    defaultViewGranularity(bounds.from, bounds.to, dateRange.preset),
  );

  useEffect(() => {
    setGranularity(defaultViewGranularity(bounds.from, bounds.to, dateRange.preset));
  }, [bounds.from, bounds.to, dateRange.preset]);

  const series = useMemo(
    () => buildProjectViewSeries(viewedAt, bounds.from, bounds.to, granularity),
    [viewedAt, bounds.from, bounds.to, granularity],
  );

  const total = sumViewSeries(series);
  const average = averageViewSeries(series);
  const previousTotal = previousViewedAt.length;
  const trend = formatTrend(viewSeriesTrendPercent(total, previousTotal));

  const tickInterval = series.length > 8 ? Math.ceil(series.length / 6) : 0;

  return (
    <div className="rounded-2xl border border-border/70 bg-card/40 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" />
            การเข้าชม
          </p>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-foreground mt-0.5">
              {total.toLocaleString()}
            </p>
          )}
          {trend && !loading ? (
            <p
              className={cn(
                "text-[10px] mt-0.5 flex items-center gap-0.5",
                trend.positive ? "text-emerald-500" : "text-rose-500",
              )}
            >
              {trend.positive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.text}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground mt-0.5">ผู้ชมที่ล็อกอินในช่วงที่เลือก</p>
          )}
        </div>

        {options.length > 1 ? (
          <div className="flex shrink-0 rounded-lg border border-border/70 bg-muted/30 p-0.5">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                className={cn(
                  "px-2 py-0.5 text-[10px] rounded-md transition-colors",
                  granularity === option
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setGranularity(option)}
              >
                {viewGranularityLabel(option)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="h-40 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <BanterLoader size="sm" />
          </div>
        ) : series.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground text-center px-4">
            ยังไม่มีข้อมูลผู้ชมในช่วงนี้
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
            <AreaChart data={series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="projectViewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-views)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                interval={tickInterval}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                width={28}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                    formatter={(value) => [`${value} คน`, "ผู้ชม"]}
                  />
                }
              />
              {average > 0 ? (
                <ReferenceLine
                  y={average}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                  label={{
                    value: "เฉลี่ย",
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="views"
                stroke="var(--color-views)"
                strokeWidth={2}
                fill="url(#projectViewsFill)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
