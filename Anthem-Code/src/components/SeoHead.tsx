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
import { tr, useLang, type Entry, type Lang } from "@/lib/i18n";

const META_IDS = {
  description: "seo-description",
  robots: "seo-robots",
  ogTitle: "seo-og-title",
  ogDesc: "seo-og-description",
  ogImage: "seo-og-image",
  ogUrl: "seo-og-url",
  ogType: "seo-og-type",
  ogLocale: "seo-og-locale",
  ogSiteName: "seo-og-site-name",
  ogImageAlt: "seo-og-image-alt",
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
  // Always one top-level object with @context: in-app browsers read data["@context"] and crash on an array
  // (Sentry: undefined is not an object (evaluating 'r["@context"].toLowerCase')).
  const doc = Array.isArray(data) ? { "@context": "https://schema.org", "@graph": data } : { "@context": "https://schema.org", ...data };
  el.textContent = JSON.stringify(doc);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

/**
 * Updates document title and meta tags for SPA SEO / social sharing.
 * Canonical always uses a query-stripped path.
 */
/** Plain text passes through; an i18n entry is read in the UI language. */
function textIn(value: string | Entry | undefined, lang: Lang): string | undefined {
  if (typeof value === "string" || !value) return value as string | undefined;
  return tr(value, undefined, lang);
}

const SeoHead = ({
  title: titleProp,
  description: descriptionProp,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  jsonLd,
}: SeoProps) => {
  const lang = useLang();
  const title = textIn(titleProp, lang);
  const description = textIn(descriptionProp, lang);

  useEffect(() => {
    const fullTitle = buildTitle(title);
    const desc = truncateDescription(description ?? SITE_DESCRIPTION);
    const cleanPath = canonicalPath(path);
    const url = absoluteUrl(cleanPath);
    const img = image.startsWith("http") ? image : absoluteUrl(image);

    document.title = fullTitle;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;

    upsertMeta(META_IDS.description, "name", "description", desc);
    upsertMeta(META_IDS.robots, "name", "robots", noindex ? "noindex, nofollow, noai, noimageai" : "index, follow, noai, noimageai");
    upsertMeta(META_IDS.ogTitle, "property", "og:title", fullTitle);
    upsertMeta(META_IDS.ogDesc, "property", "og:description", desc);
    upsertMeta(META_IDS.ogImage, "property", "og:image", img);
    upsertMeta(META_IDS.ogImageAlt, "property", "og:image:alt", fullTitle);
    upsertMeta(META_IDS.ogUrl, "property", "og:url", url);
    upsertMeta(META_IDS.ogType, "property", "og:type", type);
    upsertMeta(META_IDS.ogLocale, "property", "og:locale", "th_TH");
    upsertMeta(META_IDS.ogSiteName, "property", "og:site_name", SITE_NAME);
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
  }, [title, description, path, image, type, noindex, jsonLd, lang]);

  return null;
};

export default SeoHead;

// Re-export for convenience in tests
export { SITE_NAME };
