import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_CATEGORIES, normalizeProjectCategory, type ProjectCategory } from "@/data/projectTypes";
import { FEED_INTEREST_OPTIONS } from "@/data/feedInterestOptions";
import { demoImageUrl } from "@/lib/demoImages";

const TOP_PER_CATEGORY = 12;
const FETCH_LIMIT = 400;

type CoverRow = {
  category: string | null;
  cover_url: string | null;
  gallery_urls: string[] | null;
  views: number | null;
};

function thumbFromRow(row: CoverRow): string | null {
  const cover = row.cover_url?.trim();
  if (cover) return cover;
  const gallery = row.gallery_urls?.find((u) => typeof u === "string" && u.trim());
  return gallery?.trim() || null;
}

/** Weighted pick: higher-view ranks (earlier in list) get more chance. */
function pickWeighted(urls: string[]): string | null {
  if (urls.length === 0) return null;
  if (urls.length === 1) return urls[0];
  let total = 0;
  const weights = urls.map((_, i) => {
    const w = urls.length - i;
    total += w;
    return w;
  });
  let roll = Math.random() * total;
  for (let i = 0; i < urls.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return urls[i]!;
  }
  return urls[0]!;
}

export function buildInterestCoverMap(rows: CoverRow[]): Record<ProjectCategory, string[]> {
  const buckets: Record<string, string[]> = {};
  for (const cat of PROJECT_CATEGORIES) buckets[cat] = [];

  for (const row of rows) {
    const cat = normalizeProjectCategory(row.category ?? "") ?? null;
    if (!cat) continue;
    const url = thumbFromRow(row);
    if (!url) continue;
    const list = buckets[cat];
    if (!list || list.length >= TOP_PER_CATEGORY) continue;
    if (list.includes(url)) continue;
    list.push(url);
  }

  return buckets as Record<ProjectCategory, string[]>;
}

export function useInterestCategoryCovers(enabled = true) {
  const query = useQuery({
    queryKey: ["interest-survey-category-covers"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("category, cover_url, gallery_urls, views")
        .eq("status", "Published")
        .order("views", { ascending: false })
        .limit(FETCH_LIMIT);
      if (error) throw error;
      return buildInterestCoverMap((data ?? []) as CoverRow[]);
    },
  });

  const options = useMemo(() => {
    const map = query.data;
    return FEED_INTEREST_OPTIONS.map((opt, i) => {
      const pool = map?.[opt.id] ?? [];
      const live = pickWeighted(pool);
      return {
        id: opt.id,
        label: opt.label,
        subtitle: opt.subtitle,
        imageUrl: live || opt.imageUrl || demoImageUrl(i * 2),
      };
    });
  }, [query.data]);

  return {
    options,
    isLoading: query.isLoading,
  };
}
