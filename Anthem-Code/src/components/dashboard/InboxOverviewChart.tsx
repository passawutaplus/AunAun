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
import { BarChart3, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import ProjectStatsDateRangePicker from "@/components/portfolio/ProjectStatsDateRangePicker";
import {
  DEFAULT_PROJECT_STATS_DATE_RANGE,
  getProjectStatsRangeBounds,
  projectStatsRangeLabel,
  type ProjectStatsDateRange,
} from "@/lib/projectStatsDateRange";
import {
  availableViewGranularities,
  defaultViewGranularity,
  viewGranularityLabel,
  type ViewSeriesGranularity,
} from "@/lib/projectViewSeries";
import {
  averageInboxMetric,
  buildCollabInboxSeries,
  buildHireInboxSeries,
  COLLAB_INBOX_METRICS,
  collabInboxMetricConfig,
  extractCollabInboxTimestamps,
  extractHireInboxTimestamps,
  HIRE_INBOX_METRICS,
  hireInboxMetricConfig,
  previousRangeBounds,
  sumInboxMetric,
  timestampsInRange,
  viewSeriesTrendPercent,
  type CollabInboxMetric,
  type HireInboxMetric,
} from "@/lib/inboxOverviewSeries";

type InboxRow = {
  created_at: string;
  updated_at?: string | null;
  status?: string | null;
  service_id?: string | null;
};

type Props = {
  variant: "hire" | "collab";
  rows: InboxRow[];
  loading?: boolean;
};

function formatTrend(pct: number | null): { text: string; positive: boolean } | null {
  if (pct === null) return null;
  const positive = pct >= 0;
  return {
    text: `${positive ? "+" : ""}${pct.toFixed(1)}% เทียบช่วงก่อน`,
    positive,
  };
}

export default function InboxOverviewChart({ variant, rows, loading = false }: Props) {
  const [dateRange, setDateRange] = useState<ProjectStatsDateRange>(DEFAULT_PROJECT_STATS_DATE_RANGE);
  const [hireMetric, setHireMetric] = useState<HireInboxMetric>("requests");
  const [collabMetric, setCollabMetric] = useState<CollabInboxMetric>("requests");
  const [granularity, setGranularity] = useState<ViewSeriesGranularity>("day");

  const bounds = useMemo(() => getProjectStatsRangeBounds(dateRange), [dateRange]);
  const rangeLabel = projectStatsRangeLabel(dateRange, bounds);
  const metrics = variant === "hire" ? HIRE_INBOX_METRICS : COLLAB_INBOX_METRICS;
  const metric = variant === "hire" ? hireMetric : collabMetric;
  const metricConfig =
    variant === "hire" ? hireInboxMetricConfig(hireMetric) : collabInboxMetricConfig(collabMetric);

  const granularityOptions = useMemo(
    () => (bounds ? availableViewGranularities(bounds.from, bounds.to, dateRange.preset) : (["day"] as ViewSeriesGranularity[])),
    [bounds, dateRange.preset],
  );

  useEffect(() => {
    if (!bounds) return;
    setGranularity(defaultViewGranularity(bounds.from, bounds.to, dateRange.preset));
  }, [bounds, dateRange.preset]);

  useEffect(() => {
    setHireMetric("requests");
    setCollabMetric("requests");
  }, [variant]);

  const series = useMemo(() => {
    if (!bounds) return [];
    if (variant === "hire") {
      return buildHireInboxSeries(extractHireInboxTimestamps(rows), bounds.from, bounds.to, granularity);
    }
    return buildCollabInboxSeries(extractCollabInboxTimestamps(rows), bounds.from, bounds.to, granularity);
  }, [bounds, granularity, rows, variant]);

  const total = sumInboxMetric(series, metric);
  const average = averageInboxMetric(series, metric);

  const previousTotal = useMemo(() => {
    if (!bounds) return 0;
    const prev = previousRangeBounds(bounds.from, bounds.to);
    const stamps =
      variant === "hire" ? extractHireInboxTimestamps(rows) : extractCollabInboxTimestamps(rows);
    return timestampsInRange(stamps[metric] ?? [], prev.from, prev.to).length;
  }, [bounds, metric, rows, variant]);

  const trend = formatTrend(viewSeriesTrendPercent(total, previousTotal));
  const tickInterval = series.length > 8 ? Math.ceil(series.length / 6) : 0;
  const hasPoints = series.some((point) => Number(point[metric]) > 0);

  const chartConfig = {
    value: {
      label: metricConfig.label,
      color: metricConfig.color,
    },
  };

  const emptyCopy =
    variant === "hire"
      ? "ยังไม่มีคำขอจ้างในช่วงนี้ — เมื่อมีคนส่งคำขอ จะโชว์ที่นี่"
      : "ยังไม่มีคำขอคอลแลปในช่วงนี้ — เมื่อมีคนส่งคำขอ จะโชว์ที่นี่";

  return (
    <section className="rounded-2xl border border-border/70 bg-card/40 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-primary" />
            {variant === "hire" ? "ภาพรวมจ้างงาน" : "ภาพรวมคอลแลป"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">ช่วง {rangeLabel}</p>
        </div>
        <ProjectStatsDateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
        {metrics.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (variant === "hire") setHireMetric(item.id as HireInboxMetric);
              else setCollabMetric(item.id as CollabInboxMetric);
            }}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] border transition-colors",
              metric === item.id
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-card/60 border-border/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {total.toLocaleString()}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-0.5">{metricConfig.hint}</p>
          {trend && !loading ? (
            <p
              className={cn(
                "text-[10px] mt-0.5 flex items-center gap-0.5",
                trend.positive ? "text-emerald-500" : "text-rose-500",
              )}
            >
              {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.text}
            </p>
          ) : null}
        </div>

        {granularityOptions.length > 1 ? (
          <div className="flex shrink-0 rounded-lg border border-border/70 bg-muted/30 p-0.5">
            {granularityOptions.map((option) => (
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

      <div className="h-44 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <BanterLoader size="sm" />
          </div>
        ) : !hasPoints ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground text-center px-4">
            {emptyCopy}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
            <AreaChart data={series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id={`inboxOverviewFill-${variant}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.02} />
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
              <YAxis tickLine={false} axisLine={false} fontSize={10} width={28} allowDecimals={false} />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                    formatter={(value) => [`${value}`, metricConfig.label]}
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
                dataKey={metric}
                stroke="var(--color-value)"
                strokeWidth={2}
                fill={`url(#inboxOverviewFill-${variant})`}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </section>
  );
}
