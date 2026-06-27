import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Pencil, Trash2, Layers3, Lock, Globe2, X } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  useCollection, useCollectionItems, useDeleteCollection, useToggleCollectionItem,
} from "@/hooks/useCollections";
import CollectionFormDialog from "@/components/collections/CollectionFormDialog";
import { toast } from "sonner";

const CollectionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: collection, isLoading } = useCollection(id);
  const { data: items = [] } = useCollectionItems(id);
  const remove = useToggleCollectionItem();
  const del = useDeleteCollection();
  const [editOpen, setEditOpen] = useState(false);

  const isOwner = !!user?.id && !!collection && user.id === collection.owner_id;

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">กำลังโหลด...</div>;
  }
  if (!collection) {
    return (
      <div className="min-h-screen bg-app-ambient flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">ไม่พบคอลเลกชันนี้</p>
          <Button onClick={() => navigate("/")}>กลับหน้าหลัก</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton />
          {isOwner && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="rounded-full">
                <Pencil className="w-4 h-4 mr-1" /> แก้ไข
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="rounded-full text-destructive hover:text-destructive">
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
                        await del.mutateAsync(collection.id);
                        navigate("/collections");
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      ลบ
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers3 className="w-3.5 h-3.5" /> คอลเลกชัน
            {collection.is_public ? (
              <span className="inline-flex items-center gap-1"><Globe2 className="w-3 h-3" /> สาธารณะ</span>
            ) : (
              <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> ส่วนตัว</span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-medium text-foreground leading-tight">{collection.name}</h1>
          {collection.category && (
            <Badge className="bg-primary/15 text-primary border-0 hover:bg-primary/15 rounded-full">
              {collection.category}
            </Badge>
          )}
          {collection.description && (
            <p className="text-base text-foreground max-w-2xl leading-7 whitespace-pre-wrap">
              {collection.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{collection.item_count} ผลงานในนิทรรศการ</p>
        </header>

        {items.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <Layers3 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">ยังไม่มีผลงานในคอลเลกชันนี้</p>
            <p className="text-sm text-muted-foreground">เลื่อนดูฟีดแล้วกดไอคอน Layers เพื่อเก็บเข้านี่</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
            {items.map((p: any) => (
              <div key={p.id} className="group relative">
                <Link to={`/project/${p.id}`} className="block">
                  <div className="relative w-full aspect-[4/3] overflow-hidden rounded-md bg-muted">
                    {p.cover_url && (
                      <img
                        src={p.cover_url}
                        alt={p.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <h3 className="font-medium text-foreground text-sm line-clamp-1 mt-2 px-0.5">{p.title}</h3>
                </Link>
                {isOwner && (
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await remove.mutateAsync({ collectionId: collection.id, projectId: p.id, remove: true });
                      toast.success("เอาออกจากคอลเลกชันแล้ว");
                    }}
                    aria-label="เอาออก"
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-background/70 backdrop-blur-md border border-white/15 shadow-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CollectionFormDialog open={editOpen} onOpenChange={setEditOpen} initial={collection} />
    </div>
  );
};

export default CollectionDetailPage;
