import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { BarChart3, Bookmark, Eye, Handshake, Layers3, Loader2, Mail } from "lucide-react";

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

  EMPTY_PROJECT_STATS_IN_RANGE,

  useProjectManageStatsForRange,

  useProjectViewSeries,

} from "@/hooks/usePortfolioProjectStats";

import { timeAgoTH } from "@/lib/format";

import {

  DEFAULT_PROJECT_STATS_DATE_RANGE,

  getProjectStatsRangeBounds,

  projectStatsRangeLabel,

  type ProjectStatsDateRange,

} from "@/lib/projectStatsDateRange";

import ProjectStatsDateRangePicker from "@/components/portfolio/ProjectStatsDateRangePicker";

import ProjectViewsChart from "@/components/portfolio/ProjectViewsChart";



type Props = {

  open: boolean;

  onOpenChange: (open: boolean) => void;

  project: Project | null;

  ownerId?: string;

  isPinned?: boolean;

  onView?: () => void;

  onEdit?: () => void;

};



function StatCell({

  label,

  value,

  hint,

  accent,

  loading,

}: {

  label: string;

  value: number;

  hint?: string;

  accent?: boolean;

  loading?: boolean;

}) {

  return (

    <div className="rounded-xl border border-border/70 bg-card/60 px-3 py-2.5 text-center">

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

    </div>

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

  const [dateRange, setDateRange] = useState<ProjectStatsDateRange>(DEFAULT_PROJECT_STATS_DATE_RANGE);



  useEffect(() => {

    if (!open) setDateRange(DEFAULT_PROJECT_STATS_DATE_RANGE);

  }, [open]);



  const bounds = useMemo(() => getProjectStatsRangeBounds(dateRange), [dateRange]);

  const rangeLabel = projectStatsRangeLabel(dateRange, bounds);



  const { data: rangeStats = EMPTY_PROJECT_STATS_IN_RANGE, isLoading, isFetching } =

    useProjectManageStatsForRange(

      ownerId,

      project?.id,

      bounds?.from.toISOString(),

      bounds?.to.toISOString(),

      open && !!project,

    );



  const {

    data: viewSeriesPayload = { current: [], previous: [] },

    isLoading: viewSeriesLoading,

    isFetching: viewSeriesFetching,

  } = useProjectViewSeries(

    project?.id,

    bounds?.from.toISOString(),

    bounds?.to.toISOString(),

    open && !!project && !!bounds,

  );



  const statsLoading = isLoading || isFetching;

  const chartLoading = viewSeriesLoading || viewSeriesFetching;



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

            <ProjectStatsDateRangePicker value={dateRange} onChange={setDateRange} />

          </div>

        </DialogHeader>



        <div className="p-5 space-y-5 max-h-[min(70vh,36rem)] overflow-y-auto">

          {bounds ? (
            <ProjectViewsChart
              viewedAt={viewSeriesPayload.current}
              previousViewedAt={viewSeriesPayload.previous}
              bounds={bounds}
              dateRange={dateRange}
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

              />

              <StatCell label="ยอดดูรวม" value={project.views} hint="ตลอดเวลา" />

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

              />

              <StatCell

                label="สนใจคอลแลป"

                value={rangeStats.collabCount}

                accent={rangeStats.collabCount > 0}

                loading={statsLoading}

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

              <div className="rounded-xl border border-border/70 bg-card/60 px-3 py-2.5 text-center">

                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ถูกใจ</p>

                <div className="mt-1 flex justify-center">

                  <PlusOneControl

                    active={false}

                    count={project.likes}

                    showCount

                    size="sm"

                    className="pointer-events-none text-foreground"

                  />

                </div>

                <p className="text-[10px] text-muted-foreground mt-0.5">ตลอดเวลา</p>

              </div>

              <StatCell label="บันทึก" value={saves} loading={statsLoading} />

              <StatCell label="คอมเมนต์" value={rangeStats.commentCount} loading={statsLoading} />

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


