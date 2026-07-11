import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Folder, FolderOpen, Images, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  useInspireBoardItems,
  type InspireBoardWithCovers,
  type InspireRecentItem,
} from "@/hooks/useInspire";

/** Sidebar selection: all boards | recent images | one board */
export type InspireSidebarSelection = "folders" | "recent" | string;

type Props = {
  boards: InspireBoardWithCovers[];
  recent?: InspireRecentItem[];
  selection: InspireSidebarSelection;
  onSelect: (selection: InspireSidebarSelection) => void;
  /** When picking a thumb inside an expanded board, focus that item */
  onFocusItem?: (boardId: string, itemId: string) => void;
  className?: string;
};

function InspireFolderRow({
  board,
  active,
  expanded,
  onToggleExpand,
  onSelect,
  onFocusItem,
}: {
  board: InspireBoardWithCovers;
  active: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onFocusItem?: (boardId: string, itemId: string) => void;
}) {
  const { data: items = [], isFetching } = useInspireBoardItems(expanded ? board.id : undefined);
  const count = board.item_count ?? 0;

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
          <span className="min-w-0 flex-1 truncate">{board.name}</span>
          <span className="tabular-nums text-[11px] text-muted-foreground shrink-0">{count}</span>
        </button>
      </div>

      {expanded && (
        <ul className="ml-3 border-l border-border/50 pl-3 space-y-0.5 py-0.5">
          {isFetching && items.length === 0 ? (
            <li className="px-2 py-1.5 text-[11px] text-muted-foreground">กำลังโหลด…</li>
          ) : items.length === 0 ? (
            <li className="px-2 py-1.5 text-[11px] text-muted-foreground">
              ยังว่าง — กด Inspire บนภาพในผลงาน
            </li>
          ) : (
            items.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect();
                    onFocusItem?.(board.id, it.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors text-left"
                >
                  <span className="h-6 w-6 shrink-0 overflow-hidden rounded bg-muted">
                    <img
                      src={it.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate">ภาพอ้างอิง</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function InspireWorkspaceSidebar({
  boards,
  recent = [],
  selection,
  onSelect,
  onFocusItem,
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;

  const filteredBoards = useMemo(() => {
    if (!isSearching) return boards;
    return boards.filter((b) => b.name.toLowerCase().includes(q));
  }, [boards, isSearching, q]);

  const filteredRecent = useMemo(() => {
    if (!isSearching) return [];
    return recent.filter((item) => {
      const hay = `${item.board_name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [recent, isSearching, q]);

  const totalImages = boards.reduce((sum, b) => sum + (b.item_count ?? 0), 0);
  const selectedBoardId =
    selection !== "folders" && selection !== "recent" ? selection : null;

  useEffect(() => {
    if (!selectedBoardId) return;
    setExpandedIds((prev) => {
      if (prev.has(selectedBoardId)) return prev;
      const next = new Set(prev);
      next.add(selectedBoardId);
      return next;
    });
  }, [selectedBoardId]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const noSearchResults =
    isSearching && filteredBoards.length === 0 && filteredRecent.length === 0;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col border-r border-border/60 bg-transparent",
        className,
      )}
    >
      <div className="px-1 py-2 pr-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">My Inspire</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {boards.length} บอร์ด · {totalImages} ภาพ
          </p>
        </div>
      </div>

      <div className="pr-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาบอร์ดหรือภาพ…"
            className="h-9 rounded-xl border-border/40 bg-transparent pl-8 text-sm"
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto pr-3 pb-3 space-y-0.5" aria-label="รายการบอร์ด Inspire">
        {!isSearching && (
          <>
            <button
              type="button"
              onClick={() => onSelect("recent")}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                selection === "recent"
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-accent/40",
              )}
            >
              <Images className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium">ภาพทั้งหมด</span>
              <span className="tabular-nums text-[11px] text-muted-foreground">{recent.length}</span>
            </button>

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
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium">บอร์ดทั้งหมด</span>
              <span className="tabular-nums text-[11px] text-muted-foreground">{boards.length}</span>
            </button>

            <div className="my-2 border-t border-border/40" />
          </>
        )}

        {noSearchResults ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            ไม่พบบอร์ดหรือภาพที่ตรงกับคำค้น
          </p>
        ) : (
          <>
            {isSearching && filteredBoards.length > 0 && (
              <p className="px-2 pt-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                บอร์ด ({filteredBoards.length})
              </p>
            )}
            {filteredBoards.length === 0 && !isSearching ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">ยังไม่มีบอร์ด</p>
            ) : (
              filteredBoards.map((b) => (
                <InspireFolderRow
                  key={b.id}
                  board={b}
                  active={selection === b.id}
                  expanded={expandedIds.has(b.id)}
                  onToggleExpand={() => toggleExpand(b.id)}
                  onSelect={() => onSelect(b.id)}
                  onFocusItem={onFocusItem}
                />
              ))
            )}

            {isSearching && filteredRecent.length > 0 && (
              <>
                <p className="px-2 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  ภาพ ({filteredRecent.length})
                </p>
                <ul className="space-y-0.5">
                  {filteredRecent.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(item.board_id);
                          onFocusItem?.(item.board_id, item.id);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-accent/40 transition-colors text-left"
                      >
                        <span className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-muted">
                          <img
                            src={item.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.board_name ?? "บอร์ด"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </nav>
    </aside>
  );
}
