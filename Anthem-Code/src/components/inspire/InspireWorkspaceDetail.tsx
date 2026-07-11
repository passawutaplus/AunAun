import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, UserCircle2, Trash2, Pencil, Lock, LayoutGrid, LayoutList, Rows3, Pin } from "lucide-react";
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
  useInspireBoard,
  useInspireBoardItems,
  useRemoveFromInspireBoard,
  useDeleteInspireBoard,
  useToggleInspireItemPin,
  isDefaultInspireBoard,
  isInspireItemPinned,
} from "@/hooks/useInspire";
import InspireBoardFormDialog from "@/components/inspire/InspireBoardFormDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { IconSegmentPill, type SegmentOption } from "@/components/ui/IconSegmentPill";
import { AnimatedDensityGrid } from "@/components/ui/AnimatedDensityGrid";
import { InlineLoader } from "@/components/ui/BanterLoader";
import {
  INSPIRE_ITEMS_GRID_STORAGE_KEY,
  inspireThumbGridClass,
  readInspireGridDensity,
  writeInspireGridDensity,
  type InspireGridDensity,
} from "@/lib/inspireGridDensity";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DENSITY_OPTIONS: SegmentOption<InspireGridDensity>[] = [
  {
    value: "large",
    label: "ใหญ่",
    icon: (
      <span className="inline-grid grid-cols-2 gap-px" aria-hidden>
        <span className="h-2 w-2 rounded-[1px] bg-current" />
        <span className="h-2 w-2 rounded-[1px] bg-current" />
        <span className="h-2 w-2 rounded-[1px] bg-current" />
        <span className="h-2 w-2 rounded-[1px] bg-current" />
      </span>
    ),
  },
  {
    value: "medium",
    label: "กลาง",
    icon: <LayoutGrid className="h-3.5 w-3.5" />,
  },
  {
    value: "small",
    label: "เล็ก",
    icon: <Rows3 className="h-3.5 w-3.5" />,
  },
  {
    value: "list",
    label: "รายการ",
    icon: <LayoutList className="h-3.5 w-3.5" />,
  },
];

type Props = {
  boardId: string;
  focusItemId?: string | null;
  onDeleted?: () => void;
};

