import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Folder, FolderOpen, Images, Layers3, Lock, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  useCollectionItems,
  type CollectionWithCovers,
} from "@/hooks/useCollections";

/** Sidebar selection: all folders list | one collection */
export type CollectionSidebarSelection = "folders" | string;

type Props = {
  collections: CollectionWithCovers[];
  selection: CollectionSidebarSelection;
  onSelect: (selection: CollectionSidebarSelection) => void;
  className?: string;
};

function CollectionFolderRow({
  collection,
  active,
  expanded,
  onToggleExpand,
  onSelect,
}: {
  collection: CollectionWithCovers;
  active: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
}) {
  const { data: items = [], isFetching } = useCollectionItems(expanded ? collection.id : undefined);
  const count = collection.item_count ?? 0;

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "flex w-full items-center gap-0.5 rounded-lg pr-1 transition-colors",
          active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent/40",
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "หุบโฟลเดอร์" : "เปิดโฟลเดอร์"}
          aria-expanded={expanded}
        >
          <ChevronRight
            className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")}
          />
        </button>
        <button
          type="button"
          onClick={() => {
            onSelect();
            if (!expanded) onToggleExpand();
          }}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1.5 text-left text-sm"
        >
          {expanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 opacity-90" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 opacity-80" />
          )}
          <span className="min-w-0 flex-1 truncate">{collection.name}</span>
          {!collection.is_public && (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="ส่วนตัว" />
          )}
          <span className="tabular-nums text-[11px] text-muted-foreground shrink-0">{count}</span>
        </button>
      </div>

      {expanded && (
        <ul className="ml-3 border-l border-border/50 pl-3 space-y-0.5 py-0.5">
          {isFetching && items.length === 0 ? (
            <li className="px-2 py-1.5 text-[11px] text-muted-foreground">กำลังโหลด…</li>
          ) : items.length === 0 ? (
            <li className="px-2 py-1.5 text-[11px] text-muted-foreground">
              ยังว่าง — กด Layers บนผลงานในฟีดเพื่อเก็บ
            </li>
          ) : (
            items.map((p) => {
              const project = p as {
                id: string;
                title?: string | null;
                cover_url?: string | null;
              };
              return (
                <li key={project.id}>
                  <Link
                    to={`/project/${project.id}`}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors"
                    title={project.title ?? ""}
                  >
                    <span className="h-6 w-6 shrink-0 overflow-hidden rounded bg-muted">
                      {project.cover_url ? (
                        <img
                          src={project.cover_url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <Images className="h-3 w-3 text-muted-foreground" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{project.title}</span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

export function CollectionWorkspaceSidebar({
  collections,
  selection,
  onSelect,
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;

  const filteredCollections = useMemo(() => {
    if (!isSearching) return collections;
    return collections.filter((c) => {
      const hay = `${c.name} ${c.category ?? ""} ${c.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [collections, isSearching, q]);

  const totalItems = collections.reduce((sum, c) => sum + (c.item_count ?? 0), 0);
  const selectedId = selection !== "folders" ? selection : null;

  useEffect(() => {
    if (!selectedId) return;
    setExpandedIds((prev) => {
      if (prev.has(selectedId)) return prev;
      const next = new Set(prev);
      next.add(selectedId);
      return next;
    });
  }, [selectedId]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col border-r border-border/60 bg-transparent",
        className,
      )}
    >
      <div className="px-1 py-2 pr-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">คอลเลกชัน</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {collections.length} คอลเลกชัน · {totalItems} ผลงาน
          </p>
        </div>
      </div>

      <div className="pr-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาคอลเลกชันหรือผลงาน…"
            className="h-9 rounded-xl border-border/40 bg-transparent pl-8 text-sm"
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto pr-3 pb-3 space-y-0.5" aria-label="รายการคอลเลกชัน">
        {!isSearching && (
          <>
            <button
              type="button"
              onClick={() => onSelect("folders")}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                selection === "folders"
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-accent/40",
              )}
            >
              <Layers3 className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium">คอลเลกชันทั้งหมด</span>
              <span className="tabular-nums text-[11px] text-muted-foreground">
                {collections.length}
              </span>
            </button>
            <div className="my-2 border-t border-border/40" />
          </>
        )}

        {isSearching && filteredCollections.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            ไม่พบคอลเลกชันที่ตรงกับคำค้น
          </p>
        ) : filteredCollections.length === 0 && !isSearching ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">ยังไม่มีคอลเลกชัน</p>
        ) : (
          <>
            {isSearching && (
              <p className="px-2 pt-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                คอลเลกชัน ({filteredCollections.length})
              </p>
            )}
            {filteredCollections.map((c) => (
              <CollectionFolderRow
                key={c.id}
                collection={c}
                active={selection === c.id}
                expanded={expandedIds.has(c.id)}
                onToggleExpand={() => toggleExpand(c.id)}
                onSelect={() => onSelect(c.id)}
              />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
