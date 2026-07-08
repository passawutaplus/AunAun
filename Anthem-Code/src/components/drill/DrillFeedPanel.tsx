import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_FEED_SELECT } from "@/lib/dbSelects";
import { todayISO } from "@/lib/dailySeedPick.vendored";
import { projectHasDailyDrillTag } from "@/lib/drillProject";
import PortfolioGrid from "@/components/profile/PortfolioGrid";
import { DrillDailyInlineCard } from "@/components/drill/DrillDailyInlineCard";
import PageLoader from "@/components/ui/PageLoader";

export default function DrillFeedPanel() {
  const date = todayISO();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["drill-gallery", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_FEED_SELECT)
        .eq("status", "Published")
        .contains("tags", ["So1oDrill"])
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []).filter((p) => projectHasDailyDrillTag(p.tags as string[], date));
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl glass-panel p-5 sm:p-6 space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary shrink-0" aria-hidden />
            <p className="text-[11px] uppercase tracking-wider text-primary font-semibold">
              โจทย์ร่วมประจำวัน · {date}
            </p>
          </div>
          <h2 className="text-lg sm:text-xl font-bold">Aplus1 — Daily Brief</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            ทุกคนเริ่มจากโจทย์เดียวกัน แล้วตีความออกมาในสไตล์ของตัวเอง
          </p>
        </div>
        <DrillDailyInlineCard />
      </section>

      <section className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold">
          ผลงานวันนี้ {projects.length > 0 && `(${projects.length})`}
        </h2>
        {isLoading ? (
          <PageLoader label="กำลังโหลดผลงาน..." />
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12 rounded-2xl border border-dashed">
            ยังไม่มีใครโพสต์ผลงานวันนี้ — เป็นคนแรกที่อวดผลงาน!
          </p>
        ) : (
          <PortfolioGrid projects={projects as Parameters<typeof PortfolioGrid>[0]["projects"]} />
        )}
      </section>
    </div>
  );
}
