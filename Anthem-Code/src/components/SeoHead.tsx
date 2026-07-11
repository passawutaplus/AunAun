import { useEffect } from "react";
import {
  absoluteUrl,
  buildTitle,
  canonicalPath,
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  truncateDescription,
  type SeoProps,
} from "@/lib/seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seoSchemas";

const META_IDS = {
  description: "seo-description",
  robots: "seo-robots",
  ogTitle: "seo-og-title",
  ogDesc: "seo-og-description",
  ogImage: "seo-og-image",
  ogUrl: "seo-og-url",
  ogType: "seo-og-type",
  ogLocale: "seo-og-locale",
  twCard: "seo-tw-card",
  twTitle: "seo-tw-title",
  twDesc: "seo-tw-description",
  twImage: "seo-tw-image",
} as const;

function upsertMeta(id: string, attr: "name" | "property", key: string, content: string) {
  let el = (
    document.getElementById(id)
    ?? document.head.querySelector(`meta[${attr}="${key}"]`)
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.id = id;
  document.head
    .querySelectorAll<HTMLMetaElement>(`meta[${attr}="${key}"]`)
    .forEach((meta) => meta.setAttribute("content", content));
}

function upsertCanonical(id: string, href: string) {
  let el = (
    document.getElementById(id)
    ?? document.head.querySelector('link[rel="canonical"]')
  ) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.id = id;
  document.head
    .querySelectorAll<HTMLLinkElement>('link[rel="canonical"]')
    .forEach((link) => {
      link.href = href;
    });
}

function upsertJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

/**
 * Updates document title and meta tags for SPA SEO / social sharing.
 * Canonical always uses a query-stripped path.
 */
const SeoHead = ({
  title,
  description,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  jsonLd,
}: SeoProps) => {
  useEffect(() => {
    const fullTitle = buildTitle(title);
    const desc = truncateDescription(description ?? SITE_DESCRIPTION);
    const cleanPath = canonicalPath(path);
    const url = absoluteUrl(cleanPath);
    const img = image.startsWith("http") ? image : absoluteUrl(image);

    document.title = fullTitle;
    document.documentElement.lang = "th";

    upsertMeta(META_IDS.description, "name", "description", desc);
    upsertMeta(META_IDS.robots, "name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    upsertMeta(META_IDS.ogTitle, "property", "og:title", fullTitle);
    upsertMeta(META_IDS.ogDesc, "property", "og:description", desc);
    upsertMeta(META_IDS.ogImage, "property", "og:image", img);
    upsertMeta(META_IDS.ogUrl, "property", "og:url", url);
    upsertMeta(META_IDS.ogType, "property", "og:type", type);
    upsertMeta(META_IDS.ogLocale, "property", "og:locale", "th_TH");
    upsertMeta(META_IDS.twCard, "name", "twitter:card", "summary_large_image");
    upsertMeta(META_IDS.twTitle, "name", "twitter:title", fullTitle);
    upsertMeta(META_IDS.twDesc, "name", "twitter:description", desc);
    upsertMeta(META_IDS.twImage, "name", "twitter:image", img);
    upsertCanonical("seo-canonical", url);

    if (jsonLd) {
      upsertJsonLd("seo-jsonld", jsonLd);
    } else if (cleanPath === "/") {
      upsertJsonLd("seo-jsonld", [websiteJsonLd(), organizationJsonLd()]);
    } else {
      removeJsonLd("seo-jsonld");
    }

    return () => {
      // Keep tags — next page SeoHead overwrites
    };
  }, [title, description, path, image, type, noindex, jsonLd]);

  return null;
};

export default SeoHead;

// Re-export for convenience in tests
export { SITE_NAME };
