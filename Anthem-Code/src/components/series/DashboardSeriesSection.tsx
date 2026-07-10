import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FolderKanban, Library, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeriesCard } from "@/components/series/SeriesCard";
import { SeriesFormDialog } from "@/components/series/SeriesFormDialog";
import type { ProjectSeries } from "@/hooks/useProjectSeries";

const PREVIEW_LIMIT = 4;

type Props = {
  series: ProjectSeries[];
};

/** Compact series preview under dashboard stats — full workspace stays on /series. */
export function DashboardSeriesSection({ series }: Props) {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const preview = series.slice(0, PREVIEW_LIMIT);
  const hasMore = series.length > PREVIEW_LIMIT;

  return (
    <section className="space-y-3" aria-labelledby="dashboard-series-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2
            id="dashboard-series-heading"
            className="text-base font-semibold text-foreground flex items-center gap-2"
          >
            <Library className="h-4 w-4 text-primary shrink-0" />
            ชุดผลงาน
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> สร้างชุด
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate("/series")}
          >
            จัดการชุด
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {series.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-4 py-8 text-center">
          <FolderKanban className="mx-auto mb-2 h-9 w-9 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">ยังไม่มีชุดผลงาน</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            สร้างชุดว่างไว้ก่อน แล้วไปหน้าจัดการชุดเพื่อลากผลงานเข้าโฟลเดอร์
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> สร้างชุดแรก
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {preview.map((s) => (
            <SeriesCard
              key={s.id}
              series={s}
              compact
              onSelect={() => navigate(`/series?s=${encodeURIComponent(s.id)}`)}
            />
          ))}
        </div>
      )}

      {hasMore ? (
        <button
          type="button"
          onClick={() => navigate("/series")}
          className="text-xs text-primary hover:underline"
        >
          ดูทั้งหมด {series.length} ชุด
        </button>
      ) : null}

      <SeriesFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(id) => navigate(`/series?s=${encodeURIComponent(id)}`)}
      />
    </section>
  );
}
