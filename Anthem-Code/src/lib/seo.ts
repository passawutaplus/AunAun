import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_TAGLINE,
  defaultSiteUrl,
  APLUS1_PRODUCTION_URL,
} from "@/lib/brandConfig";

/** Site-wide SEO defaults — override per page with SeoHead. */
export const SITE_NAME = BRAND_NAME;
export const SITE_TAGLINE = BRAND_TAGLINE;
export const SITE_DESCRIPTION = BRAND_DESCRIPTION;

export const DEFAULT_OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/19f990d1-3bf3-4ccc-9dce-de3649dc4fc6/id-preview-4b822f2c--d689aa9c-465b-4db9-bfc2-8597a23157e5.lovable.app-1777871436940.png";

/** Query keys that should not be indexed as unique URLs. */
export const NOINDEX_QUERY_KEYS = [
  "q",
  "search",
  "query",
  "sort",
  "filter",
  "with",
  "page",
  "feed",
  "tag",
  "drill",
  "hire",
  "apply",
  "tab",
  "preview",
] as const;

export function siteUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return defaultSiteUrl();
}

export function absoluteUrl(path: string): string {
  const base = siteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Strip query/hash — canonical paths must be clean. */
export function canonicalPath(path: string): string {
  const raw = path.trim() || "/";
  try {
    if (raw.startsWith("http")) {
      const u = new URL(raw);
      return u.pathname || "/";
    }
  } catch {
    /* fall through */
  }
  const noHash = raw.split("#")[0] ?? raw;
  const noQuery = noHash.split("?")[0] ?? noHash;
  const normalized = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  return normalized.replace(/\/{2,}/g, "/") || "/";
}

export function truncateDescription(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function buildTitle(pageTitle?: string): string {
  if (!pageTitle) return `${SITE_NAME} — ${SITE_TAGLINE}`;
  return `${pageTitle} | ${SITE_NAME}`;
}

/** True when URL search params should not create an indexed variant. */
export function shouldNoindexSearchParams(
  params: URLSearchParams | Record<string, string> | string,
): boolean {
  const sp =
    typeof params === "string"
      ? new URLSearchParams(params)
      : params instanceof URLSearchParams
        ? params
        : new URLSearchParams(params);
  for (const key of NOINDEX_QUERY_KEYS) {
    const v = sp.get(key);
    if (v != null && v !== "") return true;
  }
  return false;
}

/** Thin / empty public profiles should not be indexed. */
export function isThinProfile(opts: {
  bio?: string | null;
  projectCount: number;
  displayName?: string | null;
}): boolean {
  const bio = (opts.bio ?? "").trim();
  if (opts.projectCount <= 0 && bio.length < 40) return true;
  return false;
}

export function productionSiteUrl(): string {
  return APLUS1_PRODUCTION_URL.replace(/\/$/, "");
}
