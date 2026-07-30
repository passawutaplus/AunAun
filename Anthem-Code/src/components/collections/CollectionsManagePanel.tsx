import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Layers3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import { useCollections } from "@/hooks/useCollections";
import CollectionCard from "@/components/collections/CollectionCard";
import {
  CollectionBrowseToolbar,
  type CollectionListSortMode,
} from "@/components/collections/CollectionBrowseToolbar";
import { CollectionWorkspaceDetail } from "@/components/collections/CollectionWorkspaceDetail";
import { InlineLoader } from "@/components/ui/BanterLoader";
import CollectionFormDialog from "@/components/collections/CollectionFormDialog";
import { AnimatedDensityGrid } from "@/components/ui/AnimatedDensityGrid";
import {
  COLLECTION_LIST_GRID_STORAGE_KEY,
  collectionGridClass,
  readCollectionGridDensity,
  writeCollectionGridDensity,
  type CollectionGridDensity,
} from "@/lib/collectionGridDensity";

function collectionTimestamp(c: { updated_at?: string | null; created_at?: string | null }): number {
  const n = Date.parse(c.updated_at ?? c.created_at ?? "");
  return Number.isNaN(n) ? 0 : n;
}

type Props = {
  userId: string;
  /** When true (profile tab), keep tab=collections in the URL when opening a collection. */
  embedded?: boolean;
};

/** Full collections manage UI without the left folder list sidebar. */
export default function CollectionsManagePanel({ userId, embedded }: Props) {
  const [params, setParams] = useSearchParams();
  const { data: collections = [], isLoading, isError, refetch } = useCollections(userId);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<CollectionListSortMode>("newest");
  const [density, setDensity] = useState<CollectionGridDensity>(() =>
    readCollectionGridDensity(COLLECTION_LIST_GRID_STORAGE_KEY),
  );

  const collectionIds = useMemo(() => new Set(collections.map((c) => c.id)), [collections]);
  const selection = useMemo(() => {
    const c = params.get("c");
    if (c && collectionIds.has(c)) return c;
    return "folders" as const;
  }, [params, collectionIds]);

  useEffect(() => {
    writeCollectionGridDensity(COLLECTION_LIST_GRID_STORAGE_KEY, density);
  }, [density]);

  useEffect(() => {
    if (isLoading) return;
    const c = params.get("c");
    if (!c) return;
    if (!collectionIds.has(c)) {
      const next = new URLSearchParams(params);
      next.delete("c");
      setParams(next, { replace: true });
    }
  }, [isLoading, params, collectionIds, setParams]);

  const withEmbedTab = (p: URLSearchParams) => {
    if (embedded) p.set("tab", "collections");
    return p;
  };

  const selectFolders = () => {
    const p = withEmbedTab(new URLSearchParams(params));
    p.delete("c");
    setParams(p, { replace: true });
  };

  const selectCollection = (id: string) => {
    const p = withEmbedTab(new URLSearchParams(params));
    p.set("c", id);
    setParams(p, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = collections;
    if (q) {
      list = list.filter((c) => {
        const hay = `${c.name} ${c.category ?? ""} ${c.description ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    const next = [...list];
    switch (sortMode) {
      case "oldest":
        return next.sort((a, b) => collectionTimestamp(a) - collectionTimestamp(b));
      case "items":
        return next.sort((a, b) => (b.item_count ?? 0) - (a.item_count ?? 0));
      case "newest":
      default:
        return next.sort((a, b) => collectionTimestamp(b) - collectionTimestamp(a));
    }
  }, [collections, query, sortMode]);

  if (isLoading) return <InlineLoader />;

  if (isError) {
    return (
      <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
        <p className="text-foreground font-medium">โหลดคอลเลกชันไม่สำเร็จ</p>
        <p className="text-sm text-muted-foreground">ลองใหม่อีกครั้ง หรือตรวจการเชื่อมต่อ</p>
        <Button variant="outline" className="rounded-full" onClick={() => refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {selection !== "folders" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full -ml-2 text-muted-foreground"
            onClick={selectFolders}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> คอลเลกชันทั้งหมด
          </Button>
        ) : (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Layers3 className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-lg font-semibold text-foreground">คอลเลกชันทั้งหมด</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              เลือกคอลเลกชันเพื่อดูรายละเอียด หรือปรับขนาดการ์ดได้
            </p>
          </div>
        )}
        <Button
          size="sm"
          onClick={() => setFormOpen(true)}
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" /> คอลเลกชันใหม่
        </Button>
      </div>

      <FeedModeTransition modeKey={selection}>
        {selection !== "folders" ? (
          <CollectionWorkspaceDetail
            collectionId={selection}
            isOwner
            onDeleted={selectFolders}
          />
        ) : collections.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <Layers3 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">ยังไม่มีคอลเลกชัน</p>
            <p className="text-sm text-muted-foreground mb-4">
              สร้างคอลเลกชันแรก แล้วเริ่มเก็บผลงานที่คุณรัก
            </p>
            <Button
              onClick={() => setFormOpen(true)}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" /> สร้างคอลเลกชัน
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <CollectionBrowseToolbar
              mode="collections"
              searchPlaceholder="ค้นหาชื่อคอลเลกชัน..."
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
                <p className="text-foreground font-medium mb-1">ไม่พบคอลเลกชันที่ตรงเงื่อนไข</p>
                <p className="text-sm text-muted-foreground">ลองเปลี่ยนคำค้น</p>
              </div>
            ) : (
              <AnimatedDensityGrid
                density={density}
                gridClassName={collectionGridClass(density)}
                layoutGroupId="collections-profile-list-layout"
              >
                {filtered.map((c) => (
                  <CollectionCard
                    key={c.id}
                    collection={c}
                    compact={density === "small"}
                    list={density === "list"}
                    onSelect={(item) => selectCollection(item.id)}
                  />
                ))}
              </AnimatedDensityGrid>
            )}
          </div>
        )}
      </FeedModeTransition>

      <CollectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(id) => selectCollection(id)}
      />
    </div>
  );
}
