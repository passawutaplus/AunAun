import { useMemo, useState } from "react";
import { Check, FolderInput, MoreHorizontal, Pin, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  isDefaultInspireBoard,
  type InspireBoardWithCovers,
  type InspireRecentItem,
} from "@/hooks/useInspire";
import { cn } from "@/lib/utils";

type Props = {
  item: InspireRecentItem;
  boards: InspireBoardWithCovers[];
  pinned?: boolean;
  onPin?: () => void;
  onMoveToBoard?: (boardId: string) => void;
  onDelete?: () => void;
  className?: string;
  /** Always show trigger (default: visible on group-hover). */
  alwaysVisible?: boolean;
};

export function InspireItemActionsMenu({
  item,
  boards,
  pinned = false,
  onPin,
  onMoveToBoard,
  onDelete,
  className,
  alwaysVisible = false,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const already = useMemo(
    () => new Set(item.board_ids?.length ? item.board_ids : [item.board_id]),
    [item.board_id, item.board_ids],
  );
  const customBoards = useMemo(
    () => boards.filter((b) => !isDefaultInspireBoard(b)),
    [boards],
  );

  if (!onPin && !onMoveToBoard && !onDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="ตัวเลือก"
            aria-label="ตัวเลือกภาพ Inspire"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className={cn(
              "rounded-md p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground",
              !alwaysVisible && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
              className,
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[11rem] rounded-xl p-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {onPin ? (
            <DropdownMenuItem
              className="rounded-lg gap-2 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                onPin();
              }}
            >
              <Pin className={cn("h-3.5 w-3.5", pinned && "fill-current text-primary")} />
              {pinned ? "เลิกปักหมุด" : "ปักหมุด"}
            </DropdownMenuItem>
          ) : null}

          {onMoveToBoard ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-lg gap-2 cursor-pointer">
                <FolderInput className="h-3.5 w-3.5" />
                ย้ายเข้าBoard
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-[12rem] rounded-xl p-1.5 max-h-56 overflow-y-auto">
                {customBoards.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">ยังไม่มีบอร์ด</p>
                ) : (
                  customBoards.map((b) => {
                    const has = already.has(b.id);
                    return (
                      <DropdownMenuItem
                        key={b.id}
                        disabled={has}
                        className="rounded-lg gap-2 cursor-pointer"
                        onSelect={(e) => {
                          e.preventDefault();
                          if (!has) onMoveToBoard(b.id);
                        }}
                      >
                        {has ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                        <span className="truncate flex-1">{b.name}</span>
                        {has ? (
                          <span className="text-[10px] text-muted-foreground">มีแล้ว</span>
                        ) : null}
                      </DropdownMenuItem>
                    );
                  })
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}

          {onDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-lg gap-2 cursor-pointer text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmOpen(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {onDelete ? (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>ลบภาพนี้ออกจาก Inspire?</AlertDialogTitle>
              <AlertDialogDescription>
                ภาพจะถูกลบออกจากคลังและบอร์ดทั้งหมด (ผลงานต้นฉบับไม่ถูกลบ)
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  onDelete();
                  setConfirmOpen(false);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
