import { useEffect, useMemo, useState } from "react";
import { CheckSquare, GripVertical, ImageIcon, Layers3 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  CollectionBrowseToolbar,
  type CollectionItemsSortMode,
} from "@/components/collections/CollectionBrowseToolbar";
import CollectionItemsReorderGrid from "@/components/collections/CollectionItemsReorderGrid";
import CollectionTransferDialog from "@/components/collections/CollectionTransferDialog";
import { CollectionWorkItemsGrid } from "@/components/collections/CollectionWorkCard";
import { useAuth } from "@/hooks/useAuth";
import {
  useCollections,
  useRemoveCollectionItems,
  useReorderCollectionItems,
  useToggleCollectionItem,
  useTransferCollectionItems,
  useUpdateCollection,
} from "@/hooks/useCollections";
import { sortCollectionItems, type SortableCollectionItem } from "@/lib/collectionItemsSort";
import { cn } from "@/lib/utils";
import {
  COLLECTION_ITEMS_GRID_STORAGE_KEY,
  readCollectionGridDensity,
  writeCollectionGridDensity,
  type CollectionGridDensity,
} from "@/lib/collectionGridDensity";

export type CollectionSectionProject = SortableCollectionItem & {
  id: string;
  cover_url?: string | null;
  owner_id?: string | null;
};

type Props = {
  collectionId: string;
  /** The collection's chosen cover ("" = automatic). */
  coverUrl?: string | null;
  projects: CollectionSectionProject[];
  isOwner: boolean;
  layoutGroupId: string;
};

type Mode = "browse" | "select" | "reorder";

