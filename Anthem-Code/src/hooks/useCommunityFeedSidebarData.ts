import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useDesigners, type DesignerCardData } from "@/hooks/useDesigners";
import { useOpenJobs, type JobPost } from "@/hooks/useJobs";
import { useJobMatchNotifications } from "@/hooks/useJobMatchNotifications";
import { scoreJobMatch } from "@/lib/jobMatchScore";
import { communityDisplayTags } from "@/lib/communityQaTag";

export type TrendingTag = { tag: string; count: number };

export function useCommunityTrendingTags(limit = 5) {
  return useQuery({
    queryKey: ["community-trending-tags", limit],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TrendingTag[]> => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("tags")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        for (const raw of communityDisplayTags(row.tags ?? [])) {
          const tag = raw.trim().replace(/^#+/, "");
          if (!tag) continue;
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }

      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));
    },
  });
}

function buildCandidateMatchInput(
  profile: ReturnType<typeof useProfile>["data"],
  myProjects: ReturnType<typeof useMyProjects>["data"],
) {
  return {
    skills: profile?.skills ?? [],
    role: profile?.role ?? null,
    location: profile?.location ?? null,
    preferred_categories:
      (profile as { preferred_categories?: string[] } | null | undefined)?.preferred_categories ?? [],
    preferred_employment_types:
      (profile as { preferred_employment_types?: string[] } | null | undefined)
        ?.preferred_employment_types ?? [],
    project_categories: (myProjects ?? []).map((p) => p.category).filter(Boolean) as string[],
    project_tools: (myProjects ?? []).flatMap((p) => p.tools ?? []),
  };
}

export function useFeedSidebarJobs(limit = 3) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const { data: matchNotifs = [] } = useJobMatchNotifications();
  const { data: openJobs = [], isLoading } = useOpenJobs({ limit: 40, postType: "hiring" });

  const jobs = useMemo((): JobPost[] => {
    if (!openJobs.length) return [];

    const matchByJobId = new Map(matchNotifs.map((m) => [m.job_id, m.match_score]));
    const candidate = profile ? buildCandidateMatchInput(profile, myProjects) : null;

    const scored = openJobs
      .filter((j) => j.posted_by !== user?.id)
      .map((job) => {
        const matchBoost = matchByJobId.get(job.id);
        if (matchBoost != null) {
          return { job, score: matchBoost + 100 };
        }
        if (!candidate) return { job, score: 0 };
        const { score } = scoreJobMatch(job, candidate);
        return { job, score };
      })
      .sort((a, b) => b.score - a.score || +new Date(b.job.created_at) - +new Date(a.job.created_at));

    const picked: JobPost[] = [];
    const seen = new Set<string>();
    for (const row of scored) {
      if (seen.has(row.job.id)) continue;
      seen.add(row.job.id);
      picked.push(row.job);
      if (picked.length >= limit) break;
    }
    return picked;
  }, [openJobs, matchNotifs, profile, myProjects, user?.id, limit]);

  return { jobs, isLoading };
}

function scoreDesigner(
  item: DesignerCardData,
  viewerId: string | undefined,
  profile: ReturnType<typeof useProfile>["data"],
): number {
  const pid = item.profile.user_id ?? item.profile.id;
  if (!pid || pid === viewerId) return -1;

  let score = item.projects.length * 2;
  const viewerSkills = new Set((profile?.skills ?? []).map((s) => s.toLowerCase()));
  const designerSkills = item.profile.skills ?? [];
  for (const skill of designerSkills) {
    if (viewerSkills.has(skill.toLowerCase())) score += 8;
  }
  if (profile?.role && item.profile.role && profile.role === item.profile.role) {
    score += 12;
  }
  const viewerCats = new Set(
    (profile as { preferred_categories?: string[] } | null)?.preferred_categories?.map((c) =>
      c.toLowerCase(),
    ) ?? [],
  );
  for (const project of item.projects) {
    const cat = project.category?.toLowerCase();
    if (cat && viewerCats.has(cat)) score += 6;
  }
  return score;
}

export function useSuggestedFeedDesigners(limit = 3) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: designers = [], isLoading } = useDesigners();

  const suggested = useMemo(() => {
    return designers
      .map((d) => ({ designer: d, score: scoreDesigner(d, user?.id, profile) }))
      .filter((row) => row.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((row) => row.designer);
  }, [designers, profile, user?.id, limit]);

  return { designers: suggested, isLoading };
}
