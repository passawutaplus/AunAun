import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, Lock, Globe2, Share2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  useCollection, useCollectionItems, useDeleteCollection, useUpdateCollection,
} from "@/hooks/useCollections";
import UserAvatar from "@/components/UserAvatar";
import { InlineLoader } from "@/components/ui/BanterLoader";
import CollectionFormDialog from "@/components/collections/CollectionFormDialog";
import SharePopover from "@/components/SharePopover";
import SeoHead from "@/components/SeoHead";
import PageLoader from "@/components/ui/PageLoader";
import CollectionItemsSection, { type CollectionSectionProject } from "@/components/collections/CollectionItemsSection";
import { toast } from "sonner";

const CollectionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: collection, isLoading } = useCollection(id);
  const { data: items = [], isLoading: itemsLoading, isError: itemsError, refetch: refetchItems } = useCollectionItems(id);
  const { data: ownerProfile } = useProfile(collection?.owner_id ?? undefined);
  const del = useDeleteCollection();
  const update = useUpdateCollection();
  const [editOpen, setEditOpen] = useState(false);

  const isOwner = !!user?.id && !!collection && user.id === collection.owner_id;
  const projects = items as CollectionSectionProject[];
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/collections/${collection?.id ?? id}`
      : `/collections/${collection?.id ?? id}`;

  const makePublic = async () => {
    if (!collection || collection.is_public) return;
    try {
      await update.mutateAsync({ id: collection.id, patch: { is_public: true } });
      toast.success("ตั้งเป็นสาธารณะแล้ว — ลิงก์แชร์ดูได้โดยไม่ต้องล็อกอิน");
    } catch (e) {
      toast.error((e as Error).message || "ตั้งค่าสาธารณะไม่สำเร็จ");
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }
  if (!collection) {
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center">
        <div className="text-center space-y-3">
          <Lock className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <p className="text-foreground font-medium">ไม่พบคอลเลกชันนี้</p>
          <p className="text-sm text-muted-foreground">อาจเป็นคอลเลกชันส่วนตัว หรือลิงก์ไม่ถูกต้อง</p>
          <Button onClick={() => navigate("/")}>กลับหน้าหลัก</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      <SeoHead
        title={collection.name}
        description={
          collection.description?.trim() ||
          `คอลเลกชัน ${collection.name} · ${collection.item_count} ผลงาน`
        }
        path={`/collections/${collection.id}`}
        noindex={!collection.is_public || collection.item_count < 3}
      />

      <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <BackButton
            onClick={() => navigate(isOwner ? "/collections" : "/", { replace: isOwner })}
          />
          <div className="flex items-center gap-2">
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
                        "{collection.name}" และผลงานที่อยู่ในนี้ทั้งหมดจะถูกเอาออกจากคอลเลกชัน (ผลงานต้นฉบับไม่ถูกลบ)
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          try {
                            await del.mutateAsync(collection.id);
                            navigate("/collections");
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
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {collection.is_public ? (
              <span className="inline-flex items-center gap-1"><Globe2 className="w-3 h-3" /> สาธารณะ</span>
            ) : (
              <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> ส่วนตัว</span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-medium text-foreground leading-tight">{collection.name}</h1>
          {collection.description && (
            <p className="text-base text-foreground max-w-2xl leading-7 whitespace-pre-wrap">
              {collection.description}
            </p>
          )}
          {ownerProfile && collection.owner_id ? (
            <Link
              to={`/u/${collection.owner_id}`}
              className="inline-flex items-center gap-2 text-sm text-foreground hover:underline"
            >
              <UserAvatar
                src={ownerProfile.avatar_url}
                name={ownerProfile.display_name}
                username={ownerProfile.username}
                className="h-6 w-6"
              />
              <span>{ownerProfile.display_name || ownerProfile.username}</span>
            </Link>
          ) : null}
          <p className="text-xs text-muted-foreground">{collection.item_count} ผลงานในคอลเลกชันนี้</p>
          {isOwner && !collection.is_public ? (
            <p className="text-xs text-muted-foreground">
              ต้องการแชร์ให้คนอื่นดูได้?{" "}
              <button type="button" className="text-primary hover:underline" onClick={() => void makePublic()}>
                ตั้งเป็นสาธารณะ
              </button>
            </p>
          ) : null}
        </header>

        {itemsLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <InlineLoader />
          </div>
        ) : itemsError ? (
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
            layoutGroupId="collection-items-layout"
          />
        )}
      </div>

      <CollectionFormDialog open={editOpen} onOpenChange={setEditOpen} initial={collection} />
    </div>
  );
};

export default CollectionDetailPage;
