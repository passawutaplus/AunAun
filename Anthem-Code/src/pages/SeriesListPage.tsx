import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Plus } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMyProjectSeries } from "@/hooks/useProjectSeries";
import { SeriesCard } from "@/components/series/SeriesCard";
import { SeriesFormDialog } from "@/components/series/SeriesFormDialog";
import { InlineLoader } from "@/components/ui/BanterLoader";

const SeriesListPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: series = [], isLoading, isError, refetch } = useMyProjectSeries(user?.id);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/series");
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
            <Plus className="w-4 h-4 mr-1" /> ชุดใหม่
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-medium text-foreground">ชุดผลงานของฉัน</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              รวมหลายชิ้นของโปรเจกต์/ลูกค้าเดียวกัน — สร้างโฟลเดอร์ว่างก่อนก็ได้
            </p>
          </div>
        </header>

        {isLoading ? (
          <InlineLoader />
        ) : isError ? (
          <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
            <p className="text-foreground font-medium">โหลดชุดผลงานไม่สำเร็จ</p>
            <p className="text-sm text-muted-foreground">
              อาจยังไม่ได้รัน migration — ลองใหม่ หรือติดต่อทีม
            </p>
            <Button variant="outline" className="rounded-full" onClick={() => refetch()}>
              ลองใหม่
            </Button>
          </div>
        ) : series.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <FolderKanban className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">ยังไม่มีชุดผลงาน</p>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              สร้างชุดว่างไว้ก่อน แล้วค่อยเพิ่มผลงาน — หรือมีงานแล้วค่อยจัดเข้าชุดก็ได้
            </p>
            <Button
              onClick={() => setFormOpen(true)}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" /> สร้างชุดผลงาน
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {series.map((s) => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>
        )}
      </div>

      <SeriesFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(id) => navigate(`/series/${id}`)}
      />
    </div>
  );
};

export default SeriesListPage;
