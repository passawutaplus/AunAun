import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { marketingLeadsKey } from "./useMarketingBusinesses";

export type MarketingSignalKind =
  | "creator_unpublished"
  | "hirer_stale"
  | "job_no_applicants"
  | "collab_pending"
  | "ux_theme"
  | "profile_incomplete";

export type MarketingInternalSignal = {
  id: string;
  kind: MarketingSignalKind;
  title: string;
  summary: string;
  adminUrl: string;
  userId?: string;
  score: number;
  detectedAt: string;
};

const SITE = "https://aplus1.app";
const threeDaysAgo = () => new Date(Date.now() - 3 * 86_400_000).toISOString();
const sevenDaysAgo = () => new Date(Date.now() - 7 * 86_400_000).toISOString();
const thirtyDaysAgo = () => new Date(Date.now() - 30 * 86_400_000).toISOString();

async function fetchInternalSignals(): Promise<MarketingInternalSignal[]> {
  const signals: MarketingInternalSignal[] = [];

  const { data: staleProfiles } = await supabase
    .from("profiles")
    .select(
      "user_id, display_name, username, created_at, preferred_categories, opportunity_types, skills, profile_onboarding_at, feed_interests",
    )
    .lt("created_at", threeDaysAgo())
    .order("created_at", { ascending: true })
    .limit(80);

  if (staleProfiles?.length) {
    const userIds = staleProfiles.map((p) => p.user_id);
    const { data: published } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("status", "Published")
      .in("owner_id", userIds);
    const publishedSet = new Set((published ?? []).map((p) => p.owner_id));
    for (const p of staleProfiles) {
      if (!p.profile_onboarding_at) {
        const discs = (p.preferred_categories as string[] | null) ?? [];
        signals.push({
          id: `onboard-${p.user_id}`,
          kind: "profile_incomplete",
          title: p.display_name || p.username || "Creator",
          summary: discs.length
            ? `ยังไม่จบ onboarding · สายงาน: ${discs.slice(0, 3).join(", ")}`
            : "สมัครแล้วแต่ยังไม่จบโปรไฟล์ onboarding",
          adminUrl: `${SITE}/admin/users?user_id=${p.user_id}`,
          userId: p.user_id,
          score: 72,
          detectedAt: p.created_at,
        });
      }
      if (publishedSet.has(p.user_id)) continue;
      signals.push({
        id: `creator-${p.user_id}`,
        kind: "creator_unpublished",
        title: p.display_name || p.username || "Creator",
        summary: "สมัครแล้ว >3 วัน แต่ยังไม่มีผลงาน Published",
        adminUrl: `${SITE}/admin/users?user_id=${p.user_id}`,
        userId: p.user_id,
        score: 75,
        detectedAt: p.created_at,
      });
    }
  }

  const { data: hiring } = await supabase
    .from("hiring_requests")
    .select("id, client_name, project_title, created_at")
    .eq("status", "ใหม่")
    .lt("created_at", sevenDaysAgo())
    .order("created_at", { ascending: true })
    .limit(50);

  for (const hr of hiring ?? []) {
    signals.push({
      id: `hiring-${hr.id}`,
      kind: "hirer_stale",
      title: hr.client_name || "Hiring request",
      summary: hr.project_title || "คำขอจ้างค้างสถานะ ใหม่ >7 วัน",
      adminUrl: `${SITE}/admin/hiring?id=${hr.id}`,
      score: 70,
      detectedAt: hr.created_at,
    });
  }

  const { data: jobs } = await supabase
    .from("job_posts")
    .select("id, title, views, created_at, applicants_count")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  for (const jp of jobs ?? []) {
    if ((jp.applicants_count ?? 0) > 0) continue;
    signals.push({
      id: `job-${jp.id}`,
      kind: "job_no_applicants",
      title: jp.title || "Open job",
      summary: "งานเปิดอยู่แต่ยังไม่มีผู้สมัคร",
      adminUrl: `${SITE}/admin/jobs?id=${jp.id}`,
      score: 68,
      detectedAt: jp.created_at,
    });
  }

  const { data: collabs } = await supabase
    .from("collab_requests")
    .select("id, message, created_at")
    .eq("status", "ใหม่")
    .order("created_at", { ascending: false })
    .limit(40);

  for (const cr of collabs ?? []) {
    signals.push({
      id: `collab-${cr.id}`,
      kind: "collab_pending",
      title: "Collab request",
      summary: (cr.message ?? "คำขอคอลแลปสถานะ ใหม่").slice(0, 120),
      adminUrl: `${SITE}/admin/collabs?id=${cr.id}`,
      score: 65,
      detectedAt: cr.created_at,
    });
  }

  const { data: uxRows } = await supabase
    .from("ux_research_submissions" as never)
    .select("persona, created_at")
    .gte("created_at", thirtyDaysAgo())
    .limit(200);

  const uxByPersona = new Map<string, { count: number; latest: string }>();
  for (const row of (uxRows ?? []) as Array<{ persona: string; created_at: string }>) {
    const key = (row.persona ?? "").trim();
    if (!key) continue;
    const prev = uxByPersona.get(key) ?? { count: 0, latest: row.created_at };
    uxByPersona.set(key, {
      count: prev.count + 1,
      latest: row.created_at > prev.latest ? row.created_at : prev.latest,
    });
  }
  for (const [persona, meta] of uxByPersona) {
    signals.push({
      id: `ux-${persona.toLowerCase()}`,
      kind: "ux_theme",
      title: `UX: ${persona}`,
      summary: `รีวิว UX ${meta.count} ครั้งใน 30 วัน (ไม่แสดง PII ดิบ)`,
      adminUrl: `${SITE}/admin/feedback?persona=${encodeURIComponent(persona.toLowerCase())}`,
      score: 60,
      detectedAt: meta.latest,
    });
  }

  return signals.sort((a, b) => b.score - a.score || b.detectedAt.localeCompare(a.detectedAt));
}

export function useMarketingInternalSignals(businessId: string | null) {
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["marketing", "internal-signals"],
    enabled: isAdmin === true,
    staleTime: 60_000,
    queryFn: fetchInternalSignals,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("เลือก business ก่อน sync");
      const { data, error } = await supabase.rpc("marketing_sync_internal_signals", {
        _business_id: businessId,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: marketingLeadsKey(businessId) });
    },
  });

  return {
    signals: query.data ?? [],
    isLoading: query.isLoading,
    syncToPipeline: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    lastSyncedCount: syncMutation.data,
  };
}
