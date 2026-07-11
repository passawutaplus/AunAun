import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Studio } from "@/hooks/useStudios";

export interface StudioCardData {
  studio: Studio;
  memberAvatars: { id: string; avatar_url: string | null; display_name: string }[];
  projectCovers: { id: string; title: string; cover: string }[];
  searchHaystack: string;
}

/** Public list of all studios with member previews and recent project covers. */
export const usePublicStudios = () =>
  useQuery({
    queryKey: ["public-studios"],
    queryFn: async (): Promise<StudioCardData[]> => {
      const { data: studios, error } = await supabase
        .from("studios")
        .select("*")
        .order("member_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      const list = (studios ?? []) as Studio[];
      if (list.length === 0) return [];

      const ids = list.map((s) => s.id);
      const [{ data: members }, { data: projects }] = await Promise.all([
        supabase.from("studio_members").select("studio_id, user_id").in("studio_id", ids),
        supabase
          .from("projects")
          .select("id, title, cover_url, gallery_urls, studio_id, created_at")
          .in("studio_id", ids)
          .eq("status", "Published")
          .order("created_at", { ascending: false }),
      ]);

      const userIds = Array.from(new Set((members ?? []).map((m: any) => m.user_id)));
      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles_public")
            .select("id, display_name, avatar_url")
            .in("id", userIds)
        : { data: [] as any[] };
      const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      return list.map((s) => {
        const memberRows = (members ?? []).filter((m: any) => m.studio_id === s.id).slice(0, 5);
        const projRows = ((projects ?? []) as any[])
          .filter((p) => p.studio_id === s.id)
          .slice(0, 3)
          .map((p) => ({ id: p.id, title: p.title, cover: p.cover_url || p.gallery_urls?.[0] || "" }));

        const memberAvatars = memberRows.map((m: any) => {
          const p = pMap.get(m.user_id);
          return {
            id: m.user_id,
            avatar_url: p?.avatar_url ?? null,
            display_name: p?.display_name ?? "",
          };
        });

        return {
          studio: s,
          memberAvatars,
          projectCovers: projRows,
          searchHaystack: [s.name, s.tagline, s.bio, s.location].join(" ").toLowerCase(),
        };
      });
    },
  });
