/**
 * Cross-link helper for the So1o ↔ Aplus1 ecosystem.
 */
import { supabase } from "@/integrations/supabase/client";
import { APLUS1_SHOWCASE_URL } from "@/lib/productLinks";
import { todayISO } from "@/lib/dailySeedPick";

export type CrossLinkContext = {
  source: string;
  refId?: string;
  meta?: Record<string, string | number | undefined>;
};

/**
 * Build an Aplus1 URL with cross-link query params.
 */
export function aplus1Url(path: string, params: Record<string, string | undefined> = {}): string {
  const base = APLUS1_SHOWCASE_URL.replace(/\/$/, "");
  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);
  url.searchParams.set("from", "so1o");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}

/** @deprecated use aplus1Url */
export const anthemUrl = aplus1Url;

/** Deep-link to Aplus1 portfolio editor with So1o job context. */
export function aplus1PortfolioNewUrl(params: {
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

  return aplus1Url("/portfolio/new", {
    title: params.jobTitle.slice(0, 120),
    client: params.clientName?.trim().slice(0, 80),
    job_id: params.jobId,
    link_id: params.linkId,
    cover: safeCover,
    tags: tagParam,
  });
}

/** @deprecated use aplus1PortfolioNewUrl */
export const anthemPortfolioNewUrl = aplus1PortfolioNewUrl;

/** Deep-link to Aplus1 portfolio editor with So1o Design Drill context. */
export function aplus1DesignDrillUrl(params: {
  brief: string;
  description: string;
  aplus1Category: string;
  /** @deprecated use aplus1Category */
  anthemCategory?: string;
  tags?: string[];
  coverUrl?: string;
  drillType?: "daily" | "custom";
  drillDate?: string;
}): string {
  const category = params.aplus1Category ?? params.anthemCategory ?? "";
  const tagParam = params.tags?.length
    ? params.tags
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8)
        .join(",")
    : undefined;

  return aplus1Url("/portfolio/new", {
    title: params.brief.slice(0, 120),
    description: params.description.slice(0, 4000),
    category,
    tags: tagParam,
    drill_type: params.drillType,
    drill_date: params.drillDate ?? (params.drillType === "daily" ? todayISO() : undefined),
    cover: params.coverUrl?.trim().startsWith("https://")
      ? params.coverUrl.trim().slice(0, 512)
      : undefined,
  });
}

/** @deprecated use aplus1DesignDrillUrl */
export const anthemDesignDrillUrl = aplus1DesignDrillUrl;

/** Public drill gallery on Aplus1. */
export function aplus1DrillGalleryUrl(date?: string): string {
  const base = APLUS1_SHOWCASE_URL.replace(/\/$/, "");
  const url = new URL("/drill", base);
  if (date) url.searchParams.set("date", date);
  return url.toString();
}

/** @deprecated use aplus1DrillGalleryUrl */
export const anthemDrillGalleryUrl = aplus1DrillGalleryUrl;

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
