import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDesigners } from "@/hooks/useDesigners";
import {
  heroPickSeed,
  pickFromTopByViews,
  projectCoverUrl,
  type HeroSpotlightSlide,
} from "@/lib/heroSpotlight";

const MAX_SLIDES = 8;

export function useDesignerHeroSlides() {
  const { data: designers = [], isLoading } = useDesigners();

  const slides = useMemo((): HeroSpotlightSlide[] => {
    const out: HeroSpotlightSlide[] = [];
    for (const { profile, projects } of designers) {
      if (out.length >= MAX_SLIDES) break;
      const pid = (profile as { user_id?: string }).user_id ?? profile.id;
      const pick = pickFromTopByViews(projects, heroPickSeed(pid));
      if (!pick) continue;
      const cover = projectCoverUrl(pick);
      if (!cover) continue;
      out.push({
        id: pid,
        name: profile.display_name ?? profile.username ?? "ดีไซเนอร์",
        backgroundCover: cover,
        avatarUrl: profile.avatar_url ?? null,
        profileHref: `/u/${pid}`,
        projectHref: `/project/${pick.id}`,
        projectTitle: pick.title,
      });
    }
    return out;
  }, [designers]);

  return { slides, isLoading };
}

export function useStudioHeroSlides() {
  return useQuery({
    queryKey: ["hero-studio-slides"],
    queryFn: async (): Promise<HeroSpotlightSlide[]> => {
      const { data: studios, error } = await supabase
        .from("studios")
        .select("id, name, slug, avatar_url")
        .order("member_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(32);
      if (error) throw error;
      const list = studios ?? [];
      if (!list.length) return [];

      const studioIds = list.map((s) => s.id);
      const { data: projects, error: pErr } = await supabase
        .from("projects")
        .select("id, title, cover_url, gallery_urls, studio_id, views")
        .in("studio_id", studioIds)
        .eq("status", "Published");
      if (pErr) throw pErr;

      const grouped = new Map<string, typeof projects>();
      (projects ?? []).forEach((p) => {
        if (!p.studio_id) return;
        const arr = grouped.get(p.studio_id) ?? [];
        arr.push(p);
        grouped.set(p.studio_id, arr);
      });

      const slides: HeroSpotlightSlide[] = [];
      for (const studio of list) {
        if (slides.length >= MAX_SLIDES) break;
        const studioProjects = grouped.get(studio.id) ?? [];
        const pick = pickFromTopByViews(studioProjects, heroPickSeed(studio.id));
        if (!pick) continue;
        const cover = projectCoverUrl(pick);
        if (!cover) continue;
        slides.push({
          id: studio.id,
          name: studio.name,
          backgroundCover: cover,
          avatarUrl: studio.avatar_url ?? null,
          profileHref: `/s/${studio.slug}`,
          projectHref: `/project/${pick.id}`,
          projectTitle: pick.title,
        });
      }
      return slides;
    },
  });
}
