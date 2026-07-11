import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layers3, PanelsTopLeft, Plus } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import { useAuth } from "@/hooks/useAuth";
import { useCollections } from "@/hooks/useCollections";
import CollectionCard from "@/components/collections/CollectionCard";
import {
  CollectionBrowseToolbar,
  type CollectionListSortMode,
} from "@/components/collections/CollectionBrowseToolbar";
import {
  CollectionWorkspaceSidebar,
  type CollectionSidebarSelection,
} from "@/components/collections/CollectionWorkspaceSidebar";
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

function parseSelection(
  params: URLSearchParams,
  collectionIds: Set<string>,
): CollectionSidebarSelection {
  const c = params.get("c");
  if (c && collectionIds.has(c)) return c;
  return "folders";
}

function collectionTimestamp(c: { updated_at?: string | null; created_at?: string | null }): number {
  const n = Date.parse(c.updated_at ?? c.created_at ?? "");
  return Number.isNaN(n) ? 0 : n;
}

const CollectionsPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { data: collections = [], isLoading, isError, refetch } = useCollections(user?.id);
  const [formOpen, setFormOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<CollectionListSortMode>("newest");
  const [density, setDensity] = useState<CollectionGridDensity>(() =>
    readCollectionGridDensity(COLLECTION_LIST_GRID_STORAGE_KEY),
  );

  const collectionIds = useMemo(() => new Set(collections.map((c) => c.id)), [collections]);
  const selection = useMemo(
    () => parseSelection(params, collectionIds),
    [params, collectionIds],
  );

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/collections");
  }, [loading, user, navigate]);

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

  const select = (next: CollectionSidebarSelection) => {
    const p = new URLSearchParams(params);
    if (next === "folders") p.delete("c");
    else p.set("c", next);
    setParams(p, { replace: true });
    setMobileNavOpen(false);
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

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-8">
      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            <BackButton />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full lg:hidden"
                onClick={() => setMobileNavOpen(true)}
              >
                <PanelsTopLeft className="w-4 h-4 mr-1" /> คอลเลกชัน
              </Button>
              <Button
                size="sm"
                onClick={() => setFormOpen(true)}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-1" /> คอลเลกชันใหม่
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Layers3 className="w-6 h-6 text-primary shrink-0" />
            <h1 className="text-2xl font-medium text-foreground">คอลเลกชันของฉัน</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            เก็บผลงานที่ชอบเป็นนิทรรศการสไตล์คุณ — เลือกโฟลเดอร์ทางซ้ายเพื่อจัดการ
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-2">
        {isLoading ? (
          <InlineLoader />
        ) : isError ? (
          <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
            <p className="text-foreground font-medium">โหลดคอลเลกชันไม่สำเร็จ</p>
            <p className="text-sm text-muted-foreground">ลองใหม่อีกครั้ง หรือตรวจการเชื่อมต่อ</p>
            <Button variant="outline" className="rounded-full" onClick={() => refetch()}>
              ลองใหม่
            </Button>
          </div>
        ) : (
          <div className="flex gap-4 lg:gap-5 items-start">
            <CollectionWorkspaceSidebar
              collections={collections}
              selection={selection}
              onSelect={select}
              className="hidden lg:flex w-72 shrink-0 sticky top-4 h-[calc(100vh-5rem)] pr-1"
            />

            <main className="min-w-0 flex-1 space-y-4">
              <FeedModeTransition modeKey={selection}>
                {selection !== "folders" ? (
                  <CollectionWorkspaceDetail
                    collectionId={selection}
                    isOwner
                    onDeleted={() => select("folders")}
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
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">คอลเลกชันทั้งหมด</h2>
                      <p className="text-sm text-muted-foreground">
                        เลือกคอลเลกชันเพื่อดูรายละเอียด หรือปรับขนาดการ์ดได้
                      </p>
                    </div>
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
                        layoutGroupId="collections-workspace-list-layout"
                      >
                        {filtered.map((c) => (
                          <CollectionCard
                            key={c.id}
                            collection={c}
                            compact={density === "small"}
                            list={density === "list"}
                            onSelect={(item) => select(item.id)}
                          />
                        ))}
                      </AnimatedDensityGrid>
                    )}
                  </div>
                )}
              </FeedModeTransition>
            </main>
          </div>
        )}
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[min(100%,20rem)] p-0 border-border/60">
          <SheetHeader className="sr-only">
            <SheetTitle>รายการคอลเลกชัน</SheetTitle>
          </SheetHeader>
          <CollectionWorkspaceSidebar
            collections={collections}
            selection={selection}
            onSelect={select}
            className="h-full rounded-none border-0 border-r border-border/60"
          />
        </SheetContent>
      </Sheet>

      <CollectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(id) => select(id)}
      />
    </div>
  );
};

export default CollectionsPage;
