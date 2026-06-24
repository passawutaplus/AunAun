/**
 * Cross-link helper for the So1o ↔ Anthem ecosystem.
 */
import { supabase } from "@/integrations/supabase/client";
import { ANTHEM_SHOWCASE_URL } from "@/lib/productLinks";
import { todayISO } from "@/lib/dailySeedPick";

export type CrossLinkContext = {
  source: string;
  refId?: string;
  meta?: Record<string, string | number | undefined>;
};

/**
 * Build an Anthem URL with cross-link query params.
 */
export function anthemUrl(path: string, params: Record<string, string | undefined> = {}): string {
  const base = ANTHEM_SHOWCASE_URL.replace(/\/$/, "");
  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);
  url.searchParams.set("from", "so1o");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}

/** Deep-link to Anthem portfolio editor with So1o job context. */
export function anthemPortfolioNewUrl(params: {
  jobTitle: string;
  clientName?: string | null;
  jobId?: string;
  linkId?: string;
  coverUrl?: string;
  tags?: string[];
}): string {
  const safeCover = params.coverUrl?.trim().startsWith("https://")
    ? params.coverUrl.trim().slice(0, 512)
    : undefined;
  const tagParam = params.tags?.length
    ? params.tags
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8)
        .join(",")
    : undefined;

  return anthemUrl("/portfolio/new", {
    title: params.jobTitle.slice(0, 120),
    client: params.clientName?.trim().slice(0, 80),
    job_id: params.jobId,
    link_id: params.linkId,
    cover: safeCover,
    tags: tagParam,
  });
}

/** Deep-link to an1hem portfolio editor with So1o Design Drill context. */
export function anthemDesignDrillUrl(params: {
  brief: string;
  description: string;
  anthemCategory: string;
  tags?: string[];
  coverUrl?: string;
  drillType?: "daily" | "custom";
  drillDate?: string;
}): string {
  const tagParam = params.tags?.length
    ? params.tags
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8)
        .join(",")
    : undefined;

  return anthemUrl("/portfolio/new", {
    title: params.brief.slice(0, 120),
    description: params.description.slice(0, 4000),
    category: params.anthemCategory,
    tags: tagParam,
    drill_type: params.drillType,
    drill_date: params.drillDate ?? (params.drillType === "daily" ? todayISO() : undefined),
    cover: params.coverUrl?.trim().startsWith("https://")
      ? params.coverUrl.trim().slice(0, 512)
      : undefined,
  });
}

/** Public drill gallery on Pixel100. */
export function anthemDrillGalleryUrl(date?: string): string {
  const base = ANTHEM_SHOWCASE_URL.replace(/\/$/, "");
  const url = new URL("/drill", base);
  if (date) url.searchParams.set("date", date);
  return url.toString();
}

/**
 * Log cross-app CTA to ecosystem_links. Never throws.
 */
export async function trackCrossLink(ctx: CrossLinkContext): Promise<string | undefined> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return undefined;

    const { data, error } = await supabase
      .from("ecosystem_links")
      .insert({
        user_id: userId,
        event_type: "cross_link_click",
        source_app: "so1o",
        source_page: ctx.source,
        ref_id: ctx.refId ?? null,
        meta: ctx.meta ?? {},
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[cross_link] insert failed", error.message);
      return undefined;
    }
    return data?.id as string | undefined;
  } catch {
    return undefined;
  }
}
