import { HELP_FAQ } from "@/data/helpCenter";
import { canonicalUrl, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/siteUrl";

export function truncateDescription(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Page title with brand suffix — omit suffix when title already includes site name. */
export function buildPageTitle(pageTitle: string): string {
  if (/So1o/i.test(pageTitle)) return pageTitle;
  return `${pageTitle} | ${SITE_NAME}`;
}

export type PublicPageHeadOptions = {
  /** Short page title (brand suffix added automatically). */
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
  image?: string;
  robots?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

/** TanStack Router `head()` payload for indexable public pages. */
export function buildPublicPageHead({
  title,
  description,
  path,
  ogType = "website",
  image = DEFAULT_OG_IMAGE,
  robots = "index,follow",
  jsonLd,
}: PublicPageHeadOptions) {
  const fullTitle = buildPageTitle(title);
  const desc = truncateDescription(description);
  const url = canonicalUrl(path);

  const meta = [
    { title: fullTitle },
    { name: "description", content: desc },
    { name: "robots", content: robots },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: desc },
    { property: "og:url", content: url },
    { property: "og:type", content: ogType },
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: desc },
    { name: "twitter:image", content: image },
  ];

  const links = [{ rel: "canonical", href: url }];

  if (!jsonLd) return { meta, links };

  const graph = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return {
    meta,
    links,
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }),
      },
    ],
  };
}

export function buildHelpCenterJsonLd() {
  return [
    {
      "@type": "WebPage",
      name: "ศูนย์ช่วยเหลือ So1o Freelancer",
      url: canonicalUrl("/help"),
      inLanguage: "th-TH",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: `${SITE_URL}/` },
    },
    {
      "@type": "FAQPage",
      mainEntity: HELP_FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];
}

export function buildHelpGuideJsonLd(path: string, name: string, description: string) {
  return {
    "@type": "TechArticle",
    headline: name,
    description: truncateDescription(description),
    url: canonicalUrl(path),
    inLanguage: "th-TH",
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` },
    isPartOf: { "@type": "WebPage", name: "ศูนย์ช่วยเหลือ", url: canonicalUrl("/help") },
  };
}
