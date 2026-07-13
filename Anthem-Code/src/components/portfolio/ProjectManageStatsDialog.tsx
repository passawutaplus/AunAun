import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { BarChart3, Bookmark, Eye, Handshake, Layers3, Loader2, Mail, MessageCircle, RefreshCw } from "lucide-react";

import BriefcaseIcon from "@/components/icons/BriefcaseIcon";

import { PlusOneControl } from "@/components/brand/PlusOneControl";

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogHeader,

  DialogTitle,

} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import type { Project } from "@/data/projectTypes";

import {

  EMPTY_PROJECT_METRIC_SERIES,

  EMPTY_PROJECT_STATS_IN_RANGE,

  type ProjectStatsMetric,

  useProjectManageStatsForRange,

  useProjectMetricSeries,

} from "@/hooks/usePortfolioProjectStats";

import { timeAgoTH } from "@/lib/format";

import { supabase } from "@/integrations/supabase/client";

import {

  getProjectStatsRangeBounds,

  projectStatsRangeLabel,

  type ProjectStatsDateRange,

} from "@/lib/projectStatsDateRange";

import ProjectStatsDateRangePicker from "@/components/portfolio/ProjectStatsDateRangePicker";

import ProjectViewsChart from "@/components/portfolio/ProjectViewsChart";

import { cn } from "@/lib/utils";



type Props = {

  open: boolean;

  onOpenChange: (open: boolean) => void;

  project: Project | null;

  ownerId?: string;

  isPinned?: boolean;

  onView?: () => void;

  onEdit?: () => void;

};

const STATS_DIALOG_DEFAULT_RANGE: ProjectStatsDateRange = { preset: "today" };

const PROJECT_STATS_METRIC_CONFIG: Record<
  ProjectStatsMetric,
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
    description: "ผู้ชมที่ล็อกอินในช่วงที่เลือก",
    valueLabel: "ครั้ง",
    color: "hsl(var(--primary))",
    icon: <Eye className="w-3 h-3" />,
  },
  hires: {
    title: "สนใจจ้างงาน",
    description: "คำขอจ้างจากผลงานนี้ในช่วงที่เลือก",
    valueLabel: "คำขอ",
    color: "hsl(var(--chat-hire))",
    icon: <BriefcaseIcon className="w-3 h-3" />,
  },
  collabs: {
    title: "สนใจคอลแลป",
    description: "คำขอคอลแลปจากผลงานนี้ในช่วงที่เลือก",
    valueLabel: "คำขอ",
    color: "hsl(var(--chat-collab))",
    icon: <Handshake className="w-3 h-3" />,
  },
  likes: {
    title: "ถูกใจ",
    description: "คนที่กดถูกใจผลงานนี้ในช่วงที่เลือก",
    valueLabel: "ครั้ง",
    color: "hsl(var(--primary))",
    icon: <PlusOneControl active={false} count={0} size="sm" className="pointer-events-none" />,
  },
  saves: {
    title: "บันทึก",
    description: "บุ๊กมาร์กและคอลเลกชันจากผลงานนี้ในช่วงที่เลือก",
    valueLabel: "ครั้ง",
    color: "hsl(199 89% 48%)",
    icon: <Bookmark className="w-3 h-3" />,
  },
  comments: {
    title: "คอมเมนต์",
    description: "คอมเมนต์ใหม่ในผลงานนี้ในช่วงที่เลือก",
    valueLabel: "ครั้ง",
    color: "hsl(142 71% 45%)",
    icon: <MessageCircle className="w-3 h-3" />,
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
        onSelect && "cursor-pointer hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        active && "border-primary/70 bg-primary/10",
      )}
    >

      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>

      {loading ? (

        <div className="mt-1 flex justify-center py-1">

          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />

        </div>

      ) : (

        <p className={`text-xl font-semibold tabular-nums mt-0.5 ${accent ? "text-primary" : "text-foreground"}`}>

          {value.toLocaleString()}

        </p>

      )}

      {hint ? <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p> : null}

    </Comp>

  );

}



