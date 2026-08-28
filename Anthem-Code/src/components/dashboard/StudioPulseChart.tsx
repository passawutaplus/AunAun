import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Eye, LayoutGrid } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BanterLoader } from "@/components/ui/BanterLoader";
import PackagesIcon from "@/components/icons/PackagesIcon";
import ProjectStatsDateRangePicker from "@/components/portfolio/ProjectStatsDateRangePicker";
import { usePortfolioOverviewSeries } from "@/hooks/usePortfolioOverviewSeries";
import { usePackageOverviewSeries } from "@/hooks/usePackageOverviewSeries";
import { useCreatorServices } from "@/hooks/useCreatorServices";
import {
  buildStudioPulseSeries,
  studioPulseHasSignal,
} from "@/lib/studioPulseSeries";
import {
  getProjectStatsRangeBounds,
  projectStatsRangeLabel,
  type ProjectStatsDateRange,
} from "@/lib/projectStatsDateRange";
import { defaultViewGranularity } from "@/lib/projectViewSeries";
import { cn } from "@/lib/utils";
import { smoothEase } from "@/lib/motion";

export type StudioPulseScope = "projects" | "packages";

type Props = {
  userId: string;
  projectIds: string[];
  enabled?: boolean;
  dateRange: ProjectStatsDateRange;
  onDateRangeChange: (value: ProjectStatsDateRange) => void;
  scope: StudioPulseScope;
  onScopeChange: (value: StudioPulseScope) => void;
};

const chartConfig = {
  views: { label: "วิว", color: "hsl(var(--primary))" },
};

const SCOPE_TABS = [
  { id: "projects" as const, label: "Projects", icon: LayoutGrid },
  { id: "packages" as const, label: "Packages", icon: PackagesIcon },
];

const slideTransition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.7,
};

type IndicatorBox = { x: number; width: number };

function StudioScopeToggle({
  scope,
  onScopeChange,
}: {
  scope: StudioPulseScope;
  onScopeChange: (value: StudioPulseScope) => void;
}) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<IndicatorBox | null>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const btn = btnRefs.current.get(scope);
      if (!btn) {
        setIndicator(null);
        return;
      }
      const btnRect = btn.getBoundingClientRect();
      if (btnRect.width < 1) {
        setIndicator(null);
        return;
      }
      const trackRect = track.getBoundingClientRect();
      const next = {
        x: btnRect.left - trackRect.left,
        width: btnRect.width,
      };
      setIndicator((prev) =>
        prev && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.width - next.width) < 0.5
          ? prev
          : next,
      );
    };

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [scope]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label="สลับยอดเข้าชม"
      className="relative flex w-[min(14.5rem,100%)] shrink-0 items-center rounded-full glass-panel p-0.5 transition-shadow duration-200 hover:shadow-md hover:shadow-primary/20"
    >
      {indicator ? (
        reduced ? (
          <span
            className="pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-full bg-gradient-brand"
            style={{ transform: `translateX(${indicator.x}px)`, width: indicator.width }}
            aria-hidden
          />
        ) : (
          <motion.span
            className="pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-full bg-gradient-brand will-change-transform"
            initial={false}
            animate={{ x: indicator.x, width: indicator.width }}
            transition={slideTransition}
            aria-hidden
          />
        )
      ) : null}
      {SCOPE_TABS.map(({ id, label, icon: Icon }) => {
        const active = scope === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            ref={(el) => {
              if (el) btnRefs.current.set(id, el);
              else btnRefs.current.delete(id);
            }}
            onClick={() => onScopeChange(id)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              active ? "text-white" : "text-foreground/75 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function StudioPulseChart({
  userId,
  projectIds,
  enabled = true,
  dateRange,
  onDateRangeChange,
  scope,
  onScopeChange,
}: Props) {
  const reduceMotion = useReducedMotion();
  const bounds = useMemo(() => getProjectStatsRangeBounds(dateRange), [dateRange]);
  const rangeLabel = projectStatsRangeLabel(dateRange, bounds);
  const granularity = bounds
    ? defaultViewGranularity(bounds.from, bounds.to, dateRange.preset)
    : "day";
  const fromIso = bounds?.from.toISOString();
  const toIso = bounds?.to.toISOString();

  const { data: services = [], isLoading: servicesLoading } = useCreatorServices(userId, {
    includeDrafts: true,
  });
  const serviceIds = useMemo(() => services.map((service) => service.id), [services]);

  const projectQuery = usePortfolioOverviewSeries(userId, projectIds, fromIso, toIso, enabled && !!bounds);
  const packageQuery = usePackageOverviewSeries(
    userId,
    serviceIds,
    fromIso,
    toIso,
    enabled && !!bounds && !servicesLoading,
  );

  const activeQuery = scope === "projects" ? projectQuery : packageQuery;
  const series = useMemo(() => {
    if (!bounds) return [];
    const stamps =
      scope === "projects" ? (projectQuery.data?.current.views ?? []) : (packageQuery.data?.current.views ?? []);
    return buildStudioPulseSeries(stamps, bounds.from, bounds.to, granularity);
  }, [bounds, granularity, packageQuery.data, projectQuery.data, scope]);

  const loading =
    !!bounds && (activeQuery.isLoading || activeQuery.isFetching || (scope === "packages" && servicesLoading));
  const hasSignal = studioPulseHasSignal(series);
  const isPackages = scope === "packages";
  const tickInterval = series.length > 8 ? Math.ceil(series.length / 6) : 0;
  const chartKey = `${scope}-${dateRange.preset}-${fromIso ?? ""}-${toIso ?? ""}`;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: smoothEase }}
      className="space-y-3 rounded-2xl glass-panel p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
            ยอดเข้าชม
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isPackages ? "คนที่มาดูแพ็กเกจทั้งหมด" : "คนที่มาดูผลงานทั้งหมด"}
            {" · "}
            {rangeLabel}
          </p>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
          <ProjectStatsDateRangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            className="h-8 max-w-[8.5rem]"
          />
          <StudioScopeToggle scope={scope} onScopeChange={onScopeChange} />
        </div>
      </div>

      <div className="h-56 w-full sm:h-64">
        {!bounds ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <Eye className="h-8 w-8 text-muted-foreground/50" aria-hidden />
            <p className="text-sm text-foreground">เลือกช่วงวันก่อน</p>
            <p className="text-xs text-muted-foreground">กดปฏิทินด้านบน แล้วใส่ตั้งแต่วันที่ถึงวันที่</p>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center">
            <BanterLoader size="sm" />
          </div>
        ) : !hasSignal ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <Eye className="h-8 w-8 text-muted-foreground/50" aria-hidden />
            <p className="text-sm text-foreground">
              {isPackages ? "ยังไม่มีคนดูแพ็กเกจในช่วงนี้" : "ยังไม่มีคนดูผลงานในช่วงนี้"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPackages
                ? "เมื่อมีคนเปิดดูแพ็กเกจ เส้นกราฟจะขยับที่นี่"
                : "เมื่อมีคนเปิดดูผลงาน เส้นกราฟจะขยับที่นี่"}
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
            <AreaChart key={chartKey} data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id={`studioViewsFill-${scope}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.42} />
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
              <YAxis tickLine={false} axisLine={false} fontSize={10} width={28} allowDecimals={false} />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                    formatter={(value) => [`${value} วิว`, isPackages ? "Packages" : "Projects"]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="var(--color-views)"
                strokeWidth={2.4}
                fill={`url(#studioViewsFill-${scope})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={!reduceMotion}
                animationDuration={1100}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </motion.section>
  );
}
