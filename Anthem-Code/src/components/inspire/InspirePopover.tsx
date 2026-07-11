import { ReactNode, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Check, Library } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useInspireBoards,
  useInspireBoardIdsForImage,
  useCreateInspireBoard,
  useSaveToInspire,
  isDefaultInspireBoard,
} from "@/hooks/useInspire";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  imageUrl: string;
  children: ReactNode;
}

const InspirePopover = ({ open, onOpenChange, projectId, imageUrl, children }: Props) => {
  const { user } = useAuth();
  const { data: boards = [] } = useInspireBoards(user?.id);
  const { data: alreadyInBoardIds = [] } = useInspireBoardIdsForImage(
    user?.id,
    imageUrl,
    open && !!user?.id,
  );
  const createBoard = useCreateInspireBoard(user?.id);
  const save = useSaveToInspire(user?.id);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const alreadySet = new Set(alreadyInBoardIds);

  const libraryBoard = useMemo(
    () => boards.find((b) => isDefaultInspireBoard(b)) ?? null,
    [boards],
  );
  const customBoards = useMemo(
    () => boards.filter((b) => !isDefaultInspireBoard(b)),
    [boards],
  );
  const inLibrary = libraryBoard ? alreadySet.has(libraryBoard.id) : false;

  const handleSaveLibrary = async () => {
    try {
      const result = await save.mutateAsync({ projectId, imageUrl, boardIds: [] });
      if (result.library === "duplicate") {
        toast.info("ภาพนี้อยู่ในคลังรวมแล้ว");
      } else {
        toast.success("เก็บเข้าคลังรวมแล้ว");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleAddToBoard = async (boardId: string) => {
    if (alreadySet.has(boardId)) {
      toast.info("ภาพนี้อยู่ในบอร์ดนี้แล้ว");
      return;
    }
    try {
      const result = await save.mutateAsync({ projectId, imageUrl, boardIds: [boardId] });
      if (result.library === "added") {
        toast.success("เก็บเข้าคลังรวม + บอร์ดแล้ว");
      } else if (result.boards[boardId] === "duplicate") {
        toast.info("ภาพนี้อยู่ในบอร์ดนี้แล้ว");
      } else {
        toast.success("เพิ่มเข้าบอร์ดแล้ว (อยู่ในคลังรวมด้วย)");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const board = await createBoard.mutateAsync(name.trim());
      await handleAddToBoard(board.id);
      setName("");
      setCreating(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">เก็บลง My Inspire</p>
        </div>

        <button
          type="button"
          disabled={save.isPending}
          onClick={() => void handleSaveLibrary()}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm transition mb-2",
            inLibrary
              ? "bg-primary/10 text-primary"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            {inLibrary ? <Check className="w-4 h-4 shrink-0" /> : <Library className="w-4 h-4 shrink-0" />}
            {inLibrary ? "อยู่ในคลังรวมแล้ว" : "เก็บเข้าคลังรวม"}
          </span>
          <span className={cn("text-[10px]", inLibrary ? "opacity-80" : "opacity-80")}>
            หน้าแรก
          </span>
        </button>

        <p className="text-[11px] text-muted-foreground mb-1.5 px-0.5">
          หรือเพิ่มเข้าบอร์ดพร้อมกัน (เก็บในคลังรวมอัตโนมัติ)
        </p>

        <div className="max-h-52 overflow-y-auto space-y-1">
          {customBoards.length === 0 && !creating ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              ยังไม่มีบอร์ด — สร้างใหม่ด้านล่างได้
            </p>
          ) : null}
          {customBoards.map((b) => {
            const already = alreadySet.has(b.id);
            return (
              <button
                key={b.id}
                type="button"
                disabled={already || save.isPending}
                onClick={() => void handleAddToBoard(b.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition",
                  already
                    ? "bg-primary/10 text-primary cursor-default"
                    : "hover:bg-muted",
                )}
              >
                <span className="truncate flex items-center gap-1.5">
                  {already ? <Check className="w-3.5 h-3.5 shrink-0" /> : null}
                  {b.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {already ? "มีแล้ว" : b.item_count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-border">
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
                disabled={createBoard.isPending || save.isPending}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setCreating(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> สร้างบอร์ดใหม่
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InspirePopover;
