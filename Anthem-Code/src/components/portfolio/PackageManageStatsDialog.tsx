import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Eye, FolderKanban, Loader2, Mail, RefreshCw } from "lucide-react";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProjectStatsDateRangePicker from "@/components/portfolio/ProjectStatsDateRangePicker";
import ProjectViewsChart from "@/components/portfolio/ProjectViewsChart";
import type { CreatorService } from "@/hooks/useCreatorServices";
import { formatServicePriceRange } from "@/hooks/useCreatorServices";
import {
  EMPTY_PACKAGE_SERVICE_DETAIL_STATS,
  EMPTY_PACKAGE_SERVICE_METRIC_SERIES,
  usePackageServiceDetailStats,
  usePackageServiceMetricSeries,
  type PackageServiceMetric,
} from "@/hooks/usePackageServiceStats";
import { timeAgoTH } from "@/lib/format";
import {
  getProjectStatsRangeBounds,
  projectStatsRangeLabel,
  type ProjectStatsDateRange,
} from "@/lib/projectStatsDateRange";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: CreatorService | null;
  ownerId: string;
  onPreview?: () => void;
  onEdit?: () => void;
};

const STATS_DIALOG_DEFAULT_RANGE: ProjectStatsDateRange = { preset: "today" };

const METRIC_CONFIG: Record<
  PackageServiceMetric,
  {
    title: string;
    description: string;
    valueLabel: string;
    color: string;
    icon: ReactNode;
  }
> = {
  views: {
    title: "การเข้าชม",
    description: "ผู้ชมที่ล็อกอินเปิดแพ็กเกจในช่วงที่เลือก",
    valueLabel: "ครั้ง",
    color: "hsl(var(--primary))",
    icon: <Eye className="w-3 h-3" />,
  },
  hires: {
    title: "กดจ้างจากแพ็กเกจ",
    description: "คำขอจ้างที่เริ่มจากแพ็กเกจนี้ในช่วงที่เลือก",
    valueLabel: "คำขอ",
    color: "hsl(var(--chat-hire))",
    icon: <Mail className="w-3 h-3" />,
  },
};

function StatCell({
  label,
  value,
  hint,
  accent,
  loading,
  active,
  onSelect,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
  loading?: boolean;
  active?: boolean;
  onSelect?: () => void;
}) {
  const Comp = onSelect ? "button" : "div";
  return (
    <Comp
      type={onSelect ? "button" : undefined}
      onClick={onSelect}
      className={cn(
        "rounded-xl border border-border/70 bg-card/60 px-3 py-2.5 text-center transition-colors",
        onSelect &&
          "cursor-pointer hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        active && "border-primary/70 bg-primary/10",
      )}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {loading ? (
        <div className="mt-1 flex justify-center py-1">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <p
          className={`text-xl font-semibold tabular-nums mt-0.5 ${
            accent ? "text-primary" : "text-foreground"
          }`}
        >
          {value.toLocaleString()}
        </p>
      )}
      {hint ? <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p> : null}
    </Comp>
  );
}

