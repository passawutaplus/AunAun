import {
  flattenContentBlocks,
  mediaItemsFromBlocks,
  parseContentBlocks,
  resolveProjectCanvas,
} from "@/lib/projectContentBlocks";
import type { ShowcaseRow } from "@/server/queries/showcase";
import type { WorkRow } from "@/server/queries/work";

export type WorkMedia = {
  /** Stable key for React and for likes: the picture's URL as stored in the work. */
  url: string;
  kind: "image" | "video";
  poster?: string;
  /** width / height, or null when the size was never recorded. */
  ratio: number | null;
};

const okSize = (s: unknown): s is [number, number] =>
  Array.isArray(s) && s.length === 2 && s.every((n) => typeof n === "number" && n > 0);

/**
 * The pictures (and videos) of a work, top to bottom, the same ones the old page shows:
 * content blocks when they hold media, else gallery_urls. Text blocks are left out here (see workText).
 */
export function workMedia(row: Pick<WorkRow, "content_blocks" | "gallery_urls" | "video_urls" | "media_sizes" | "cover_url" | "cover_width" | "cover_height">): WorkMedia[] {
  const blocks = resolveProjectCanvas({
    content_blocks: row.content_blocks,
    description: null,
    gallery_urls: row.gallery_urls ?? [],
    video_urls: row.video_urls ?? [],
  });
  const blockSize = new Map<string, [number, number]>();
  for (const b of parseContentBlocks(row.content_blocks)) {
    const u = (b.url ?? "").trim();
    if (u && okSize(b.size)) blockSize.set(u, b.size);
  }
  const sizes = row.media_sizes ?? {};
  const seen = new Set<string>();
  const out: WorkMedia[] = [];
  for (const m of mediaItemsFromBlocks(blocks)) {
    if (seen.has(m.url)) continue;
    seen.add(m.url);
    const s = okSize(sizes[m.url])
      ? sizes[m.url]
      : blockSize.get(m.url) ??
        (m.url === row.cover_url && row.cover_width && row.cover_height ? [row.cover_width, row.cover_height] : null);
    out.push({
      url: m.url,
      kind: m.kind === "video" ? "video" : "image",
      ...(m.kind === "video" && m.posterUrl ? { poster: m.posterUrl } : {}),
      ratio: s ? s[0] / s[1] : null,
    });
  }
  return out;
}

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** The old editor stored rich text as HTML (<p>, <div style>, <b>…): keep the words and the line breaks only. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** True when the blocks come from the new editor (upload/model.ts): the Work page then shows them like Upload's Preview. */
export function isScContent(raw: unknown): boolean {
  return Array.isArray(raw) && raw.some((b) => !!b && typeof b === "object" && ((b as Record<string, unknown>).type === "sc_layout" || "scStyle" in (b as object)));
}

const sameLine = (s: string) => s.replace(/\s+/g, " ").trim().toLocaleLowerCase("th");

/**
 * The words of a work: its description, then the text of its old text blocks (owner decision
 * 2026-11-28: the Work page shows only pictures in the body, so block text goes under the description).
 * Lines the description already has are not repeated.
 */
export function workText(row: Pick<WorkRow, "description" | "content_blocks">): string {
  const desc = htmlToText(row.description ?? "");
  // Works from the new editor show their texts in place (WorkBody), so only the description goes here.
  if (isScContent(row.content_blocks)) return desc;
  const known = new Set(desc.split("\n").map(sameLine).filter(Boolean));
  const blocks = htmlToText(flattenContentBlocks(parseContentBlocks(row.content_blocks)))
    .split("\n")
    .filter((line) => !line || !known.has(sameLine(line)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return [desc, blocks].filter(Boolean).join("\n\n");
}

/** 860 → "860", 1200 → "1.2K", 2000 → "2K" (mock). */
export function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n);
}

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** "5 Jun 2026 · 1,240 views" (mock). */
export function workDateLine(createdAt: string, views: number | null): string {
  const d = new Date(createdAt);
  const date = Number.isNaN(d.getTime()) ? "" : DATE.format(d);
  const v = `${(views ?? 0).toLocaleString("en-US")} views`;
  return date ? `${date} · ${v}` : v;
}

/**
 * The licence line. The mock only has "All rights reserved"; the two other licences of the old
 * site have no wording in the new design yet (question for Beam), so they show no line for now.
 */
/** Owner 2026-11-28 (Beam 25): the two other rights of works today get Thai words. */
const LICENCE_WORDS: Record<string, string> = {
  all_rights: "All rights reserved",
  attribution_ok: "ใช้ได้ถ้าให้เครดิต",
  portfolio_only: "ดูได้อย่างเดียว",
};

export function licenceLine(type: string | null, handle: string): string | null {
  const words = LICENCE_WORDS[type ?? "all_rights"];
  return words ? `${words} · © ${handle}` : null;
}

/** Mock: same CATEGORY from other people first, then other works; never the current owner's. */
export function pickSimilar(works: readonly ShowcaseRow[], current: { id: string; owner_id: string | null; sc_category: string | null }, n = 4): ShowcaseRow[] {
  const others = works.filter((w) => w.id !== current.id && w.owner_id !== current.owner_id);
  const same = current.sc_category ? others.filter((w) => w.sc_category === current.sc_category) : [];
  const rest = others.filter((w) => !same.includes(w));
  return [...same, ...rest].slice(0, n);
}

/** ‹ › go round the list; `null` when the work is not in it or the list has nothing else. */
export function neighbour(list: readonly string[], id: string, step: 1 | -1): string | null {
  const i = list.indexOf(id);
  if (i < 0 || list.length < 2) return null;
  return list[(i + step + list.length) % list.length];
}
