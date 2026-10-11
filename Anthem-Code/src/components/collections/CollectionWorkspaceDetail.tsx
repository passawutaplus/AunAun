import { useState } from "react";
import { Pencil, Trash2, Lock, Globe2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useCollection,
  useCollectionItems,
  useDeleteCollection,
  useUpdateCollection,
} from "@/hooks/useCollections";
import CollectionFormDialog from "@/components/collections/CollectionFormDialog";
import SharePopover from "@/components/SharePopover";
import { InlineLoader } from "@/components/ui/BanterLoader";
import CollectionItemsSection, { type CollectionSectionProject } from "@/components/collections/CollectionItemsSection";
import { toast } from "sonner";

type Props = {
  collectionId: string;
  isOwner: boolean;
  onDeleted?: () => void;
};

export function CollectionWorkspaceDetail({ collectionId, isOwner, onDeleted }: Props) {
  const { data: collection, isLoading } = useCollection(collectionId);
  const { data: items = [], isLoading: itemsLoading, isError: itemsError, refetch: refetchItems } = useCollectionItems(collectionId);
  const del = useDeleteCollection();
  const update = useUpdateCollection();
  const [editOpen, setEditOpen] = useState(false);

  const projects = items as CollectionSectionProject[];
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/collections/${collection?.id ?? collectionId}`
      : `/collections/${collection?.id ?? collectionId}`;

  const makePublic = async () => {
    if (!collection || collection.is_public) return;
    try {
      await update.mutateAsync({ id: collection.id, patch: { is_public: true } });
      toast.success("ตั้งเป็นสาธารณะแล้ว — ลิงก์แชร์ดูได้โดยไม่ต้องล็อกอิน");
    } catch (e) {
      toast.error((e as Error).message || "ตั้งค่าสาธารณะไม่สำเร็จ");
    }
  };

  if (isLoading || itemsLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border/60 bg-card/40">
        <InlineLoader />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 px-4 py-16 text-center">
        <p className="text-foreground font-medium">ไม่พบคอลเลกชันนี้</p>
        <p className="mt-1 text-sm text-muted-foreground">อาจถูกลบแล้ว หรือลิงก์ไม่ถูกต้อง</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {collection.is_public ? (
                <span className="inline-flex items-center gap-1">
                  <Globe2 className="h-3 w-3" /> สาธารณะ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" /> ส่วนตัว
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-medium text-foreground leading-tight">
              {collection.name}
            </h2>
            {collection.description && (
              <p className="text-sm text-foreground/90 max-w-2xl leading-relaxed whitespace-pre-wrap">
                {collection.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {collection.item_count} ผลงานในคอลเลกชันนี้
            </p>
            {isOwner && !collection.is_public ? (
              <p className="text-xs text-muted-foreground">
                ต้องการแชร์ให้คนอื่นดูได้?{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => void makePublic()}>
                  ตั้งเป็นสาธารณะ
                </button>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(isOwner || collection.is_public) && (
              <SharePopover url={shareUrl} title={collection.name} label="แชร์คอลเลกชัน">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 rounded-full p-0"
                  aria-label="แชร์คอลเลกชัน"
                  title="แชร์"
                  onClick={() => {
                    if (isOwner && !collection.is_public) {
                      toast.message("คอลเลกชันยังเป็นส่วนตัว", {
                        description: "คนอื่นเปิดลิงก์นี้ไม่ได้จนกว่าจะตั้งเป็นสาธารณะ",
                        action: {
                          label: "ตั้งสาธารณะ",
                          onClick: () => void makePublic(),
                        },
                      });
                    }
                  }}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </SharePopover>
            )}
            {isOwner && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                  className="h-9 w-9 rounded-full p-0"
                  aria-label="แก้ไขคอลเลกชัน"
                  title="แก้ไข"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 rounded-full p-0 text-destructive hover:text-destructive dark:text-red-400 dark:hover:text-red-300"
                      aria-label="ลบคอลเลกชัน"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ลบคอลเลกชันนี้?</AlertDialogTitle>
                      <AlertDialogDescription>
                        &quot;{collection.name}&quot; และผลงานที่อยู่ในนี้ทั้งหมดจะถูกเอาออกจากคอลเลกชัน (ผลงานต้นฉบับไม่ถูกลบ)
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          try {
                            await del.mutateAsync(collection.id);
                            onDeleted?.();
                          } catch (e) {
                            toast.error((e as Error).message || "ลบคอลเลกชันไม่สำเร็จ");
                          }
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        ลบ
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </header>

      {itemsError ? (
        <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
          <p className="text-foreground font-medium">โหลดผลงานไม่สำเร็จ</p>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => void refetchItems()}>
            ลองอีกครั้ง
          </Button>
        </div>
      ) : (
        <CollectionItemsSection
          collectionId={collection.id}
          coverUrl={collection.cover_url}
          projects={projects}
          isOwner={isOwner}
          layoutGroupId="collection-workspace-items-layout"
        />
      )}

      <CollectionFormDialog open={editOpen} onOpenChange={setEditOpen} initial={collection} />
    </div>
  );
}
