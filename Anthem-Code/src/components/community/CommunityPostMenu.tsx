import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, UserX } from "lucide-react";
import { Link } from "react-router-dom";
import ReportTrigger from "@/components/report/ReportTrigger";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteCommunityPost } from "@/hooks/useCommunityPosts";
import { useBlockUser } from "@/hooks/useCommunityPostInteractions";
import { toast } from "sonner";

type Props = {
  postId: string;
  authorId: string;
  title?: string;
  className?: string;
  onDeleted?: () => void;
};

const CommunityPostMenu = ({ postId, authorId, title, className, onDeleted }: Props) => {
  const { user } = useAuth();
  const deleteMut = useDeleteCommunityPost();
  const blockMut = useBlockUser();
  const isOwner = user?.id === authorId;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const label = title?.trim() || "โพสต์นี้";

  const handleConfirmDelete = async () => {
    try {
      await deleteMut.mutateAsync(postId);
      toast.success("ลบโพสต์แล้ว");
      setDeleteOpen(false);
      onDeleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    }
  };

  const handleBlock = async () => {
    if (!user) return;
    if (!window.confirm("บล็อกผู้ใช้นี้? คุณจะไม่เห็นโพสต์จากพวกเขาอีก")) return;
    try {
      await blockMut.mutateAsync(authorId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "บล็อกไม่สำเร็จ");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="ตัวเลือกโพสต์"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className={
              className ?? "rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl w-48">
          {isOwner && (
            <>
              <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                <Link to={`/community/${postId}/edit`} onClick={(e) => e.stopPropagation()}>
                  <Pencil className="w-4 h-4" /> แก้ไขโพสต์
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4" /> ลบโพสต์
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {!isOwner && user && (
            <>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleBlock();
                }}
              >
                <UserX className="w-4 h-4" /> บล็อกผู้ใช้
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
            <ReportTrigger
              targetType="community_post"
              targetId={postId}
              targetOwnerId={authorId}
              variant="text"
              label="รายงานโพสต์"
              className="w-full justify-start rounded-lg px-2 py-1.5 text-sm"
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="ลบโพสต์นี้?"
        description={
          <>
            「{label}」จะถูกลบถาวรและไม่สามารถกู้คืนได้ ต้องการลบจริงหรือไม่?
          </>
        }
        onConfirm={handleConfirmDelete}
        loading={deleteMut.isPending}
      />
    </>
  );
};

export default CommunityPostMenu;