export default function PackageManageStatsDialog({
  open,
  onOpenChange,
  service,
  ownerId,
  onPreview,
  onEdit,
}: Props) {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<ProjectStatsDateRange>(STATS_DIALOG_DEFAULT_RANGE);
  const [selectedMetric, setSelectedMetric] = useState<PackageServiceMetric>("views");

  useEffect(() => {
    if (!open) {
      setDateRange(STATS_DIALOG_DEFAULT_RANGE);
      setSelectedMetric("views");
    }
  }, [open]);

  const bounds = useMemo(() => getProjectStatsRangeBounds(dateRange), [dateRange]);
  const rangeLabel = projectStatsRangeLabel(dateRange, bounds);
  const fromIso = bounds?.from.toISOString();
  const toIso = bounds?.to.toISOString();

  const {
    data: rangeStats = EMPTY_PACKAGE_SERVICE_DETAIL_STATS,
    isLoading,
    isFetching,
    refetch: refetchRangeStats,
  } = usePackageServiceDetailStats(
    ownerId,
    service?.id,
    fromIso,
    toIso,
    open && !!service && !!bounds,
  );

  const {
    data: metricSeriesPayload = EMPTY_PACKAGE_SERVICE_METRIC_SERIES,
    isLoading: metricSeriesLoading,
    isFetching: metricSeriesFetching,
    refetch: refetchMetricSeries,
  } = usePackageServiceMetricSeries(
    ownerId,
    service?.id,
    fromIso,
    toIso,
    open && !!service && !!bounds,
  );

  const statsLoading = isLoading || isFetching;
  const chartLoading = metricSeriesLoading || metricSeriesFetching;
  const metricConfig = METRIC_CONFIG[selectedMetric];
  const selectedSeries = metricSeriesPayload[selectedMetric];

  const refreshStats = useCallback(() => {
    void refetchRangeStats();
    void refetchMetricSeries();
    if (ownerId) {
      void queryClient.invalidateQueries({ queryKey: ["package-stats-by-service", ownerId] });
      void queryClient.invalidateQueries({ queryKey: ["package-manage-stats", ownerId] });
      void queryClient.invalidateQueries({ queryKey: ["package-overview-series", ownerId] });
    }
  }, [ownerId, queryClient, refetchMetricSeries, refetchRangeStats]);

  useEffect(() => {
    if (!open || !service?.id) return;
    const invalidate = () => refreshStats();
    const ch = supabase
      .channel(`package-stats-dialog-${service.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "anthem", table: "creator_service_views", filter: `service_id=eq.${service.id}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "anthem", table: "hiring_requests", filter: `service_id=eq.${service.id}` },
        invalidate,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [open, refreshStats, service?.id]);

  if (!service) return null;

  const price = formatServicePriceRange(service.price_min_thb, service.price_thb);
  const publishedLabel =
    service.status === "Published" && service.updated_at && !Number.isNaN(Date.parse(service.updated_at))
      ? timeAgoTH(service.updated_at)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-xl md:max-w-2xl gap-0 p-0 overflow-hidden w-[calc(100vw-1rem)]">
        <DialogHeader className="p-4 sm:p-5 pb-3 space-y-2 text-left border-b border-border/60">
          <div className="flex items-start gap-2 pr-6">
            <BarChart3 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <DialogTitle className="text-base leading-snug line-clamp-2">
                {service.title}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                สถิติแพ็กเกจ · {rangeLabel}
                {publishedLabel ? ` · อัปเดต ${publishedLabel}` : ""}
                {` · ${price}`}
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] font-normal">
                {service.status === "Published" ? "เผยแพร่" : "แบบร่าง"}
              </Badge>
              <Badge className="text-[10px] font-normal bg-primary/15 text-primary border-0">
                Package
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refreshStats}
                disabled={statsLoading || chartLoading}
                className="h-8 w-8 rounded-full p-0"
                aria-label="รีเฟรชสถิติ"
                title="รีเฟรชสถิติ"
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", (statsLoading || chartLoading) && "animate-spin")}
                />
              </Button>
              <ProjectStatsDateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-5 max-h-[min(70dvh,36rem)] overflow-y-auto overscroll-contain">
          {bounds ? (
            <ProjectViewsChart
              viewedAt={selectedSeries.current}
              previousViewedAt={selectedSeries.previous}
              bounds={bounds}
              dateRange={dateRange}
              title={metricConfig.title}
              description={metricConfig.description}
              valueLabel={metricConfig.valueLabel}
              color={metricConfig.color}
              icon={metricConfig.icon}
              loading={chartLoading}
            />
          ) : null}

          <section className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <StatCell
                label="ในช่วงที่เลือก"
                value={rangeStats.viewCount}
                accent
                hint="คนดูแพ็กเกจ"
                loading={statsLoading}
                active={selectedMetric === "views"}
                onSelect={() => setSelectedMetric("views")}
              />
              <StatCell
                label="ยอดดูรวม"
                value={rangeStats.allTimeViewCount}
                hint="ตลอดเวลา"
                active={selectedMetric === "views"}
                onSelect={() => setSelectedMetric("views")}
              />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <BriefcaseIcon className="w-3.5 h-3.5 text-muted-foreground" />
              โอกาสจากแพ็กเกจนี้
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCell
                label="กดจ้างในช่วงนี้"
                value={rangeStats.hireCount}
                accent={rangeStats.hireCount > 0}
                loading={statsLoading}
                active={selectedMetric === "hires"}
                onSelect={() => setSelectedMetric("hires")}
              />
              <StatCell
                label="กดจ้างรวม"
                value={rangeStats.allTimeHireCount}
                hint="ตลอดเวลา"
                accent={rangeStats.allTimeHireCount > 0}
                active={selectedMetric === "hires"}
                onSelect={() => setSelectedMetric("hires")}
              />
            </div>
            {!statsLoading && rangeStats.hireCount === 0 ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                ยังไม่มีคำขอจ้างในช่วงนี้ — แชร์แพ็กเกจหรือผลงานที่เกี่ยวข้องให้ลูกค้าเห็นชัดขึ้น
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />
              มาจากผลงาน
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              คนที่เปิดดูหรือกดจ้างแพ็กเกจนี้หลังจากเห็นผลงานชิ้นไหน (ในช่วงที่เลือก)
            </p>
            {statsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : rangeStats.referrers.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 py-6 text-center">
                ยังไม่มีข้อมูลว่ามาจากผลงานไหน
                {rangeStats.viewWithoutProject || rangeStats.hireWithoutProject
                  ? ` — มีวิว ${rangeStats.viewWithoutProject} / จ้าง ${rangeStats.hireWithoutProject} จากโปรไฟล์หรือช่องทางอื่น`
                  : ""}
              </p>
            ) : (
              <ul className="space-y-2">
                {rangeStats.referrers.map((r) => (
                  <li key={r.projectId}>
                    <Link
                      to={`/project/${r.projectId}`}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-2.5 hover:bg-accent/40 transition-colors"
                    >
                      {r.coverUrl ? (
                        <img
                          src={r.coverUrl}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                          <FolderKanban className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                          ดู {r.viewCount} · จ้าง {r.hireCount}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {(rangeStats.viewWithoutProject > 0 || rangeStats.hireWithoutProject > 0) &&
            rangeStats.referrers.length > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                อื่นๆ (ไม่ผูกผลงาน): ดู {rangeStats.viewWithoutProject} · จ้าง{" "}
                {rangeStats.hireWithoutProject}
              </p>
            ) : null}
          </section>
        </div>

        {(onPreview || onEdit) && (
          <div className="flex justify-end gap-2 border-t border-border/60 p-4">
            {onPreview ? (
              <Button type="button" variant="outline" className="rounded-full gap-1.5" onClick={onPreview}>
                <Eye className="w-4 h-4" />
                ดูแพ็กเกจ
              </Button>
            ) : null}
            {onEdit ? (
              <Button type="button" className="rounded-full" onClick={onEdit}>
                แก้ไขแพ็กเกจ
              </Button>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
