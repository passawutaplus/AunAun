import { useEffect, useRef } from "react";
import type { WorkOwner, WorkRow } from "@/server/queries/work";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, absoluteUrl, canonicalPath, truncateDescription } from "@/lib/seo";
import { indexableBySearch } from "./visibility";

/**
 * Title, description, canonical, Open Graph, robots and JSON-LD of a page of the new design (people and
 * crawlers that run JavaScript; other bots get api/seo-preview.js). Unlike components/SeoHead, a page's
 * tags go away when it closes, so the next page never shows the previous one's.
 *
 * Pages stack: a work open over the home page is on top, and the home page's tags come back when it closes.
 * Writes happen after the commit's other effects (a microtask), so the page on top always wins, whatever
 * order the page's own effects (useNoIndex, document.title) run in.
 */
export type PageSeo = {
  /** Page part of the title ("Help" → "Help | samecor."). Empty: the home page title. */
  title?: string;
  description?: string;
  /** Canonical path; the query is dropped. Default: the current path. */
  path?: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
};

export const HOME_TITLE = `${SITE_NAME} — You Create. We Connect.`;
export const pageTitle = (title?: string) => (title ? `${title} | samecor.` : HOME_TITLE);

const JSONLD_ID = "sc-seo-jsonld";
/** components/SeoHead's JSON-LD: left over from an old page, it would describe the wrong thing. */
const OLD_JSONLD_ID = "seo-jsonld";

type Entry = { seo: PageSeo };
const stack: Entry[] = [];
let queued = false;

function setMeta(attr: "name" | "property", key: string, content: string) {
  const all = document.head.querySelectorAll<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (all.length) all.forEach((m) => m.setAttribute("content", content));
  else {
    const m = document.createElement("meta");
    m.setAttribute(attr, key);
    m.setAttribute("content", content);
    document.head.appendChild(m);
  }
}

function setCanonical(href: string) {
  const all = document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]');
  if (all.length) all.forEach((l) => (l.href = href));
  else {
    const l = document.createElement("link");
    l.rel = "canonical";
    l.href = href;
    document.head.appendChild(l);
  }
}

function setJsonLd(data: PageSeo["jsonLd"]) {
  document.getElementById(OLD_JSONLD_ID)?.remove();
  let el = document.getElementById(JSONLD_ID) as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.id = JSONLD_ID;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  // One top-level object with @context (in-app browsers crash on a top-level array — see SeoHead).
  el.textContent = JSON.stringify(Array.isArray(data) ? { "@context": "https://schema.org", "@graph": data } : { "@context": "https://schema.org", ...data });
}

function write(seo: PageSeo) {
  const title = pageTitle(seo.title);
  const desc = truncateDescription(seo.description?.trim() || SITE_DESCRIPTION);
  const url = absoluteUrl(canonicalPath(seo.path ?? window.location.pathname));
  const raw = seo.image || DEFAULT_OG_IMAGE;
  const image = /^https?:\/\//.test(raw) ? raw : absoluteUrl(raw);
  document.title = title;
  setMeta("name", "description", desc);
  setMeta("name", "robots", seo.noindex ? "noindex, nofollow, noai, noimageai" : "index, follow, noai, noimageai");
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", desc);
  setMeta("property", "og:image", image);
  setMeta("property", "og:image:alt", title);
  setMeta("property", "og:url", url);
  setMeta("property", "og:type", seo.type ?? "website");
  setMeta("property", "og:site_name", SITE_NAME);
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", desc);
  setMeta("name", "twitter:image", image);
  setCanonical(url);
  setJsonLd(seo.jsonLd ?? null);
}

function flushSoon() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    const top = stack[stack.length - 1];
    if (top) write(top.seo);
  });
}

/** Sets the page's tags while it is open; the last page opened (and still open) wins. */
export function usePageSeo(seo: PageSeo) {
  const entry = useRef<Entry | null>(null);
  if (!entry.current) entry.current = { seo };
  const key = JSON.stringify(seo);

  useEffect(() => {
    const e = entry.current!;
    stack.push(e);
    flushSoon();
    return () => {
      const i = stack.indexOf(e);
      if (i >= 0) stack.splice(i, 1);
      // Nothing of the new design left: site defaults now, before the next page's own tags (SeoHead) are set.
      if (!stack.length) write({});
      else flushSoon();
    };
  }, []);

  useEffect(() => {
    entry.current!.seo = JSON.parse(key) as PageSeo;
    flushSoon();
  }, [key]);
}

/** Work page (`/showcase/:id`, also over the home page): same words as the bots' version. */
export function workSeo(id: string, row: WorkRow | null | undefined, who: WorkOwner | null | undefined): PageSeo {
  if (!row) return { title: "Showcase", path: `/showcase/${id}`, noindex: true };
  const name = row.title?.trim() || "Untitled";
  const artist = who?.display_name?.trim() || who?.username || "";
  const desc = (row.description ?? "").replace(/\s+/g, " ").trim();
  const cover = row.cover_url || row.gallery_urls?.[0] || "";
  const url = absoluteUrl(`/showcase/${id}`);
  const author = who ? { "@type": "Person", name: artist, url: absoluteUrl(who.username ? `/@${who.username}` : `/u/${who.user_id}`) } : undefined;
  const keywords = [...(row.tags ?? []), ...(row.tools ?? [])].filter(Boolean);
  return {
    title: artist ? `${name} — ${artist}` : name,
    description: desc || (artist ? `${name} โดย ${artist} บน SAMECOR` : name),
    path: `/showcase/${id}`,
    image: cover || null,
    type: "article",
    noindex: row.status !== "Published" || (!!who && !indexableBySearch(who.public_visibility)),
    jsonLd: {
      "@type": "CreativeWork",
      name,
      url,
      ...(cover ? { image: cover } : {}),
      ...(desc ? { description: desc.slice(0, 300) } : {}),
      ...(row.created_at ? { datePublished: row.created_at } : {}),
      ...(keywords.length ? { keywords: keywords.join(", ") } : {}),
      ...(author ? { author } : {}),
      publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
      mainEntityOfPage: url,
    },
  };
}

/** Similar pictures of a work: a page made from another one, never indexed (bots get a 404 there). */
export function similarSeo(row: WorkRow | null | undefined): PageSeo {
  const name = row?.title?.trim();
  return { title: name ? `ภาพคล้าย ${name}` : "ภาพคล้าย", noindex: true };
}
