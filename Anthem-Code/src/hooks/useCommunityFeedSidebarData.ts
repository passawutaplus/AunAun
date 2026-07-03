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
export type CommunityProfileStats = { posts: number; followers: number; following: number };

type CountQueryResult = { count: number | null; error: unknown };
type CountQuery = PromiseLike<CountQueryResult> & {
  eq: (column: string, value: string) => CountQuery;
};
type CommunityTagRow = { tags: string[] | null };
type CommunityTagQuery = PromiseLike<{ data: CommunityTagRow[] | null; error: unknown }> & {
  eq: (column: string, value: string) => CommunityTagQuery;
  order: (column: string, options: { ascending: boolean }) => CommunityTagQuery;
  limit: (count: number) => CommunityTagQuery;
};
type CommunityPostsTable = {
  select: {
    (columns: "id", options: { count: "exact"; head: true }): CountQuery;
    (columns: "tags"): CommunityTagQuery;
  };
};
const communityPostsTable = () =>
  (supabase as unknown as { from: (table: "community_posts") => CommunityPostsTable }).from(
    "community_posts",
  );

export function getDesignerProfileUserId(profile: DesignerCardData["profile"]): string {
  return (profile as { user_id?: string; id?: string }).user_id ?? profile.id;
}

export function useCommunityProfileStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["community-profile-stats", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<CommunityProfileStats> => {
      const [posts, followers, following] = await Promise.all([
        communityPostsTable()
          .select("id", { count: "exact", head: true })
          .eq("author_id", userId!)
          .eq("status", "published"),
        supabase
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", userId!),
        supabase
          .from("follows")
          .select("following_id", { count: "exact", head: true })
          .eq("follower_id", userId!),
      ]);

      if (posts.error) throw posts.error;
      if (followers.error) throw followers.error;
      if (following.error) throw following.error;

      return {
        posts: posts.count ?? 0,
        followers: followers.count ?? 0,
        following: following.count ?? 0,
      };
    },
  });
}

export function useCommunityTrendingTags(limit = 5) {
  return useQuery({
    queryKey: ["community-trending-tags", limit],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TrendingTag[]> => {
      const { data, error } = await communityPostsTable()
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
    project_tags: (myProjects ?? []).flatMap((p) => p.tags ?? []),
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
  myProjects: ReturnType<typeof useMyProjects>["data"],
): number {
  const pid = getDesignerProfileUserId(item.profile);
  if (!pid || pid === viewerId) return -1;

  const candidate = buildCandidateMatchInput(profile, myProjects);
  let score = item.projects.length * 4;

  const viewerSkills = new Set(candidate.skills.map((s) => s.toLowerCase()));
  const designerSkills = item.profile.skills ?? [];
  for (const skill of designerSkills) {
    if (viewerSkills.has(skill.toLowerCase())) score += 10;
  }

  if (profile?.role && item.profile.role && profile.role === item.profile.role) {
    score += 12;
  }

  const viewerCats = new Set(
    [...candidate.preferred_categories, ...candidate.project_categories]
      .filter(Boolean)
      .map((c) => c.toLowerCase()),
  );
  const viewerTools = new Set(candidate.project_tools.map((t) => t.toLowerCase()));
  const viewerTags = new Set(candidate.project_tags.map((t) => t.toLowerCase()));

  for (const project of item.projects) {
    const cat = project.category?.toLowerCase();
    if (cat && viewerCats.has(cat)) score += 8;
    for (const tool of project.tools ?? []) {
      if (viewerTools.has(tool.toLowerCase())) score += 6;
    }
    for (const tag of project.tags ?? []) {
      if (viewerTags.has(tag.toLowerCase())) score += 5;
    }
    score += Math.min((project.likes ?? 0) / 10, 4);
    score += Math.min((project.views ?? 0) / 100, 3);
  }

  if (profile?.location && item.profile.location && profile.location === item.profile.location) {
    score += 3;
  }
  if (item.profile.avatar_url) score += 1;
  if (item.profile.bio) score += 1;

  return score;
}

export function useSuggestedFeedDesigners(limit = 3) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const { data: designers = [], isLoading } = useDesigners();

  const suggested = useMemo(() => {
    return designers
      .map((d) => ({ designer: d, score: scoreDesigner(d, user?.id, profile, myProjects) }))
      .filter((row) => row.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((row) => row.designer);
  }, [designers, myProjects, profile, user?.id, limit]);

  return { designers: suggested, isLoading };
}
