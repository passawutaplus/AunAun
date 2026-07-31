import { useMemo, useState, type ReactNode } from "react";
import { Check, FolderInput, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isDefaultInspireBoard,
  useCreateInspireBoard,
  type InspireBoardWithCovers,
  type InspireRecentItem,
} from "@/hooks/useInspire";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  item: InspireRecentItem;
  boards: InspireBoardWithCovers[];
  onMoveToBoard: (boardId: string) => void | Promise<void>;
  pending?: boolean;
  /** Compact outline button (sheet header). */
  triggerClassName?: string;
  children?: ReactNode;
};

export function InspireMoveToBoardButton({
  item,
  boards,
  onMoveToBoard,
  pending,
  triggerClassName,
  children,
}: Props) {
  const { user } = useAuth();
  const createBoard = useCreateInspireBoard(user?.id);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const already = useMemo(
    () => new Set(item.board_ids?.length ? item.board_ids : [item.board_id]),
    [item.board_id, item.board_ids],
  );
  const customBoards = useMemo(
    () => boards.filter((b) => !isDefaultInspireBoard(b)),
    [boards],
  );

  const pick = async (boardId: string) => {
    if (already.has(boardId)) {
      toast.info("ภาพนี้อยู่ในบอร์ดนี้แล้ว");
      return;
    }
    await onMoveToBoard(boardId);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const board = await createBoard.mutateAsync(name.trim());
      await pick(board.id);
      setName("");
      setCreating(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setCreating(false);
          setName("");
        }
      }}
    >
      <PopoverTrigger asChild>
        {children ?? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "shrink-0 h-8 rounded-full px-3 text-xs",
              triggerClassName,
            )}
          >
            <FolderInput className="w-3.5 h-3.5 mr-1" />
            ย้ายเข้าBoard
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2 rounded-xl">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">เลือกบอร์ด</p>
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {customBoards.length === 0 && !creating ? (
            <p className="px-2 py-3 text-xs text-muted-foreground text-center">
              ยังไม่มีบอร์ด — สร้างใหม่ด้านล่างได้
            </p>
          ) : null}
          {customBoards.map((b) => {
            const has = already.has(b.id);
            return (
              <button
                key={b.id}
                type="button"
                disabled={has || pending}
                onClick={() => void pick(b.id)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                  has ? "bg-primary/10 text-primary cursor-default" : "hover:bg-muted",
                )}
              >
                <span className="truncate flex items-center gap-1.5">
                  {has ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                  {b.name}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {has ? "มีแล้ว" : b.item_count ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-border/60">
          {creating ? (
            <div className="flex gap-1">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อบอร์ด"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => void handleCreate()}
                disabled={createBoard.isPending || pending}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={() => setCreating(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> สร้างบอร์ดใหม่
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
