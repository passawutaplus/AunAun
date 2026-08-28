import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Layers3,
  Lock,
  MoreHorizontal,
  Pencil,
  Pin,
  Share2,
  Trash2,
} from "lucide-react";
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
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import CollectionFormDialog from "@/components/collections/CollectionFormDialog";
import SharePopover from "@/components/SharePopover";
import { useAuth } from "@/hooks/useAuth";
import {
  useCollections,
  useProjectCollectionIds,
  useToggleCollectionItem,
} from "@/hooks/useCollections";
import { useDeleteProject, type DBProject } from "@/hooks/useProjects";
import { usePortfolioOrder } from "@/hooks/usePortfolioOrder";
import { naturalFeedCoverUrl } from "@/lib/feedProjectCover";
import { trackProductEvent } from "@/lib/productEvents";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  project: DBProject;
  allProjects: DBProject[];
};

export function ProfileOverallWorkMenu({ project, allProjects }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pin, unpin } = usePortfolioOrder(user?.id);
  const deleteProject = useDeleteProject();
  const toggleCollection = useToggleCollectionItem();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);

  const collectionsEnabled = menuOpen && !!user?.id;
  const { data: collections = [] } = useCollections(collectionsEnabled ? user?.id : undefined);
  const { data: activeIds = [] } = useProjectCollectionIds(
    collectionsEnabled ? project.id : undefined,
    collectionsEnabled ? user?.id : undefined,
  );

  const pinned = !!project.is_pinned;
  const title = project.title?.trim() || "ผลงานนี้";
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/project/${project.id}`
      : `/project/${project.id}`;

  const handlePin = () => {
    if (pinned) {
      unpin.mutate(project.id, {
        onSuccess: () => toast.success("เลิกปักหมุดแล้ว"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ"),
      });
      return;
    }
    pin.mutate(
      { id: project.id, projects: allProjects },
      {
        onSuccess: () => toast.success("ปักหมุดผลงานแล้ว"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "ปักหมุดไม่สำเร็จ"),
      },
    );
  };

  const handleToggleCollection = async (collectionId: string, isIn: boolean) => {
    try {
      await toggleCollection.mutateAsync({
        collectionId,
        projectId: project.id,
        remove: isIn,
      });
      if (!isIn) {
        void trackProductEvent(
          "collection_save",
          { project_id: project.id, collection_id: collectionId },
          { debounceMs: 1_000 },
        );
      }
      toast.success(isIn ? "เอาออกจากคอลเลกชันแล้ว" : "เพิ่มเข้าคอลเลกชันแล้ว");
    } catch (e: unknown) {
      toast.error(mapWriteFlowError(e, "ผิดพลาด"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(project.id);
      toast.success("ลบผลงานแล้ว");
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    }
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="ตัวเลือกผลงาน"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[11.5rem] rounded-xl p-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem
            className="cursor-pointer gap-2 rounded-lg"
            disabled={pin.isPending || unpin.isPending}
            onSelect={handlePin}
          >
            <Pin className={cn("h-3.5 w-3.5", pinned && "fill-current text-primary")} />
            {pinned ? "เลิกปักหมุด" : "ปักหมุด"}
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer gap-2 rounded-lg">
              <Layers3 className="h-3.5 w-3.5" />
              เข้าCollections
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-56 min-w-[13rem] overflow-y-auto rounded-xl p-1.5">
              {collections.length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">ยังไม่มีคอลเลกชัน</p>
              ) : (
                collections.map((c) => {
                  const isIn = activeIds.includes(c.id);
                  return (
                    <DropdownMenuItem
                      key={c.id}
                      className="cursor-pointer gap-2 rounded-lg"
                      disabled={toggleCollection.isPending}
                      onSelect={(e) => {
                        e.preventDefault();
                        void handleToggleCollection(c.id, isIn);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      {!c.is_public ? <Lock className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
                      {isIn ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                    </DropdownMenuItem>
                  );
                })
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-lg text-primary focus:text-primary"
                onSelect={(e) => {
                  e.preventDefault();
                  setMenuOpen(false);
                  setCreateCollectionOpen(true);
                }}
              >
                สร้างคอลเลกชันใหม่
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            className="cursor-pointer gap-2 rounded-lg"
            onSelect={() => {
              setMenuOpen(false);
              setShareOpen(true);
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            แชร์
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 rounded-lg"
            onSelect={() => navigate(`/portfolio/${project.id}/edit`)}
          >
            <Pencil className="h-3.5 w-3.5" />
            แก้ไข
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 rounded-lg text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            ลบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SharePopover
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={shareUrl}
        title={title}
        imageUrl={naturalFeedCoverUrl(project.cover_url || project.gallery_urls?.[0] || "") || undefined}
        label="แชร์ผลงาน"
      >
        <span className="sr-only" />
      </SharePopover>

      <CollectionFormDialog
        open={createCollectionOpen}
        onOpenChange={setCreateCollectionOpen}
        onCreated={async (id) => {
          await toggleCollection.mutateAsync({ collectionId: id, projectId: project.id });
          void trackProductEvent(
            "collection_save",
            { project_id: project.id, collection_id: id },
            { debounceMs: 1_000 },
          );
          toast.success("เพิ่มเข้าคอลเลกชันใหม่แล้ว");
        }}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="ลบผลงานนี้?"
        description={
          <>「{title}」จะถูกลบถาวรและไม่สามารถกู้คืนได้ ต้องการลบจริงหรือไม่?</>
        }
        onConfirm={handleDelete}
        loading={deleteProject.isPending}
      />
    </>
  );
}