const errMessage = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** Toolbar + grid for the works inside a collection, with the owner tools (select, move, cover, reorder). */
export default function CollectionItemsSection({ collectionId, coverUrl, projects, isOwner, layoutGroupId }: Props) {
  const { user } = useAuth();
  const { data: myCollections = [] } = useCollections(isOwner ? user?.id : undefined);
  const removeOne = useToggleCollectionItem();
  const removeMany = useRemoveCollectionItems();
  const transfer = useTransferCollectionItems();
  const reorder = useReorderCollectionItems();
  const update = useUpdateCollection();

  const [mode, setMode] = useState<Mode>("browse");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<CollectionItemsSortMode>("manual");
  const [density, setDensity] = useState<CollectionGridDensity>(() =>
    readCollectionGridDensity(COLLECTION_ITEMS_GRID_STORAGE_KEY, "large"),
  );
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [transferMode, setTransferMode] = useState<"copy" | "move" | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    writeCollectionGridDensity(COLLECTION_ITEMS_GRID_STORAGE_KEY, density);
  }, [density]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? projects.filter((p) => (p.title ?? "").toLowerCase().includes(q)) : projects;
    return sortCollectionItems(list, sortMode);
  }, [projects, query, sortMode]);

  const selectedIds = useMemo(() => [...selected].filter((id) => projects.some((p) => p.id === id)), [selected, projects]);
  const transferTargets = useMemo(() => myCollections.filter((c) => c.id !== collectionId), [myCollections, collectionId]);

  const leaveSelect = () => {
    setMode("browse");
    setSelected(new Set());
  };
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const startReorder = () => {
    setQuery("");
    setSortMode("manual");
    setSelected(new Set());
    setMode("reorder");
  };

  const saveOrder = async (orderedIds: string[]) => {
    try {
      await reorder.mutateAsync({ collectionId, projectIds: orderedIds });
      toast.success("บันทึกลำดับแล้ว");
      setMode("browse");
    } catch (e) {
      toast.error(errMessage(e, "บันทึกลำดับไม่สำเร็จ"));
    }
  };

  const setCover = async (nextCover: string) => {
    try {
      await update.mutateAsync({ id: collectionId, patch: { cover_url: nextCover } });
      toast.success(nextCover ? "ตั้งเป็นปกคอลเลกชันแล้ว" : "ใช้ปกอัตโนมัติแล้ว");
      if (nextCover) leaveSelect();
    } catch (e) {
      toast.error(errMessage(e, "ตั้งปกไม่สำเร็จ"));
    }
  };

  const doTransfer = async (targetId: string) => {
    if (!transferMode) return;
    const target = transferTargets.find((c) => c.id === targetId);
    try {
      await transfer.mutateAsync({
        fromCollectionId: collectionId,
        toCollectionId: targetId,
        projectIds: selectedIds,
        mode: transferMode,
      });
      toast.success(`${transferMode === "move" ? "ย้าย" : "คัดลอก"}ไปที่ “${target?.name ?? "คอลเลกชัน"}” แล้ว`);
      setTransferMode(null);
      leaveSelect();
    } catch (e) {
      toast.error(errMessage(e, "ดำเนินการไม่สำเร็จ"));
    }
  };

  const doRemoveSelected = async () => {
    try {
      await removeMany.mutateAsync({ collectionId, projectIds: selectedIds });
      toast.success(`เอาออก ${selectedIds.length} ผลงานแล้ว`);
      leaveSelect();
    } catch (e) {
      toast.error(errMessage(e, "เอาออกไม่สำเร็จ"));
    } finally {
      setConfirmRemove(false);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 glass-panel rounded-2xl">
        <Layers3 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-foreground font-medium mb-1">ยังไม่มีผลงานในคอลเลกชันนี้</p>
        <p className="text-sm text-muted-foreground">
          {isOwner ? "เลื่อนดูฟีดแล้วกดไอคอน Layers เพื่อเก็บเข้านี่" : "เจ้าของยังไม่ได้เพิ่มผลงาน"}
        </p>
      </div>
    );
  }

  if (mode === "reorder") {
    return (
      <CollectionItemsReorderGrid
        projects={sortCollectionItems(projects, "manual")}
        saving={reorder.isPending}
        onSave={(ids) => void saveOrder(ids)}
        onCancel={() => setMode("browse")}
      />
    );
  }

  const selecting = mode === "select";
  const ownerActions = isOwner ? (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn(
          "h-9 w-9 shrink-0 rounded-full border-border/50 bg-transparent p-0",
          selecting && "border-primary bg-accent",
        )}
        aria-pressed={selecting}
        aria-label={selecting ? "เสร็จสิ้นการเลือก" : "เลือกผลงาน"}
        title={selecting ? "เสร็จสิ้นการเลือก" : "เลือกผลงาน"}
        onClick={() => (selecting ? leaveSelect() : setMode("select"))}
      >
        <CheckSquare className="h-4 w-4" aria-hidden />
      </Button>
      {projects.length > 1 && !selecting ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 rounded-full border-border/50 bg-transparent text-xs"
          onClick={startReorder}
        >
          <GripVertical className="mr-1 h-3.5 w-3.5" aria-hidden /> จัดลำดับ
        </Button>
      ) : null}
    </>
  ) : null;

  return (
    <>
      <CollectionBrowseToolbar
        mode="items"
        searchPlaceholder="ค้นหาชื่องาน..."
        query={query}
        onQueryChange={setQuery}
        density={density}
        onDensityChange={setDensity}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        resultCount={filtered.length}
        densityPreset="profile"
        actions={ownerActions}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 glass-panel rounded-2xl">
          <p className="text-foreground font-medium mb-1">ไม่พบผลงานที่ตรงเงื่อนไข</p>
          <p className="text-sm text-muted-foreground">ลองเปลี่ยนคำค้น</p>
        </div>
      ) : (
        <CollectionWorkItemsGrid
          projects={filtered}
          density={density}
          layoutGroupId={layoutGroupId}
          coverUrl={coverUrl}
          selectMode={selecting}
          selectedIds={selected}
          onToggleSelect={toggleSelect}
          onRemove={
            isOwner && !selecting
              ? async (projectId) => {
                  try {
                    await removeOne.mutateAsync({ collectionId, projectId, remove: true });
                    toast.success("เอาออกจากคอลเลกชันแล้ว");
                  } catch (e) {
                    toast.error(errMessage(e, "เอาออกไม่สำเร็จ"));
                  }
                }
              : undefined
          }
        />
      )}

      {selecting ? (
        <div className="sticky bottom-24 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/95 p-2 shadow-lg backdrop-blur lg:bottom-6">
          <span className="px-2 text-sm tabular-nums text-foreground">
            {selectedIds.length > 0 ? `เลือก ${selectedIds.length}` : "แตะผลงานเพื่อเลือก"}
          </span>
          {selectedIds.length === 1 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={update.isPending}
              onClick={() => {
                const work = projects.find((p) => p.id === selectedIds[0]);
                if (work?.cover_url) void setCover(work.cover_url);
                else toast.error("ผลงานนี้ยังไม่มีภาพปก");
              }}
            >
              <ImageIcon className="mr-1 h-3.5 w-3.5" aria-hidden /> ตั้งเป็นปก
            </Button>
          ) : null}
          {selectedIds.length === 0 && coverUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full"
              disabled={update.isPending}
              onClick={() => void setCover("")}
            >
              ใช้ปกอัตโนมัติ
            </Button>
          ) : null}
          {selectedIds.length > 0 ? (
            <>
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setTransferMode("move")}>
                ย้ายไป…
              </Button>
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setTransferMode("copy")}>
                คัดลอกไป…
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full text-destructive hover:text-destructive dark:text-red-400 dark:hover:text-red-300"
                onClick={() => setConfirmRemove(true)}
              >
                เอาออก
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      <CollectionTransferDialog
        open={transferMode !== null}
        onOpenChange={(open) => !open && setTransferMode(null)}
        mode={transferMode ?? "copy"}
        count={selectedIds.length}
        targets={transferTargets}
        busy={transfer.isPending}
        onConfirm={(id) => void doTransfer(id)}
      />

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>เอา {selectedIds.length} ผลงานออกจากคอลเลกชันนี้?</AlertDialogTitle>
            <AlertDialogDescription>ผลงานต้นฉบับไม่ถูกลบ และยังอยู่ในคอลเลกชันอื่นของคุณ (ถ้ามี)</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMany.isPending}
              onClick={(e) => {
                e.preventDefault();
                void doRemoveSelected();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              เอาออก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