export function InspireWorkspaceDetail({ boardId, focusItemId, onDeleted }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: board, isLoading: boardLoading } = useInspireBoard(boardId);
  const { data: items = [], isLoading } = useInspireBoardItems(boardId);
  const remove = useRemoveFromInspireBoard(boardId);
  const del = useDeleteInspireBoard(user?.id);
  const togglePin = useToggleInspireItemPin(user?.id);
  const [selected, setSelected] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [density, setDensity] = useState<InspireGridDensity>(() =>
    typeof window === "undefined"
      ? "medium"
      : readInspireGridDensity(INSPIRE_ITEMS_GRID_STORAGE_KEY, "small"),
  );
  const isOwner = user?.id === board?.owner_id;
  const isLibraryBoard = isDefaultInspireBoard(board);

  useEffect(() => {
    writeInspireGridDensity(INSPIRE_ITEMS_GRID_STORAGE_KEY, density);
  }, [density]);

  useEffect(() => {
    if (focusItemId && items.some((i) => i.id === focusItemId)) {
      setSelected(focusItemId);
      return;
    }
    if (items.length > 0) {
      setSelected((prev) => (prev && items.some((i) => i.id === prev) ? prev : items[0].id));
    }
  }, [items, focusItemId]);

  const current = items.find((i) => i.id === selected);

  const handleTogglePin = async (itemId: string, currentlyPinned: boolean) => {
    if (!boardId) return;
    try {
      await togglePin.mutateAsync({
        itemId,
        boardId,
        pinned: !currentlyPinned,
      });
      toast.success(currentlyPinned ? "เลิกปักหมุดแล้ว" : "ปักหมุดแล้ว");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const { data: sourceProject } = useQuery({
    queryKey: ["inspire-source", current?.project_id],
    enabled: !!current?.project_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, category, owner_id, description, tags")
        .eq("id", current!.project_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: owner } = useQuery({
    queryKey: ["profile", sourceProject?.owner_id],
    enabled: !!sourceProject?.owner_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .eq("user_id", sourceProject!.owner_id)
        .maybeSingle();
      return data;
    },
  });

  if (boardLoading || isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border/60 bg-card/40">
        <InlineLoader />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 px-4 py-16 text-center">
        <p className="text-foreground font-medium">ไม่พบบอร์ดนี้</p>
        <p className="mt-1 text-sm text-muted-foreground">อาจถูกลบแล้ว หรือลิงก์ไม่ถูกต้อง</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl md:text-2xl font-medium text-foreground leading-tight">
            {board.name}
          </h2>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Lock className="w-3 h-3" /> ส่วนตัว · {board.item_count ?? items.length} ภาพ
          </p>
        </div>
        {isOwner && !isLibraryBoard ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditOpen(true)}>
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
                  <AlertDialogTitle>ลบบอร์ดนี้?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &quot;{board.name}&quot; และภาพในบอร์ดจะถูกลบออกจาก Inspire (ผลงานต้นฉบับไม่ถูกลบ)
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      try {
                        await del.mutateAsync(board.id);
                        toast.success("ลบบอร์ดแล้ว");
                        onDeleted?.();
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    ลบ
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </header>

      {items.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
          <p className="text-foreground font-medium">ยังไม่มีภาพในบอร์ดนี้</p>
          <p className="text-sm text-muted-foreground">
            ลากภาพจากคลังรวมมาวางที่บอร์ดนี้ หรือกด Inspire บนภาพแล้วเลือกบอร์ด
          </p>
          <Button variant="outline" className="rounded-full" onClick={() => navigate("/")}>
            ไปดูฟีดผลงาน
          </Button>
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-[1fr_280px] gap-5">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
              {current && (
                <>
                  <img src={current.image_url} alt="" className="w-full object-contain max-h-[65vh]" />
                  {isOwner ? (
                    <button
                      type="button"
                      title={isInspireItemPinned(current) ? "เลิกปักหมุด" : "ปักหมุดไว้บนสุด"}
                      aria-label={isInspireItemPinned(current) ? "เลิกปักหมุด" : "ปักหมุดไว้บนสุด"}
                      onClick={() => void handleTogglePin(current.id, isInspireItemPinned(current))}
                      className={cn(
                        "absolute right-3 top-3 z-10 rounded-full p-2 shadow-sm transition",
                        isInspireItemPinned(current)
                          ? "bg-primary text-primary-foreground"
                          : "bg-background/90 text-foreground hover:bg-background",
                      )}
                    >
                      <Pin className={cn("h-4 w-4", isInspireItemPinned(current) && "fill-current")} />
                    </button>
                  ) : null}
                </>
              )}
            </div>
            <aside className="space-y-4">
              {sourceProject ? (
                <>
                  <div>
                    <p className="text-xs text-primary uppercase tracking-wide mb-1">{sourceProject.category}</p>
                    <h3 className="text-base font-semibold">{sourceProject.title}</h3>
                    {sourceProject.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-4">{sourceProject.description}</p>
                    )}
                  </div>
                  {owner && (
                    <Link
                      to={`/u/${owner.user_id}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 transition"
                    >
                      {owner.avatar_url ? (
                        <img src={owner.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted grid place-items-center">
                          <UserCircle2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{owner.display_name}</p>
                        <p className="text-xs text-muted-foreground">ดูโปรไฟล์เจ้าของ</p>
                      </div>
                    </Link>
                  )}
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/project/${sourceProject.id}`}>
                      <ExternalLink className="w-4 h-4 mr-1" /> ดูผลงานทั้งหมด
                    </Link>
                  </Button>
                  {isOwner && current && (
                    <Button
                      variant="ghost"
                      className="w-full text-destructive"
                      onClick={() => {
                        remove.mutate(current.id, {
                          onSuccess: () => {
                            toast.success("ลบจากบอร์ดแล้ว");
                            setSelected(null);
                          },
                        });
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> ลบออกจากบอร์ด
                    </Button>
                  )}
                </>
              ) : (
                <Skeleton className="w-full h-32 rounded-xl" />
              )}
            </aside>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground tabular-nums">{items.length} ภาพในบอร์ด</p>
            <IconSegmentPill
              value={density}
              options={DENSITY_OPTIONS}
              onChange={setDensity}
              layoutGroupId="inspire-workspace-items-density"
              variant="ghost"
              className="justify-between sm:w-[9.5rem]"
            />
          </div>

          <AnimatedDensityGrid
            density={density}
            gridClassName={inspireThumbGridClass(density)}
            layoutGroupId="inspire-workspace-items-layout"
          >
            {items.map((it) => {
              const pinned = isInspireItemPinned(it);
              return density === "list" ? (
                <div
                  key={it.id}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl glass-panel px-3 py-2.5 text-left border-2 transition",
                    selected === it.id ? "border-primary" : "border-transparent opacity-80 hover:opacity-100",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(it.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                      <img src={it.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    </div>
                    <span className="text-xs text-muted-foreground truncate">
                      {pinned ? "ปักหมุด · " : ""}เลือกดูภาพนี้
                    </span>
                  </button>
                  {isOwner ? (
                    <button
                      type="button"
                      title={pinned ? "เลิกปักหมุด" : "ปักหมุด"}
                      onClick={() => void handleTogglePin(it.id, pinned)}
                      className={cn(
                        "rounded-full p-1.5 shrink-0",
                        pinned ? "text-primary" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Pin className={cn("h-3.5 w-3.5", pinned && "fill-current")} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <div key={it.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => setSelected(it.id)}
                    className={cn(
                      "relative rounded-lg overflow-hidden border-2 aspect-square transition w-full",
                      selected === it.id ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                      pinned && "ring-2 ring-primary/40",
                    )}
                  >
                    <img src={it.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                  {isOwner ? (
                    <button
                      type="button"
                      title={pinned ? "เลิกปักหมุด" : "ปักหมุด"}
                      onClick={() => void handleTogglePin(it.id, pinned)}
                      className={cn(
                        "absolute right-1.5 top-1.5 z-10 rounded-full p-1.5 shadow-sm transition",
                        pinned
                          ? "bg-primary text-primary-foreground"
                          : "bg-background/90 text-foreground opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <Pin className={cn("h-3 w-3", pinned && "fill-current")} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </AnimatedDensityGrid>
        </>
      )}

      <InspireBoardFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={{ id: board.id, name: board.name }}
      />
    </div>
  );
}
