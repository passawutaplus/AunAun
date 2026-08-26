import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  PROFILE_DESIGNER_SELECT,
  PROFILE_DESIGNER_SELECT_NO_ACTIVE,
  PROJECT_FEED_SELECT,
} from "@/lib/dbSelects";
import { fromCreatorServices } from "@/lib/creatorServicesDb";
import { displayProfileAddress } from "@/lib/profileAddress";
import { profilesPublicFrom } from "@/lib/profileAccess";
import { isOptionalQueryError, isSchemaMismatchError } from "@/lib/supabaseErrors";
import type { DesignerCardData } from "@/data/designerTypes";

export type { DesignerCardData };

const DESIGNERS_PAGE = 60;
const PROJECTS_PER_DESIGNER = 6;

function profileUserId(p: { user_id?: string; id?: string }) {
  return p.user_id ?? p.id;
}

export const useDesigners = () =>
  useQuery({
    queryKey: ["designers-feed", "v11"],
    queryFn: async (): Promise<DesignerCardData[]> => {
      let { data: profiles, error } = await profilesPublicFrom()
        .select(PROFILE_DESIGNER_SELECT)
        .order("created_at", { ascending: false })
        .limit(DESIGNERS_PAGE);
      if (error && (isSchemaMismatchError(error) || isOptionalQueryError(error))) {
        const retry = await profilesPublicFrom()
          .select(PROFILE_DESIGNER_SELECT_NO_ACTIVE)
          .order("created_at", { ascending: false })
          .limit(DESIGNERS_PAGE);
        profiles = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      const list = profiles ?? [];
      const ids = list.map((p) => profileUserId(p as { user_id?: string; id?: string }));
      if (!ids.length) return [];

      // Hard cap so one prolific owner cannot pull unbounded rows for this feed.
      const projectCap = Math.min(ids.length * PROJECTS_PER_DESIGNER, DESIGNERS_PAGE * PROJECTS_PER_DESIGNER);
      const [projectsRes, countRes, servicesRes] = await Promise.all([
        supabase
          .from("projects")
          .select(PROJECT_FEED_SELECT)
          .in("owner_id", ids)
          .eq("status", "Published")
          .order("created_at", { ascending: false })
          .limit(projectCap),
        supabase.from("projects").select("owner_id").in("owner_id", ids).eq("status", "Published"),
        fromCreatorServices().select("owner_id").in("owner_id", ids).eq("status", "Published"),
      ]);

      const grouped = new Map<string, Tables<"projects">[]>();
      (projectsRes.data ?? []).forEach((p) => {
        const arr = grouped.get(p.owner_id) ?? [];
        if (arr.length < PROJECTS_PER_DESIGNER) arr.push(p as Tables<"projects">);
        grouped.set(p.owner_id, arr);
      });

      const projectCountByOwner = new Map<string, number>();
      for (const row of countRes.data ?? []) {
        const oid = (row as { owner_id: string }).owner_id;
        projectCountByOwner.set(oid, (projectCountByOwner.get(oid) ?? 0) + 1);
      }

      const packageCountByOwner = new Map<string, number>();
      if (!isOptionalQueryError(servicesRes.error) && !isSchemaMismatchError(servicesRes.error)) {
        for (const row of servicesRes.data ?? []) {
          const oid = (row as { owner_id?: string }).owner_id;
          if (!oid) continue;
          packageCountByOwner.set(oid, (packageCountByOwner.get(oid) ?? 0) + 1);
        }
      }

      return list
        .map((profile) => {
          const pid = profileUserId(profile as { user_id?: string; id?: string });
          const ownerProjects = grouped.get(pid) ?? [];
          const place = displayProfileAddress(
            (profile as { profile_address?: unknown }).profile_address,
            (profile as { location?: string | null }).location,
            "short",
          );
          const parts: string[] = [
            profile.display_name ?? "",
            profile.username ?? "",
            profile.role ?? "",
            profile.bio ?? "",
            (profile.skills ?? []).join(" "),
            place,
            ownerProjects.map((p) => p.title).join(" "),
            ownerProjects.map((p) => p.category ?? "").join(" "),
            ownerProjects.flatMap((p) => p.tools ?? []).join(" "),
            ownerProjects.flatMap((p) => p.tags ?? []).join(" "),
          ];
          return {
            profile: profile as Tables<"profiles">,
            projects: ownerProjects,
            searchHaystack: parts.join(" ").toLowerCase(),
            projectCount: projectCountByOwner.get(pid) ?? ownerProjects.length,
            packageCount: packageCountByOwner.get(pid) ?? 0,
            hasService: (packageCountByOwner.get(pid) ?? 0) > 0,
          };
        })
        .filter((d) => d.projects.length > 0);
    },
  });
