import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import SearchBar from "@/components/SearchBar";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { AnimatedDensityGrid } from "@/components/ui/AnimatedDensityGrid";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import { InspireLibraryCard } from "@/components/inspire/InspireLibraryCard";
import { InspireItemDetailSheet } from "@/components/inspire/InspireItemDetailSheet";
import { InspireViewDensityMenu } from "@/components/inspire/InspireViewDensityMenu";
import {
  compareInspireItemsByPinThenDate,
  isDefaultInspireBoard,
  isInspireItemPinned,
  useToggleInspireItemPin,
  type InspireBoardWithCovers,
  type InspireRecentItem,
} from "@/hooks/useInspire";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { readInspireItemDrag } from "@/lib/inspireDnD";
import {
  INSPIRE_LIBRARY_GRID_STORAGE_KEY,
  inspireLibraryGridClass,
  readInspireGridDensity,
  writeInspireGridDensity,
  type InspireGridDensity,
} from "@/lib/inspireGridDensity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortMode = "newest" | "oldest";

type Props = {
  boards: InspireBoardWithCovers[];
  items: InspireRecentItem[];
  loading?: boolean;
  onOpenBoard: (boardId: string) => void;
  onDropToBoard?: (boardId: string, payload: { imageUrl: string; projectId: string }) => void;
};

function BoardDropChip({
  board,
  active,
  onSelect,
  onOpen,
  onDropItem,
}: {
  board: InspireBoardWithCovers;
  active: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDropItem?: (payload: { imageUrl: string; projectId: string }) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const covers = board.covers ?? [];

  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={onOpen}
      onDragOver={(e) => {
        if (!onDropItem) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!onDropItem) return;
        e.preventDefault();
        setDragOver(false);
        const payload = readInspireItemDrag(e.dataTransfer);
        if (payload) onDropItem(payload);
      }}
      className={cn(
        "group shrink-0 w-[5.5rem] text-left transition",
        active && "opacity-100",
      )}
      title={`${board.name} · ลากภาพมาวางเพื่อเพิ่ม · ดับเบิลคลิกเพื่อเปิดบอร์ด`}
    >
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-xl border bg-muted transition",
          active
            ? "border-primary ring-2 ring-primary/40"
            : "border-border/60 group-hover:border-primary/40",
          dragOver && "ring-2 ring-primary border-primary scale-[1.03]",
        )}
      >
        {covers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/25 via-muted to-background">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
        ) : covers.length === 1 ? (
          <img src={covers[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-border/40">
            {covers.slice(0, 4).map((url, i) => (
              <img key={`${board.id}-f-${i}`} src={url} alt="" className="h-full w-full object-cover" />
            ))}
          </div>
        )}
        {dragOver ? (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/40 text-[10px] font-semibold text-primary-foreground">
            วางที่นี่
          </div>
        ) : null}
      </div>
      <p className="mt-1.5 truncate text-[11px] font-medium text-foreground">{board.name}</p>
      <p className="text-[10px] text-muted-foreground tabular-nums">{board.item_count ?? 0} ภาพ</p>
    </button>
  );
}

export function InspireLibraryHome({
  boards,
  items,
  loading,
  onOpenBoard,
  onDropToBoard,
}: Props) {
  const { user } = useAuth();
  const togglePin = useToggleInspireItemPin(user?.id);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [selected, setSelected] = useState<InspireRecentItem | null>(null);
  const [density, setDensity] = useState<InspireGridDensity>(() =>
    typeof window === "undefined"
      ? "medium"
      : readInspireGridDensity(INSPIRE_LIBRARY_GRID_STORAGE_KEY, "medium"),
  );

  const customBoards = useMemo(
    () => boards.filter((b) => !isDefaultInspireBoard(b)),
    [boards],
  );

  useEffect(() => {
    writeInspireGridDensity(INSPIRE_LIBRARY_GRID_STORAGE_KEY, density);
  }, [density]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (boardFilter !== "all") {
      list = list.filter(
        (i) => i.board_id === boardFilter || (i.board_ids ?? []).includes(boardFilter),
      );
    }
    if (q) {
      list = list.filter((i) => {
        const hay = `${i.board_name ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return [...list].sort((a, b) => compareInspireItemsByPinThenDate(a, b, sortMode));
  }, [items, sortMode, boardFilter, query]);

  const handleTogglePin = async (item: InspireRecentItem) => {
    const next = !isInspireItemPinned(item);
    try {
      await togglePin.mutateAsync({
        itemId: item.id,
        boardId: item.board_id,
        pinned: next,
      });
      setSelected((prev) =>
        prev?.id === item.id
          ? { ...prev, pinned_at: next ? new Date().toISOString() : null }
          : prev,
      );
      toast.success(next ? "ปักหมุดแล้ว" : "เลิกปักหมุดแล้ว");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="space-y-5">
      {customBoards.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {customBoards.map((board) => (
            <BoardDropChip
              key={board.id}
              board={board}
              active={boardFilter === board.id}
              onSelect={() => {
                setBoardFilter((prev) => (prev === board.id ? "all" : board.id));
              }}
              onOpen={() => onOpenBoard(board.id)}
              onDropItem={
                onDropToBoard
                  ? (payload) => onDropToBoard(board.id, payload)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          สร้างบอร์ดแล้วลากภาพจากคลังไปวางได้ — หรือเพิ่มตอนกด Inspire
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          <SearchBar
            compact
            placeholder="ค้นหาชื่อบอร์ดหรือภาพ..."
            value={query}
            onChange={setQuery}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <InspireViewDensityMenu value={density} onChange={setDensity} />
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger
              aria-label="เรียงตาม"
              className="h-9 w-full sm:w-[10.5rem] shrink-0 rounded-full border-border/50 bg-transparent text-xs"
            >
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 shrink-0 opacity-70" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="newest">ใหม่สุด</SelectItem>
              <SelectItem value="oldest">เก่าสุด</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <InlineLoader />
      ) : (
        <FeedModeTransition modeKey={`${boardFilter}:${sortMode}`}>
          {filtered.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-2xl space-y-2">
              <Sparkles className="mx-auto h-10 w-10 text-primary/50" />
              <p className="text-foreground font-medium">
                {items.length === 0 ? "ยังไม่มีภาพในคลังรวม" : "ไม่พบภาพที่ตรงคำค้น"}
              </p>
              <p className="text-sm text-muted-foreground">
                {items.length === 0
                  ? "กด Inspire บนภาพในผลงาน — จะเก็บเข้าหน้านี้โดยอัตโนมัติ"
                  : "ลองเปลี่ยนคำค้นหรือเลือกบอร์ดอื่น"}
              </p>
            </div>
          ) : (
            <AnimatedDensityGrid
              density={density}
              gridClassName={inspireLibraryGridClass(density)}
              layoutGroupId="inspire-library-density"
            >
              {filtered.map((item) => (
                <InspireLibraryCard
                  key={item.id}
                  item={item}
                  draggable
                  variant={density === "list" ? "list" : "grid"}
                  selected={selected?.id === item.id}
                  onOpen={() => setSelected(item)}
                  onTogglePin={(it) => {
                    void handleTogglePin(it);
                  }}
                />
              ))}
            </AnimatedDensityGrid>
          )}
        </FeedModeTransition>
      )}

      <InspireItemDetailSheet
        item={selected}
        open={!!selected}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
        onTogglePin={
          selected
            ? () => {
                void handleTogglePin(selected);
              }
            : undefined
        }
      />
    </div>
  );
}
