import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ANON_KEY = "samecor.anon-viewer";

/** Random per-browser id so a guest's view of a package is counted once. */
function anonViewerId(): string | null {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export async function recordGuestServiceView(serviceId: string): Promise<void> {
  const anonId = anonViewerId();
  if (!anonId) return;
  try {
    await supabase.rpc("record_service_view_anon" as never, { p_service_id: serviceId, p_anon_id: anonId } as never);
  } catch {
    /* view counting is best effort */
  }
}

export type PackagePublicStats = { hires: number; views: number };

/** Real hire count (accepted / closed requests) and total views per package, readable by anyone. */
export async function fetchPackagePublicStats(serviceIds: string[]): Promise<Map<string, PackagePublicStats>> {
  const out = new Map<string, PackagePublicStats>();
  const ids = [...new Set(serviceIds.filter(Boolean))];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.rpc(
      "package_public_stats" as never,
      { p_service_ids: ids.slice(i, i + 200) } as never,
    );
    if (error) throw error;
    for (const row of (data ?? []) as { service_id: string; hires: number; views: number }[]) {
      out.set(row.service_id, { hires: Number(row.hires) || 0, views: Number(row.views) || 0 });
    }
  }
  return out;
}

export function usePackageHireCount(serviceId: string | undefined) {
  return useQuery({
    queryKey: ["package-hire-count", serviceId],
    enabled: !!serviceId,
    staleTime: 5 * 60_000,
    queryFn: async () => (await fetchPackagePublicStats([serviceId!])).get(serviceId!)?.hires ?? 0,
  });
}

/** Median first reply (minutes) in the creator's recent hire chats; null when there is too little data. */
export function useCreatorResponseMinutes(userId: string | undefined) {
  return useQuery({
    queryKey: ["creator-response-minutes", userId],
    enabled: !!userId,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("creator_response_minutes" as never, { p_user_id: userId } as never);
      if (error) return null;
      return typeof data === "number" ? data : null;
    },
  });
}

export type PackageOwnerStats = { saves: number; guestViews: number };

/** Saves and guest views for the signed-in creator's own packages. */
export function usePackageOwnerStats(enabled = true) {
  return useQuery({
    queryKey: ["package-owner-stats"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("package_owner_stats" as never);
      if (error) throw error;
      const map = new Map<string, PackageOwnerStats>();
      for (const row of (data ?? []) as { service_id: string; saves: number; guest_views: number }[]) {
        map.set(row.service_id, { saves: Number(row.saves) || 0, guestViews: Number(row.guest_views) || 0 });
      }
      return map;
    },
  });
}
