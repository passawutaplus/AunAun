import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, Layers3, Lock, Globe2, Share2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  useCollection, useCollectionItems, useDeleteCollection, useToggleCollectionItem, useUpdateCollection,
} from "@/hooks/useCollections";
import CollectionFormDialog from "@/components/collections/CollectionFormDialog";
import {
  CollectionBrowseToolbar,
  type CollectionItemsSortMode,
} from "@/components/collections/CollectionBrowseToolbar";
import SharePopover from "@/components/SharePopover";
import SeoHead from "@/components/SeoHead";
import PageLoader from "@/components/ui/PageLoader";
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

const CollectionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: collection, isLoading } = useCollection(id);
  const { data: items = [] } = useCollectionItems(id);
  const remove = useToggleCollectionItem();
  const del = useDeleteCollection();
  const update = useUpdateCollection();
  const [editOpen, setEditOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<CollectionItemsSortMode>("newest");
  const [density, setDensity] = useState<CollectionGridDensity>(() =>
    readCollectionGridDensity(COLLECTION_ITEMS_GRID_STORAGE_KEY, "large"),
  );

  const isOwner = !!user?.id && !!collection && user.id === collection.owner_id;
  const projects = items as CollectionProject[];
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/collections/${collection?.id ?? id}`
      : `/collections/${collection?.id ?? id}`;

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

  if (isLoading) {
    return <PageLoader />;
  }
  if (!collection) {
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center">
        <div className="text-center space-y-3">
          <Lock className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <p className="text-foreground font-medium">ไม่พบคอลเลกชันนี้</p>
          <p className="text-sm text-muted-foreground">อาจเป็นคอลเลกชันส่วนตัว หรือลิงก์ไม่ถูกต้อง</p>
          <Button onClick={() => navigate("/")}>กลับหน้าหลัก</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      <SeoHead
        title={collection.name}
        description={
          collection.description?.trim() ||
          `คอลเลกชัน ${collection.name} · ${collection.item_count} ผลงาน`
        }
        path={`/collections/${collection.id}`}
        noindex={!collection.is_public}
      />

      <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <BackButton
            onClick={() => navigate(isOwner ? "/collections" : "/", { replace: isOwner })}
          />
          <div className="flex items-center gap-2">
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
                        "{collection.name}" และผลงานที่อยู่ในนี้ทั้งหมดจะถูกเอาออกจากคอลเลกชัน (ผลงานต้นฉบับไม่ถูกลบ)
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          await del.mutateAsync(collection.id);
                          navigate("/collections");
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
            <Layers3 className="w-3.5 h-3.5" /> คอลเลกชัน
            {collection.is_public ? (
              <span className="inline-flex items-center gap-1"><Globe2 className="w-3 h-3" /> สาธารณะ</span>
            ) : (
              <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> ส่วนตัว</span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-medium text-foreground leading-tight">{collection.name}</h1>
          {collection.category && (
            <Badge className="bg-primary/15 text-primary border-0 hover:bg-primary/15 rounded-full">
              {collection.category}
            </Badge>
          )}
          {collection.description && (
            <p className="text-base text-foreground max-w-2xl leading-7 whitespace-pre-wrap">
              {collection.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{collection.item_count} ผลงานในนิทรรศการ</p>
          {isOwner && !collection.is_public ? (
            <p className="text-xs text-muted-foreground">
              ต้องการแชร์ให้คนอื่นดูได้?{" "}
              <button type="button" className="text-primary hover:underline" onClick={() => void makePublic()}>
                ตั้งเป็นสาธารณะ
              </button>
            </p>
          ) : null}
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
                layoutGroupId="collection-items-layout"
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
      </div>

      <CollectionFormDialog open={editOpen} onOpenChange={setEditOpen} initial={collection} />
    </div>
  );
};

export default CollectionDetailPage;