export default function ProjectManageStatsDialog({

  open,

  onOpenChange,

  project,

  ownerId,

  isPinned,

  onView,

  onEdit,

}: Props) {

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dateRange, setDateRange] = useState<ProjectStatsDateRange>(STATS_DIALOG_DEFAULT_RANGE);
  const [selectedMetric, setSelectedMetric] = useState<ProjectStatsMetric>("views");



  useEffect(() => {

    if (!open) {
      setDateRange(STATS_DIALOG_DEFAULT_RANGE);
      setSelectedMetric("views");
    }

  }, [open]);



  const bounds = useMemo(() => getProjectStatsRangeBounds(dateRange), [dateRange]);

  const rangeLabel = projectStatsRangeLabel(dateRange, bounds);



  const {
    data: rangeStats = EMPTY_PROJECT_STATS_IN_RANGE,
    isLoading,
    isFetching,
    refetch: refetchRangeStats,
  } =

    useProjectManageStatsForRange(

      ownerId,

      project?.id,

      bounds?.from.toISOString(),

      bounds?.to.toISOString(),

      open && !!project,

    );



  const {
    data: metricSeriesPayload = EMPTY_PROJECT_METRIC_SERIES,
    isLoading: metricSeriesLoading,
    isFetching: metricSeriesFetching,
    refetch: refetchMetricSeries,
  } = useProjectMetricSeries(

    ownerId,
    project?.id,
    bounds?.from.toISOString(),

    bounds?.to.toISOString(),

    open && !!project && !!bounds,

  );



  const statsLoading = isLoading || isFetching;

  const chartLoading = metricSeriesLoading || metricSeriesFetching;

  const metricConfig = PROJECT_STATS_METRIC_CONFIG[selectedMetric];

  const selectedSeries = metricSeriesPayload[selectedMetric] ?? EMPTY_PROJECT_METRIC_SERIES.views;

  const refreshStats = useCallback(() => {
    void refetchRangeStats();
    void refetchMetricSeries();
    if (ownerId) {
      void queryClient.invalidateQueries({ queryKey: ["portfolio-project-stats", ownerId] });
      void queryClient.invalidateQueries({ queryKey: ["my-projects", ownerId] });
    }
  }, [ownerId, queryClient, refetchMetricSeries, refetchRangeStats]);

  useEffect(() => {
    if (!open || !project?.id) return;
    const invalidate = () => refreshStats();
    const ch = supabase
      .channel(`project-stats-dialog-${project.id}`)
      .on("postgres_changes", { event: "*", schema: "anthem", table: "project_views", filter: `project_id=eq.${project.id}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "anthem", table: "project_likes", filter: `project_id=eq.${project.id}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "anthem", table: "project_bookmarks", filter: `project_id=eq.${project.id}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "anthem", table: "collection_items", filter: `project_id=eq.${project.id}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "anthem", table: "project_comments", filter: `project_id=eq.${project.id}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "anthem", table: "hiring_requests", filter: `project_id=eq.${project.id}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "anthem", table: "collab_requests" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "anthem", table: "projects", filter: `id=eq.${project.id}` }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [open, project?.id, refreshStats]);



  if (!project) return null;



  const saves = rangeStats.bookmarkCount + rangeStats.collectionSaveCount;

  const opportunities = rangeStats.hireCount + rangeStats.collabCount;

  const dateLabel =

    project.publishedDate && !Number.isNaN(Date.parse(project.publishedDate))

      ? timeAgoTH(project.publishedDate)

      : project.publishedDate;



  return (

    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="max-w-md sm:max-w-xl gap-0 p-0 overflow-hidden">

        <DialogHeader className="p-5 pb-3 space-y-2 text-left border-b border-border/60">

          <div className="flex items-start gap-2 pr-6">

            <BarChart3 className="w-5 h-5 text-primary shrink-0 mt-0.5" />

            <div className="min-w-0">

              <DialogTitle className="text-base leading-snug line-clamp-2">{project.title}</DialogTitle>

              <DialogDescription className="text-xs mt-1">

                สถิติผลงาน · {rangeLabel}

                {isPinned ? " · ปักหมุดในโปรไฟล์" : ""}

                {dateLabel ? ` · เผยแพร่ ${dateLabel}` : ""}

              </DialogDescription>

            </div>

          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">

            <div className="flex flex-wrap gap-1.5">

              <Badge variant="outline" className="text-[10px] font-normal">

                {project.status}

              </Badge>

              <Badge className="text-[10px] font-normal bg-primary/15 text-primary border-0">

                {project.category}

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
                <RefreshCw className={cn("w-3.5 h-3.5", (statsLoading || chartLoading) && "animate-spin")} />
              </Button>
              <ProjectStatsDateRangePicker value={dateRange} onChange={setDateRange} />
            </div>

          </div>

        </DialogHeader>



        <div className="p-5 space-y-5 max-h-[min(70vh,36rem)] overflow-y-auto">

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

                hint="ผู้ชมที่กลับมาดู"

                loading={statsLoading}

                active={selectedMetric === "views"}

                onSelect={() => setSelectedMetric("views")}

              />

              <StatCell
                label="ยอดดูรวม"
                value={project.views}
                hint="ตลอดเวลา"
                active={selectedMetric === "views"}
                onSelect={() => setSelectedMetric("views")}
              />

            </div>

          </section>



          <section className="space-y-2">

            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">

              <BriefcaseIcon className="w-3.5 h-3.5 text-muted-foreground" />

              โอกาสจากชิ้นนี้

            </h3>

            <div className="grid grid-cols-2 gap-2">

              <StatCell

                label="สนใจจ้างงาน"

                value={rangeStats.hireCount}

                accent={rangeStats.hireCount > 0}

                loading={statsLoading}

                active={selectedMetric === "hires"}

                onSelect={() => setSelectedMetric("hires")}

              />

              <StatCell

                label="สนใจคอลแลป"

                value={rangeStats.collabCount}

                accent={rangeStats.collabCount > 0}

                loading={statsLoading}

                active={selectedMetric === "collabs"}

                onSelect={() => setSelectedMetric("collabs")}

              />

            </div>

            {!statsLoading && opportunities === 0 ? (

              <p className="text-[11px] text-muted-foreground leading-relaxed">

                ยังไม่มีคำขอในช่วงนี้ — แชร์ลิงก์โปรไฟล์หรือผลงานให้ลูกค้าเห็นชัดขึ้น

              </p>

            ) : null}

          </section>



          <section className="space-y-2">

            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">

              <Handshake className="w-3.5 h-3.5 text-muted-foreground" />

              การมีส่วนร่วม

            </h3>

            <div className="grid grid-cols-3 gap-2">

              <StatCell
                label="ถูกใจ"
                value={rangeStats.likeCount}
                hint={`รวม ${project.likes.toLocaleString()}`}
                accent={rangeStats.likeCount > 0}
                loading={statsLoading}
                active={selectedMetric === "likes"}
                onSelect={() => setSelectedMetric("likes")}
              />

              <StatCell
                label="บันทึก"
                value={saves}
                loading={statsLoading}
                active={selectedMetric === "saves"}
                onSelect={() => setSelectedMetric("saves")}
              />

              <StatCell
                label="คอมเมนต์"
                value={rangeStats.commentCount}
                loading={statsLoading}
                active={selectedMetric === "comments"}
                onSelect={() => setSelectedMetric("comments")}
              />

            </div>

            {!statsLoading && (rangeStats.bookmarkCount > 0 || rangeStats.collectionSaveCount > 0) && (

              <p className="text-[10px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">

                {rangeStats.bookmarkCount > 0 && (

                  <span className="inline-flex items-center gap-1">

                    <Bookmark className="w-3 h-3" />

                    บุ๊กมาร์ก {rangeStats.bookmarkCount}

                  </span>

                )}

                {rangeStats.collectionSaveCount > 0 && (

                  <span className="inline-flex items-center gap-1">

                    <Layers3 className="w-3 h-3" />

                    คอลเลกชัน {rangeStats.collectionSaveCount}

                  </span>

                )}

              </p>

            )}

          </section>

        </div>



        <div className="p-4 border-t border-border/60 flex flex-wrap gap-2 justify-end bg-muted/20">

          {project.status === "Published" && onView ? (

            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onView}>

              <Eye className="w-3.5 h-3.5 mr-1.5" />

              ดูผลงาน

            </Button>

          ) : null}

          {onEdit ? (

            <Button type="button" size="sm" className="rounded-full" onClick={onEdit}>

              แก้ไขผลงาน

            </Button>

          ) : null}

          {(rangeStats.hireCount > 0 || rangeStats.collabCount > 0) && (

            <Button

              type="button"

              variant="secondary"

              size="sm"

              className="rounded-full"

              onClick={() => {

                onOpenChange(false);

                navigate("/portfolio?focus=hiring");

              }}

            >

              <Mail className="w-3.5 h-3.5 mr-1.5" />

              ดูคำขอที่โปรไฟล์

            </Button>

          )}

        </div>

      </DialogContent>

    </Dialog>

  );

}


