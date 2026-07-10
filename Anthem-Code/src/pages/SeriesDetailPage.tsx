import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Pencil, Trash2, FolderKanban, Lock, Globe2, X, Plus } from "lucide-react";
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
} from "@/hooks/useProjectSeries";
import { SeriesFormDialog } from "@/components/series/SeriesFormDialog";
import { SeriesAddProjectsDialog } from "@/components/series/SeriesAddProjectsDialog";
import PageLoader from "@/components/ui/PageLoader";
import { toast } from "sonner";

const SeriesDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: series, isLoading } = useProjectSeries(id);
  const { data: items = [] } = useProjectSeriesItems(id);
  const remove = useRemoveProjectFromSeries();
  const del = useDeleteProjectSeries();
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const isOwner = !!user?.id && !!series && user.id === series.owner_id;
  const visibleItems = isOwner
    ? items
    : items.filter((i) => i.project?.status === "Published");

  if (isLoading) return <PageLoader />;

  if (!series || (!series.is_public && !isOwner)) {
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">ไม่พบชุดผลงานนี้</p>
          <Button onClick={() => navigate("/")}>กลับหน้าหลัก</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton />
          {isOwner && (
            <div className="flex items-center gap-2">
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
            </div>
          )}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
            {visibleItems.map((item) => {
              const p = item.project;
              if (!p) return null;
              const thumb = p.cover_url || p.gallery_urls?.[0];
              return (
                <div key={item.project_id} className="group relative">
                  <Link to={`/project/${p.id}`} className="block">
                    <div className="relative w-full aspect-[4/3] overflow-hidden rounded-md bg-muted">
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
                    <h3 className="font-medium text-foreground text-sm line-clamp-1 mt-2 px-0.5">
                      {item.role_label || p.title}
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
          </div>
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
