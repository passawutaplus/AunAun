import { ReactNode, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useInspireBoards, useCreateInspireBoard, useAddToInspireBoard } from "@/hooks/useInspire";
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
  const createBoard = useCreateInspireBoard(user?.id);
  const addItem = useAddToInspireBoard(user?.id);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const handleAdd = async (boardId: string) => {
    try {
      await addItem.mutateAsync({ boardId, projectId, imageUrl });
      toast.success("เพิ่มเข้า My Inspire แล้ว");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const board = await createBoard.mutateAsync(name.trim());
      await handleAdd(board.id);
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
        <div className="max-h-60 overflow-y-auto space-y-1">
          {boards.length === 0 && !creating && (
            <p className="text-xs text-muted-foreground py-2 text-center">ยังไม่มี board สร้างใหม่ได้ด้านล่าง</p>
          )}
          {boards.map((b) => (
            <button
              key={b.id}
              onClick={() => handleAdd(b.id)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted text-left text-sm transition"
            >
              <span className="truncate">{b.name}</span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">{b.item_count}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          {creating ? (
            <div className="flex gap-1">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อ board"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleCreate} disabled={createBoard.isPending}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-1" /> สร้าง board ใหม่
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InspirePopover;
