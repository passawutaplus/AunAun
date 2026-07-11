import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PROFILE_DESIGNER_SELECT, PROJECT_FEED_SELECT } from "@/lib/dbSelects";
import { profilesPublicFrom } from "@/lib/profileAccess";
import type { DesignerCardData } from "@/data/designerTypes";

export type { DesignerCardData };

const DESIGNERS_PAGE = 60;
const PROJECTS_PER_DESIGNER = 6;

export const useDesigners = () =>
  useQuery({
    queryKey: ["designers-feed", "v6"],
    queryFn: async (): Promise<DesignerCardData[]> => {
      const { data: profiles, error } = await profilesPublicFrom()
        .select(PROFILE_DESIGNER_SELECT)
        .order("created_at", { ascending: false })
        .limit(DESIGNERS_PAGE);
      if (error) throw error;
      const list = profiles ?? [];
      const ids = list.map((p) => (p as { user_id?: string; id?: string }).user_id ?? p.id);
      if (!ids.length) return [];

      // Hard cap so one prolific owner cannot pull unbounded rows for this feed.
      const projectCap = Math.min(ids.length * PROJECTS_PER_DESIGNER, DESIGNERS_PAGE * PROJECTS_PER_DESIGNER);
      const { data: projects } = await supabase
        .from("projects")
        .select(PROJECT_FEED_SELECT)
        .in("owner_id", ids)
        .eq("status", "Published")
        .order("created_at", { ascending: false })
        .limit(projectCap);

      const grouped = new Map<string, Tables<"projects">[]>();
      (projects ?? []).forEach((p) => {
        const arr = grouped.get(p.owner_id) ?? [];
        if (arr.length < PROJECTS_PER_DESIGNER) arr.push(p as Tables<"projects">);
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
