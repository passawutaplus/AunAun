import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { isBenignQueryError } from "@/lib/supabaseErrors";
import { fromCreatorServices, fromCreatorServiceViews } from "@/lib/creatorServicesDb";
import { formatServicePriceRange } from "@/hooks/useCreatorServices";

export type AdminPackageRow = {
  id: string;
  owner_id: string;
  title: string;
  price_thb: number;
  price_min_thb: number;
  status: "Draft" | "Published";
  cover_url: string | null;
  summary: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  hire_count: number;
  price_label: string;
};

export type AdminPackageOverview = {
  total: number;
  published: number;
  drafts: number;
  views24h: number;
  hires24h: number;
  views7d: number;
  hires7d: number;
};

const sinceHours = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

function swallowCount(res: { count: number | null; error: unknown }): number {
  if (res.error && !isBenignQueryError(res.error as { message?: string; code?: string })) {
    throw res.error;
  }
  return res.count ?? 0;
}

export function useAdminPackageOverview() {
  const { data: isAdmin } = useIsAdmin();
  return useQuery<AdminPackageOverview>({
    queryKey: ["admin-package-overview"],
    enabled: isAdmin === true,
    refetchInterval: 60_000,
    queryFn: async () => {
      const since24 = sinceHours(24);
      const since7d = sinceHours(24 * 7);
      const [
        total,
        published,
        drafts,
        views24h,
        hires24h,
        views7d,
        hires7d,
      ] = await Promise.all([
        fromCreatorServices().select("*", { count: "exact", head: true }),
        fromCreatorServices()
          .select("*", { count: "exact", head: true })
          .eq("status", "Published"),
        fromCreatorServices()
          .select("*", { count: "exact", head: true })
          .eq("status", "Draft"),
        fromCreatorServiceViews()
          .select("*", { count: "exact", head: true })
          .gte("viewed_at", since24),
        supabase
          .from("hiring_requests")
          .select("*", { count: "exact", head: true })
          .not("service_id", "is", null)
          .gte("created_at", since24),
        fromCreatorServiceViews()
          .select("*", { count: "exact", head: true })
          .gte("viewed_at", since7d),
        supabase
          .from("hiring_requests")
          .select("*", { count: "exact", head: true })
          .not("service_id", "is", null)
          .gte("created_at", since7d),
      ]);

      return {
        total: swallowCount(total),
        published: swallowCount(published),
        drafts: swallowCount(drafts),
        views24h: swallowCount(views24h),
        hires24h: swallowCount(hires24h),
        views7d: swallowCount(views7d),
        hires7d: swallowCount(hires7d),
      };
    },
  });
}

export function useAdminPackages(limit = 300) {
  const { data: isAdmin } = useIsAdmin();
  return useQuery<AdminPackageRow[]>({
    queryKey: ["admin-list", "creator_services", "monitor", limit],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await fromCreatorServices()
        .select(
          "id,owner_id,title,price_thb,price_min_thb,status,cover_url,summary,created_at,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string;
        owner_id: string;
        title: string;
        price_thb: number;
        price_min_thb: number;
        status: string;
        cover_url: string | null;
        summary: string;
        created_at: string;
        updated_at: string;
      }>;
      if (!rows.length) return [];

      const ids = rows.map((r) => r.id);
      const [viewsRes, hiresRes] = await Promise.all([
        fromCreatorServiceViews().select("service_id").in("service_id", ids),
        supabase.from("hiring_requests").select("service_id").in("service_id", ids),
      ]);

      const viewCounts = new Map<string, number>();
      for (const row of (viewsRes.data ?? []) as { service_id: string }[]) {
        viewCounts.set(row.service_id, (viewCounts.get(row.service_id) ?? 0) + 1);
      }
      const hireCounts = new Map<string, number>();
      for (const row of (hiresRes.data ?? []) as { service_id: string | null }[]) {
        if (!row.service_id) continue;
        hireCounts.set(row.service_id, (hireCounts.get(row.service_id) ?? 0) + 1);
      }

      return rows.map((r) => {
        const min = Number(r.price_min_thb) || Number(r.price_thb) || 0;
        const max = Number(r.price_thb) || 0;
        return {
          id: r.id,
          owner_id: r.owner_id,
          title: r.title,
          price_thb: max,
          price_min_thb: min,
          status: r.status === "Published" ? "Published" : "Draft",
          cover_url: r.cover_url,
          summary: r.summary ?? "",
          created_at: r.created_at,
          updated_at: r.updated_at,
          view_count: viewCounts.get(r.id) ?? 0,
          hire_count: hireCounts.get(r.id) ?? 0,
          price_label: formatServicePriceRange(min, max),
        };
      });
    },
  });
}
