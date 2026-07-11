import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Pencil, Trash2, FolderKanban, Lock, Globe2, X, Plus, Share2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
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
import { useAuth } from "@/hooks/useAuth";
import {
  useDeleteProjectSeries,
  useProjectSeries,
  useProjectSeriesItems,
  useRemoveProjectFromSeries,
  useUpdateProjectSeries,
} from "@/hooks/useProjectSeries";
import { SeriesFormDialog } from "@/components/series/SeriesFormDialog";
import { SeriesAddProjectsDialog } from "@/components/series/SeriesAddProjectsDialog";
import {
  SeriesBrowseToolbar,
  type SeriesBrowseSortMode,
} from "@/components/series/SeriesBrowseToolbar";
import SharePopover from "@/components/SharePopover";
import SeoHead from "@/components/SeoHead";
import PageLoader from "@/components/ui/PageLoader";
import { AnimatedDensityGrid } from "@/components/ui/AnimatedDensityGrid";
import { cn } from "@/lib/utils";
import {
  SERIES_ITEMS_GRID_STORAGE_KEY,
  readSeriesDensity,
  seriesDensityGridClass,
  writeSeriesDensity,
  type SeriesWorksDensity,
} from "@/lib/seriesGridDensity";
import { toast } from "sonner";

const SeriesDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: series, isLoading } = useProjectSeries(id);
  const { data: items = [] } = useProjectSeriesItems(id);
  const remove = useRemoveProjectFromSeries();
  const del = useDeleteProjectSeries();
  const update = useUpdateProjectSeries();
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SeriesBrowseSortMode>("newest");
  const [density, setDensity] = useState<SeriesWorksDensity>(() =>
    typeof window === "undefined"
      ? "medium"
      : readSeriesDensity(SERIES_ITEMS_GRID_STORAGE_KEY),
  );

  useEffect(() => {
    writeSeriesDensity(SERIES_ITEMS_GRID_STORAGE_KEY, density);
  }, [density]);

  const isOwner = !!user?.id && !!series && user.id === series.owner_id;
  const visibleItems = isOwner
    ? items
    : items.filter((i) => i.project?.status === "Published");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = visibleItems;
    if (q) {
      list = list.filter((item) => {
        const p = item.project;
        if (!p) return false;
        const hay = `${p.title} ${item.role_label ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    const next = [...list];
    const ts = (item: (typeof next)[number]) => {
      const n = Date.parse(item.added_at ?? item.project?.created_at ?? "");
      return Number.isNaN(n) ? 0 : n;
    };
    switch (sortMode) {
      case "oldest":
        return next.sort((a, b) => ts(a) - ts(b));
      case "likes":
        return next.sort((a, b) => (b.project?.likes ?? 0) - (a.project?.likes ?? 0));
      case "views":
        return next.sort((a, b) => (b.project?.views ?? 0) - (a.project?.views ?? 0));
      case "newest":
      default:
        return next.sort((a, b) => ts(b) - ts(a));
    }
  }, [visibleItems, query, sortMode]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/series/${series?.id ?? id}`
      : `/series/${series?.id ?? id}`;

  const makePublic = async () => {
    if (!series || series.is_public) return;
    try {
      await update.mutateAsync({ id: series.id, patch: { is_public: true } });
      toast.success("ตั้งเป็นสาธารณะแล้ว — ลิงก์แชร์ดูได้โดยไม่ต้องล็อกอิน");
    } catch (e) {
      toast.error((e as Error).message || "ตั้งค่าสาธารณะไม่สำเร็จ");
    }
  };

  if (isLoading) return <PageLoader />;

  if (!series || (!series.is_public && !isOwner)) {
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center">
        <div className="text-center space-y-3">
          <Lock className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <p className="text-foreground font-medium">ไม่พบชุดผลงานนี้</p>
          <p className="text-sm text-muted-foreground">อาจเป็นชุดส่วนตัว หรือลิงก์ไม่ถูกต้อง</p>
          <Button onClick={() => navigate("/")}>กลับหน้าหลัก</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      <SeoHead
        title={series.title}
        description={
          series.summary?.trim() ||
          `ชุดผลงาน ${series.title} · ${visibleItems.length} ชิ้น`
        }
        path={`/series/${series.id}`}
        noindex={!series.is_public}
      />

      <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <BackButton
            onClick={() => navigate(isOwner ? "/series" : "/", { replace: isOwner })}
          />
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(isOwner || series.is_public) && (
              <SharePopover url={shareUrl} title={series.title} label="แชร์ชุดผลงาน">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    if (isOwner && !series.is_public) {
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
            )}
            {isOwner && (
              <>
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
                  onClick={() => setAddOpen(true)}
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-1" /> เพิ่มผลงาน
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="rounded-full">
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
                          navigate("/series");
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        ลบ
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FolderKanban className="w-3.5 h-3.5" /> ชุดผลงาน
            {series.is_public ? (
              <span className="inline-flex items-center gap-1">
                <Globe2 className="w-3 h-3" /> สาธารณะ
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> ส่วนตัว
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-medium text-foreground leading-tight">{series.title}</h1>
          {(series.client_label || series.year) && (
            <p className="text-sm text-muted-foreground">
              {[series.client_label, series.year].filter(Boolean).join(" · ")}
            </p>
          )}
          {series.summary && (
            <p className="text-base text-foreground max-w-2xl leading-7 whitespace-pre-wrap">{series.summary}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {visibleItems.length} ชิ้นในชุด
            {isOwner && (series.item_count ?? 0) === 0
              ? " — ยังว่าง กด「เพิ่มผลงาน」เมื่อพร้อม"
              : ""}
          </p>
          {isOwner && !series.is_public ? (
            <p className="text-xs text-muted-foreground">
              ต้องการแชร์ให้คนอื่นดูได้?{" "}
              <button type="button" className="text-primary hover:underline" onClick={() => void makePublic()}>
                ตั้งเป็นสาธารณะ
              </button>
            </p>
          ) : null}
        </header>

        {visibleItems.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <FolderKanban className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">ยังไม่มีผลงานในชุดนี้</p>
            <p className="text-sm text-muted-foreground mb-4">
              {isOwner ? "เพิ่มผลงานที่เผยแพร่แล้วเข้าชุดได้เลย" : "เจ้าของยังไม่ได้เพิ่มผลงาน"}
            </p>
            {isOwner && (
              <Button
                onClick={() => setAddOpen(true)}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-1" /> เพิ่มผลงาน
              </Button>
            )}
          </div>
        ) : (
          <>
            <SeriesBrowseToolbar
              searchPlaceholder="ค้นหาชื่องาน..."
              query={query}
              onQueryChange={setQuery}
              density={density}
              onDensityChange={setDensity}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              resultCount={filtered.length}
            />

            {filtered.length === 0 ? (
              <div className="text-center py-12 glass-panel rounded-2xl">
                <p className="text-foreground font-medium mb-1">ไม่พบผลงานที่ตรงเงื่อนไข</p>
                <p className="text-sm text-muted-foreground">ลองเปลี่ยนคำค้น</p>
              </div>
            ) : (
              <AnimatedDensityGrid
                density={density}
                gridClassName={seriesDensityGridClass(density)}
                layoutGroupId="series-detail-public-layout"
              >
                {filtered.map((item) => {
                  const p = item.project;
                  if (!p) return null;
                  const thumb = p.cover_url || p.gallery_urls?.[0];
                  const title = item.role_label || p.title;

                  if (density === "list") {
                    return (
                      <div
                        key={item.project_id}
                        className="group relative flex items-center gap-3 rounded-xl glass-panel px-3 py-2.5"
                      >
                        <Link to={`/project/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={p.title}
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm text-foreground line-clamp-1">{title}</h3>
                            {item.role_label ? (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.title}</p>
                            ) : isOwner && p.status !== "Published" ? (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{p.status}</p>
                            ) : null}
                          </div>
                        </Link>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              await remove.mutateAsync({ seriesId: series.id, projectId: p.id });
                              toast.success("เอาออกจากชุดแล้ว");
                            }}
                            aria-label="เอาออกจากชุด"
                            className="p-1.5 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={item.project_id} className="group relative">
                      <Link to={`/project/${p.id}`} className="block">
                        <div
                          className={cn(
                            "relative w-full overflow-hidden rounded-md bg-muted",
                            density === "large" ? "aspect-[16/10]" : "aspect-[4/3]",
                          )}
                        >
                          {thumb && (
                            <img
                              src={thumb}
                              alt={p.title}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                              loading="lazy"
                            />
                          )}
                          {isOwner && p.status !== "Published" && (
                            <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-background/80">
                              {p.status}
                            </span>
                          )}
                        </div>
                        <h3
                          className={cn(
                            "font-medium text-foreground line-clamp-1 mt-2 px-0.5",
                            density === "small" ? "text-xs" : "text-sm",
                          )}
                        >
                          {title}
                        </h3>
                        {item.role_label ? (
                          <p className="text-[11px] text-muted-foreground px-0.5 line-clamp-1">{p.title}</p>
                        ) : null}
                      </Link>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await remove.mutateAsync({ seriesId: series.id, projectId: p.id });
                            toast.success("เอาออกจากชุดแล้ว");
                          }}
                          aria-label="เอาออกจากชุด"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/70 backdrop-blur-md border border-white/15 shadow-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </AnimatedDensityGrid>
            )}
          </>
        )}
      </div>

      <SeriesFormDialog open={editOpen} onOpenChange={setEditOpen} initial={series} />
      <SeriesAddProjectsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        seriesId={series.id}
        seriesTitle={series.title}
      />
    </div>
  );
};

export default SeriesDetailPage;
