import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReceivedGiftsSummary {
  totalGifts: number;
  totalPx: number;
  projectsCount: number;
  byProject: Array<{
    projectId: string | null;
    title: string;
    coverUrl: string | null;
    giftCount: number;
    totalPx: number;
  }>;
}

export const useReceivedGiftsByProject = (userId: string | undefined) =>
  useQuery({
    queryKey: ["received-gifts-by-project", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ReceivedGiftsSummary> => {
      const { data: txs, error } = await supabase
        .from("gift_transactions")
        .select("price_px, project_id")
        .eq("recipient_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = txs ?? [];

      const projectIds = Array.from(
        new Set(rows.map((r) => r.project_id).filter((v): v is string => !!v))
      );

      let titlesMap = new Map<string, { title: string; cover_url: string | null }>();
      if (projectIds.length > 0) {
        const { data: projects, error: pErr } = await supabase
          .from("projects")
          .select("id, title, cover_url")
          .in("id", projectIds);
        if (pErr) throw pErr;
        titlesMap = new Map(
          (projects ?? []).map((p) => [p.id, { title: p.title, cover_url: p.cover_url }])
        );
      }

      const groups = new Map<string, { projectId: string | null; title: string; coverUrl: string | null; giftCount: number; totalPx: number }>();
      let totalPx = 0;
      for (const r of rows) {
        totalPx += r.price_px;
        const key = r.project_id ?? "__none__";
        const existing = groups.get(key);
        if (existing) {
          existing.giftCount += 1;
          existing.totalPx += r.price_px;
        } else {
          const meta = r.project_id ? titlesMap.get(r.project_id) : undefined;
          groups.set(key, {
            projectId: r.project_id ?? null,
            title: meta?.title ?? (r.project_id ? "(ผลงานถูกลบ)" : "ทั่วไป (ไม่ผูกผลงาน)"),
            coverUrl: meta?.cover_url ?? null,
            giftCount: 1,
            totalPx: r.price_px,
          });
        }
      }

      const byProject = Array.from(groups.values()).sort((a, b) => b.totalPx - a.totalPx);
      return {
        totalGifts: rows.length,
        totalPx,
        projectsCount: projectIds.length,
        byProject,
      };
    },
  });
