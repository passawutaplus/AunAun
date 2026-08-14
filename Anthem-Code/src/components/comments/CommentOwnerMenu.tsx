import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";

type Props = {
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  deleting?: boolean;
};

/** Owner ⋯ menu — edit or delete, with confirm on delete. */
export function CommentOwnerMenu({ onEdit, onDelete, deleting }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="ตัวเลือกความคิดเห็น"
            className="ml-auto rounded-full p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl w-40">
          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onEdit}>
            <Pencil className="w-4 h-4" /> แก้ไข
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive cursor-pointer"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="w-4 h-4" /> ลบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="ลบความคิดเห็นนี้?"
        description="การลบจะเอาข้อความนี้ออก และย้อนกลับไม่ได้"
        loading={deleting}
        onConfirm={async () => {
          await onDelete();
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
