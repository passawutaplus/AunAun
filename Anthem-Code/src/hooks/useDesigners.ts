import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PROFILE_DESIGNER_SELECT, PROJECT_FEED_SELECT } from "@/lib/dbSelects";
import type { DesignerCardData } from "@/data/designerTypes";

export type { DesignerCardData };

export const useDesigners = () =>
  useQuery({
    queryKey: ["designers-feed", "v4"],
    queryFn: async (): Promise<DesignerCardData[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(PROFILE_DESIGNER_SELECT)
        .order("updated_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const list = profiles ?? [];
      const ids = list.map((p) => (p as { user_id?: string; id?: string }).user_id ?? p.id);
      if (!ids.length) return [];

      const { data: projects } = await supabase
        .from("projects")
        .select(PROJECT_FEED_SELECT)
        .in("owner_id", ids)
        .eq("status", "Published")
        .order("created_at", { ascending: false });

      const grouped = new Map<string, Tables<"projects">[]>();
      (projects ?? []).forEach((p) => {
        const arr = grouped.get(p.owner_id) ?? [];
        if (arr.length < 6) arr.push(p as Tables<"projects">);
        grouped.set(p.owner_id, arr);
      });

      return list
        .map((profile) => {
          const pid = (profile as { user_id?: string; id?: string }).user_id ?? profile.id;
          const ownerProjects = grouped.get(pid) ?? [];
          const parts: string[] = [
            profile.display_name ?? "",
            profile.username ?? "",
            profile.role ?? "",
            profile.bio ?? "",
            (profile.skills ?? []).join(" "),
            ownerProjects.map((p) => p.title).join(" "),
            ownerProjects.map((p) => p.category ?? "").join(" "),
            ownerProjects.flatMap((p) => p.tools ?? []).join(" "),
            ownerProjects.flatMap((p) => p.tags ?? []).join(" "),
          ];
          return {
            profile: profile as Tables<"profiles">,
            projects: ownerProjects,
            searchHaystack: parts.join(" ").toLowerCase(),
          };
        })
        .filter((d) => d.projects.length > 0);
    },
  });
