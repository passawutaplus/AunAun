import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, FolderKanban, Globe2, Lock, Pencil, Plus, Share2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useDeleteProjectSeries,
  useProjectSeries,
  useProjectSeriesItems,
  useRemoveProjectFromSeries,
  useUpdateProjectSeries,
  type ProjectSeries,
} from "@/hooks/useProjectSeries";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { SeriesAnimatedGrid } from "@/components/series/SeriesAnimatedGrid";
import SharePopover from "@/components/SharePopover";
import { cn } from "@/lib/utils";
import type { SeriesWorksDensity } from "@/lib/seriesGridDensity";
import type { ProjectManageSortMode } from "@/lib/portfolioManageSort";
import type { SeriesStatusFilter } from "@/components/series/SeriesWorkspaceToolbar";
import type { ProjectManageStats } from "@/hooks/usePortfolioProjectStats";
import { EMPTY_PROJECT_STATS } from "@/hooks/usePortfolioProjectStats";
import type { DBProject } from "@/hooks/useProjects";
import { toast } from "sonner";

type Props = {
  seriesId: string;
  density: SeriesWorksDensity;
  query: string;
  statusFilter: SeriesStatusFilter;
  sortMode: ProjectManageSortMode;
  projectsById?: Map<string, DBProject>;
  statsMap?: Record<string, ProjectManageStats>;
  onShowStats?: (projectId: string) => void;
  onDeleted?: () => void;
  onEdit?: (series: ProjectSeries) => void;
  onAddProjects?: (series: ProjectSeries) => void;
};

function sortItems<
  T extends {
    added_at?: string;
    project?: { title?: string } | null;
  },
>(items: T[], mode: ProjectManageSortMode): T[] {
  const list = [...items];
  const ts = (item: T) => {
    const n = Date.parse(item.added_at ?? "");
    return Number.isNaN(n) ? 0 : n;
  };
  switch (mode) {
    case "oldest":
      return list.sort((a, b) => ts(a) - ts(b));
    case "newest":
    default:
      // likes/views unavailable on series item payload — fall back to added date
      return list.sort((a, b) => ts(b) - ts(a));
  }
}

