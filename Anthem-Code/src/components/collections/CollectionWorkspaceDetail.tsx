import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Layers3, Lock, Globe2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  useCollection,
  useCollectionItems,
  useDeleteCollection,
  useToggleCollectionItem,
  useUpdateCollection,
} from "@/hooks/useCollections";
import CollectionFormDialog from "@/components/collections/CollectionFormDialog";
import {
  CollectionBrowseToolbar,
  type CollectionItemsSortMode,
} from "@/components/collections/CollectionBrowseToolbar";
import SharePopover from "@/components/SharePopover";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { CollectionWorkItemsGrid } from "@/components/collections/CollectionWorkCard";
import { toast } from "sonner";
import {
  COLLECTION_ITEMS_GRID_STORAGE_KEY,
  readCollectionGridDensity,
  writeCollectionGridDensity,
  type CollectionGridDensity,
} from "@/lib/collectionGridDensity";

type CollectionProject = {
  id: string;
  title?: string | null;
  cover_url?: string | null;
  status?: string | null;
  likes?: number | null;
  views?: number | null;
  created_at?: string | null;
  owner_id?: string | null;
};

type Props = {
  collectionId: string;
  isOwner: boolean;
  onDeleted?: () => void;
};

export function CollectionWorkspaceDetail({ collectionId, isOwner, onDeleted }: Props) {
  const { data: collection, isLoading } = useCollection(collectionId);
  const { data: items = [], isLoading: itemsLoading } = useCollectionItems(collectionId);
  const remove = useToggleCollectionItem();
  const del = useDeleteCollection();
  const update = useUpdateCollection();
  const [editOpen, setEditOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<CollectionItemsSortMode>("newest");
  const [density, setDensity] = useState<CollectionGridDensity>(() =>
    readCollectionGridDensity(COLLECTION_ITEMS_GRID_STORAGE_KEY, "large"),
  );

  const projects = items as CollectionProject[];
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/collections/${collection?.id ?? collectionId}`
      : `/collections/${collection?.id ?? collectionId}`;

  useEffect(() => {
    writeCollectionGridDensity(COLLECTION_ITEMS_GRID_STORAGE_KEY, density);
  }, [density]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projects;
    if (q) list = list.filter((p) => (p.title ?? "").toLowerCase().includes(q));
    const next = [...list];
    const ts = (p: CollectionProject) => {
      const n = Date.parse(p.created_at ?? "");
      return Number.isNaN(n) ? 0 : n;
    };
    switch (sortMode) {
      case "oldest":
        return next.sort((a, b) => ts(a) - ts(b));
      case "likes":
        return next.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
      case "views":
        return next.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      case "newest":
      default:
        return next.sort((a, b) => ts(b) - ts(a));
    }
  }, [projects, query, sortMode]);

  const makePublic = async () => {
    if (!collection || collection.is_public) return;
    try {
      await update.mutateAsync({ id: collection.id, patch: { is_public: true } });
      toast.success("ตั้งเป็นสาธารณะแล้ว — ลิงก์แชร์ดูได้โดยไม่ต้องล็อกอิน");
    } catch (e) {
      toast.error((e as Error).message || "ตั้งค่าสาธารณะไม่สำเร็จ");
    }
  };

  if (isLoading || itemsLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border/60 bg-card/40">
        <InlineLoader />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 px-4 py-16 text-center">
        <p className="text-foreground font-medium">ไม่พบคอลเลกชันนี้</p>
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
                <Layers3 className="h-3.5 w-3.5" /> คอลเลกชัน
              </span>
              {collection.is_public ? (
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
              {collection.name}
            </h2>
            {collection.category && (
              <Badge className="bg-primary/15 text-primary border-0 hover:bg-primary/15 rounded-full">
                {collection.category}
              </Badge>
            )}
            {collection.description && (
              <p className="text-sm text-foreground/90 max-w-2xl leading-relaxed whitespace-pre-wrap">
                {collection.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {collection.item_count} ผลงานในนิทรรศการ
            </p>
            {isOwner && !collection.is_public ? (
              <p className="text-xs text-muted-foreground">
                ต้องการแชร์ให้คนอื่นดูได้?{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => void makePublic()}>
                  ตั้งเป็นสาธารณะ
                </button>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(isOwner || collection.is_public) && (
              <SharePopover url={shareUrl} title={collection.name} label="แชร์คอลเลกชัน">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    if (isOwner && !collection.is_public) {
                      toast.message("คอลเลกชันยังเป็นส่วนตัว", {
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
                      <AlertDialogTitle>ลบคอลเลกชันนี้?</AlertDialogTitle>
                      <AlertDialogDescription>
                        &quot;{collection.name}&quot; และผลงานที่อยู่ในนี้ทั้งหมดจะถูกเอาออกจากคอลเลกชัน (ผลงานต้นฉบับไม่ถูกลบ)
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          await del.mutateAsync(collection.id);
                          onDeleted?.();
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
      </header>

      {projects.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl">
          <Layers3 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">ยังไม่มีผลงานในคอลเลกชันนี้</p>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "เลื่อนดูฟีดแล้วกดไอคอน Layers เพื่อเก็บเข้านี่"
              : "เจ้าของยังไม่ได้เพิ่มผลงาน"}
          </p>
        </div>
      ) : (
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
              layoutGroupId="collection-workspace-items-layout"
              onRemove={
                isOwner
                  ? async (projectId) => {
                      await remove.mutateAsync({
                        collectionId: collection.id,
                        projectId,
                        remove: true,
                      });
                      toast.success("เอาออกจากคอลเลกชันแล้ว");
                    }
                  : undefined
              }
            />
          )}
        </>
      )}

      <CollectionFormDialog open={editOpen} onOpenChange={setEditOpen} initial={collection} />
    </div>
  );
}
