import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Layers3 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCollections } from "@/hooks/useCollections";
import CollectionCard from "@/components/collections/CollectionCard";
import { InlineLoader } from "@/components/ui/BanterLoader";
import CollectionFormDialog from "@/components/collections/CollectionFormDialog";

const CollectionsPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: collections = [], isLoading, isError, refetch } = useCollections(user?.id);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/collections");
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton />
          <Button
            size="sm"
            onClick={() => setFormOpen(true)}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-1" /> คอลเลกชันใหม่
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Layers3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-medium text-foreground">คอลเลกชันของฉัน</h1>
            <p className="text-xs md:text-sm text-muted-foreground">เก็บผลงานที่ชอบเป็นนิทรรศการสไตล์คุณ</p>
          </div>
        </header>

        {isLoading ? (
          <InlineLoader />
        ) : isError ? (
          <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
            <p className="text-foreground font-medium">โหลดคอลเลกชันไม่สำเร็จ</p>
            <p className="text-sm text-muted-foreground">ลองใหม่อีกครั้ง หรือตรวจการเชื่อมต่อ</p>
            <Button variant="outline" className="rounded-full" onClick={() => refetch()}>
              ลองใหม่
            </Button>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <Layers3 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">ยังไม่มีคอลเลกชัน</p>
            <p className="text-sm text-muted-foreground mb-4">สร้างคอลเลกชันแรก แล้วเริ่มเก็บผลงานที่คุณรัก</p>
            <Button onClick={() => setFormOpen(true)} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1" /> สร้างคอลเลกชัน
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {collections.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
        )}
      </div>

      <CollectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(id) => navigate(`/collections/${id}`)}
      />
    </div>
  );
};

export default CollectionsPage;