export function SeriesWorkspaceDetail({
  seriesId,
  density,
  query,
  statusFilter,
  sortMode,
  projectsById,
  statsMap = {},
  onShowStats,
  onDeleted,
  onEdit,
  onAddProjects,
}: Props) {
  const navigate = useNavigate();
  const { data: series, isLoading } = useProjectSeries(seriesId);
  const { data: items = [], isLoading: itemsLoading } = useProjectSeriesItems(seriesId);
  const remove = useRemoveProjectFromSeries();
  const del = useDeleteProjectSeries();
  const update = useUpdateProjectSeries();

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/series/${seriesId}`
      : `/series/${seriesId}`;

  const makePublic = async () => {
    if (!series || series.is_public) return;
    try {
      await update.mutateAsync({ id: series.id, patch: { is_public: true } });
      toast.success("ตั้งเป็นสาธารณะแล้ว — ลิงก์แชร์ดูได้โดยไม่ต้องล็อกอิน");
    } catch (e) {
      toast.error((e as Error).message || "ตั้งค่าสาธารณะไม่สำเร็จ");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((item) => item.project);
    if (statusFilter !== "all") {
      list = list.filter((item) => item.project?.status === statusFilter);
    }
    if (q) {
      list = list.filter((item) => {
        const p = item.project!;
        const hay = `${p.title} ${item.role_label ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return sortItems(list, sortMode);
  }, [items, query, sortMode, statusFilter]);

  if (isLoading || itemsLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border/60 bg-card/40">
        <InlineLoader />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 px-4 py-16 text-center">
        <p className="text-foreground font-medium">ไม่พบชุดผลงานนี้</p>
        <p className="mt-1 text-sm text-muted-foreground">อาจถูกลบแล้ว หรือลิงก์ไม่ถูกต้อง</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <FolderKanban className="h-3.5 w-3.5" /> ชุดผลงาน
              </span>
              {series.is_public ? (
                <span className="inline-flex items-center gap-1">
                  <Globe2 className="h-3 w-3" /> สาธารณะ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" /> ส่วนตัว
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-medium text-foreground leading-tight">
              {series.title}
            </h2>
            {(series.client_label || series.year) && (
              <p className="text-sm text-muted-foreground">
                {[series.client_label, series.year].filter(Boolean).join(" · ")}
              </p>
            )}
            {series.summary && (
              <p className="text-sm text-foreground/90 max-w-2xl leading-relaxed whitespace-pre-wrap">
                {series.summary}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {items.length} ชิ้นในชุด
              {items.length === 0 ? " — ยังว่าง กด「เพิ่มผลงาน」เมื่อพร้อม" : ""}
            </p>
            {!series.is_public ? (
              <p className="text-xs text-muted-foreground">
                ต้องการแชร์ให้คนอื่นดูได้?{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => void makePublic()}>
                  ตั้งเป็นสาธารณะ
                </button>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <SharePopover url={shareUrl} title={series.title} label="แชร์ชุดผลงาน">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  if (!series.is_public) {
                    toast.message("ชุดผลงานยังเป็นส่วนตัว", {
                      description: "คนอื่นเปิดลิงก์นี้ไม่ได้จนกว่าจะตั้งเป็นสาธารณะ",
                      action: {
                        label: "ตั้งสาธารณะ",
                        onClick: () => void makePublic(),
                      },
                    });
                  }
                }}
              >
                <Share2 className="w-4 h-4 mr-1" /> แชร์
              </Button>
            </SharePopover>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/portfolio/new?series=${series.id}`)}
              className="rounded-full"
            >
              <Plus className="w-4 h-4 mr-1" /> ลงผลงานใหม่
            </Button>
            <Button
              size="sm"
              onClick={() => onAddProjects?.(series)}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" /> เพิ่มผลงาน
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit?.(series)} className="rounded-full">
              <Pencil className="w-4 h-4 mr-1" /> แก้ไข
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-full text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ลบชุดผลงานนี้?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &quot;{series.title}&quot; จะถูกลบ — ผลงานต้นฉบับไม่ถูกลบ แค่เอาออกจากชุด
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await del.mutateAsync(series.id);
                      toast.success("ลบชุดผลงานแล้ว");
                      onDeleted?.();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    ลบ
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 px-4 py-14 text-center">
          <FolderKanban className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-foreground mb-1">ยังไม่มีผลงานในชุดนี้</p>
          <p className="text-sm text-muted-foreground mb-4">เพิ่มผลงานที่เผยแพร่แล้วเข้าชุดได้เลย</p>
          <Button
            onClick={() => onAddProjects?.(series)}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-1" /> เพิ่มผลงาน
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          ไม่พบผลงานตามตัวกรอง — ลองเปลี่ยนสถานะหรือคำค้นหา
        </div>
      ) : (
        <SeriesAnimatedGrid density={density} layoutGroupId="series-detail-layout">
          {filtered.map((item) => {
            const p = item.project!;
            const full = projectsById?.get(p.id);
            const thumb = p.cover_url || p.gallery_urls?.[0] || full?.cover_url || full?.gallery_urls?.[0];
            const isList = density === "list";
            const compact = density === "small";
            const stats = statsMap[p.id] ?? EMPTY_PROJECT_STATS;
            const canStats = p.status === "Published" && !!onShowStats;
            const views = full?.views ?? 0;
            const likes = full?.likes ?? 0;
            return (
              <div
                key={item.project_id}
                className={cn(
                  "group relative rounded-xl border border-border/60 bg-card overflow-hidden",
                  isList ? "flex items-center gap-3 p-2" : "flex flex-col",
                )}
              >
                <Link
                  to={`/project/${p.id}`}
                  className={cn(isList ? "flex min-w-0 flex-1 items-center gap-3" : "block")}
                >
                  <div
                    className={cn(
                      "relative overflow-hidden bg-muted",
                      isList ? "h-14 w-20 shrink-0 rounded-lg" : "aspect-[4/3] w-full",
                    )}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={p.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : null}
                    {!isList && p.status !== "Published" ? (
                      <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px]">
                        {p.status}
                      </span>
                    ) : null}
                  </div>
                  {isList ? (
                    <div className="min-w-0 flex-1 pr-8 space-y-1">
                      <h3 className="truncate text-sm font-medium text-foreground">
                        {item.role_label || p.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {p.status}
                        {views ? ` · ดู ${views.toLocaleString()}` : ""}
                      </p>
                      {canStats ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onShowStats?.(p.id);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          <BarChart3 className="h-3 w-3" />
                          ดูสถิติ
                          {stats.views7d > 0 ? (
                            <span className="text-primary">· 7 วัน {stats.views7d}</span>
                          ) : null}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
                {!isList ? (
                  <div className={cn("space-y-1.5 p-2", compact && "p-1.5 space-y-1")}>
                    <Link
                      to={`/project/${p.id}`}
                      className={cn(
                        "block font-medium text-foreground hover:underline line-clamp-1",
                        compact ? "text-[11px]" : "text-sm",
                      )}
                    >
                      {item.role_label || p.title}
                    </Link>
                    {item.role_label ? (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{p.title}</p>
                    ) : null}
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      ดู {views.toLocaleString()} · ถูกใจ {likes.toLocaleString()}
                    </p>
                    {canStats ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onShowStats?.(p.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full flex items-center justify-center gap-1 rounded-lg border border-dashed border-border/80 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                      >
                        <BarChart3 className="h-3 w-3" />
                        ดูสถิติผลงาน
                        {(stats.views7d > 0 || stats.hireCount > 0 || stats.collabCount > 0) && (
                          <span className="text-[10px] text-primary">
                            · 7 วัน {stats.views7d}
                            {stats.hireCount + stats.collabCount > 0
                              ? ` · โอกาส ${stats.hireCount + stats.collabCount}`
                              : ""}
                          </span>
                        )}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await remove.mutateAsync({ seriesId: series.id, projectId: p.id });
                    toast.success("เอาออกจากชุดแล้ว");
                  }}
                  aria-label="เอาออกจากชุด"
                  className={cn(
                    "absolute rounded-full border border-white/15 bg-background/70 p-1.5 shadow-sm backdrop-blur-md transition-opacity hover:bg-destructive hover:text-destructive-foreground md:opacity-0 md:group-hover:opacity-100",
                    isList ? "right-2 top-1/2 -translate-y-1/2" : "top-2 right-2",
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </SeriesAnimatedGrid>
      )}
    </div>
  );
}

