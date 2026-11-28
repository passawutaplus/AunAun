/**
 * Data of the Upload page (mock Upload.dc.html) and how it is stored in `anthem.projects`.
 *
 * Stored blocks (content_blocks), readable by the old site until cutover (it skips types it does not know):
 *   image   { id, type: "image", url, size: [w, h], mediaLayout: "single" }
 *   video   { id, type: "video", url, posterUrl? }
 *   text    { id, type: "body", body: <html for the old site>, scText, scStyle }   — whole-block style (mock)
 *   layout  { id, type: "sc_layout", layout, cells: (SlotImage | SlotTextCell | null)[] } — Template mode, one per row
 * A work whose blocks carry `scStyle` or `sc_layout` was made in this editor: the Work page shows it like the Preview.
 */
import type { CSSProperties } from "react";
import { isScCategory, type ScCategory } from "../lib/categories";
import { htmlToText, isScContent } from "../work/workContent";

// ---------- text style (mock mkText) ----------

export type FontKey = "sans" | "serif" | "mono";
export type TextCase = "none" | "uppercase" | "lowercase";
export type TextAlign = "left" | "center" | "right" | "justify";

export type TextStyle = {
  font: FontKey;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  tcase: TextCase;
  align: TextAlign;
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  font: "sans",
  size: 16,
  color: "#282929",
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  tcase: "none",
  align: "left",
};

export const TEXT_SIZE_MIN = 10;
export const TEXT_SIZE_MAX = 72;
/** Size given to old "heading" blocks when an old work is opened here (the mock has no heading block). */
const OLD_HEADING_SIZE = 24;

export const FONT_FAMILY: Record<FontKey, string> = {
  sans: "'Elms Sans', 'IBM Plex Sans Thai', sans-serif",
  serif: "'Noto Serif Thai', serif",
  mono: "'IBM Plex Mono', 'IBM Plex Sans Thai', monospace",
};

export const FONT_NAME: Record<FontKey, string> = { sans: "Elms Sans", serif: "Noto Serif Thai", mono: "IBM Plex Mono" };
export const FONTS: ReadonlyArray<FontKey> = ["sans", "serif", "mono"];

export const TEXT_COLORS: ReadonlyArray<readonly [string, string]> = [
  ["Ink", "#282929"],
  ["Grey", "#666666"],
  ["Light grey", "#A3A3A0"],
  ["Red", "#EE3D29"],
  ["Blue", "#2E4A6B"],
  ["Green", "#5E8C61"],
  ["Ochre", "#B8862B"],
  ["White", "#FFFFFF"],
];

export const ALIGNS: ReadonlyArray<TextAlign> = ["left", "center", "right", "justify"];
export const CASES: ReadonlyArray<TextCase> = ["none", "uppercase", "lowercase"];

/** CSS of a styled text block, in the editor and on the Work page (mock pvStyle / taStyle). */
export function textCss(s: TextStyle): CSSProperties {
  const deco = [s.underline ? "underline" : "", s.strike ? "line-through" : ""].join(" ").trim() || "none";
  return {
    fontFamily: FONT_FAMILY[s.font],
    fontWeight: s.bold ? 700 : 300,
    fontStyle: s.italic ? "italic" : "normal",
    textDecoration: deco,
    textTransform: s.tcase,
    color: s.color,
    textAlign: s.align,
    fontSize: `${s.size}px`,
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** A stored style, cleaned: anything unknown falls back to the default. */
export function parseTextStyle(raw: unknown): TextStyle {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const size = typeof r.size === "number" && Number.isFinite(r.size) ? Math.round(r.size) : DEFAULT_TEXT_STYLE.size;
  return {
    font: FONTS.includes(r.font as FontKey) ? (r.font as FontKey) : "sans",
    size: Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, size)),
    color: typeof r.color === "string" && HEX.test(r.color) ? r.color : DEFAULT_TEXT_STYLE.color,
    bold: r.bold === true,
    italic: r.italic === true,
    underline: r.underline === true,
    strike: r.strike === true,
    tcase: CASES.includes(r.tcase as TextCase) ? (r.tcase as TextCase) : "none",
    align: ALIGNS.includes(r.align as TextAlign) ? (r.align as TextAlign) : "left",
  };
}

// ---------- Template layouts (mock LAYOUTS / GROUPS) ----------

/** [column start, column span, row start, row span, "text"?] on a 6-column grid. */
export type CellSpec = readonly [number, number, number, number, "text"?];

export const LAYOUTS = {
  Full: [[1, 6, 1, 6]],
  "Two Up": [[1, 3, 1, 6], [4, 3, 1, 6]],
  "Three Up": [[1, 2, 1, 5], [3, 2, 1, 5], [5, 2, 1, 5]],
  "Hero + 2": [[1, 6, 1, 4], [1, 3, 5, 3], [4, 3, 5, 3]],
  "Grid 4": [[1, 3, 1, 3], [4, 3, 1, 3], [1, 3, 4, 3], [4, 3, 4, 3]],
  "Wide + Tall": [[1, 4, 1, 5], [5, 2, 1, 5]],
  "Image + Text": [[1, 4, 1, 6], [5, 2, 1, 6, "text"]],
  Text: [[1, 6, 1, 2, "text"]],
  Panorama: [[1, 6, 1, 3]],
  "Tall + Wide": [[1, 2, 1, 5], [3, 4, 1, 5]],
  "Big + 3": [[1, 4, 1, 6], [5, 2, 1, 2], [5, 2, 3, 2], [5, 2, 5, 2]],
  "2 + Hero": [[1, 3, 1, 3], [4, 3, 1, 3], [1, 6, 4, 4]],
  "Grid 6": [[1, 2, 1, 3], [3, 2, 1, 3], [5, 2, 1, 3], [1, 2, 4, 3], [3, 2, 4, 3], [5, 2, 4, 3]],
  "Text + Image": [[1, 2, 1, 6, "text"], [3, 4, 1, 6]],
  "Image + Caption": [[1, 6, 1, 5], [1, 6, 6, 1, "text"]],
  "Two + Caption": [[1, 3, 1, 5], [4, 3, 1, 5], [1, 6, 6, 1, "text"]],
  "Text / Image": [[1, 6, 1, 1, "text"], [1, 6, 2, 5]],
  "Image · Text · Image": [[1, 2, 1, 5], [3, 2, 1, 5, "text"], [5, 2, 1, 5]],
  Heading: [[1, 6, 1, 1, "text"]],
  "Two Columns": [[1, 3, 1, 3, "text"], [4, 3, 1, 3, "text"]],
  Quote: [[2, 4, 1, 2, "text"]],
  "Side Note": [[1, 2, 1, 2, "text"], [3, 4, 1, 2, "text"]],
} as const satisfies Record<string, ReadonlyArray<CellSpec>>;

export type LayoutName = keyof typeof LAYOUTS;

export const LAYOUT_GROUPS: ReadonlyArray<readonly [string, ReadonlyArray<LayoutName>]> = [
  ["IMAGE", ["Full", "Panorama", "Two Up", "Three Up", "Hero + 2", "2 + Hero", "Grid 4", "Grid 6", "Wide + Tall", "Tall + Wide", "Big + 3"]],
  ["IMAGE + TEXT", ["Image + Text", "Text + Image", "Image + Caption", "Two + Caption", "Text / Image", "Image · Text · Image"]],
  ["TEXT", ["Text", "Heading", "Two Columns", "Quote", "Side Note"]],
];

export const isLayoutName = (v: unknown): v is LayoutName => typeof v === "string" && Object.prototype.hasOwnProperty.call(LAYOUTS, v);

export const cellsOf = (layout: LayoutName): ReadonlyArray<CellSpec> => LAYOUTS[layout];
export const isTextCell = (c: CellSpec) => c[4] === "text";

/** `grid-column` / `grid-row` of one cell (mock `at`). */
export function cellPlace(c: CellSpec): CSSProperties {
  return { gridColumn: `${c[0]} / span ${c[1]}`, gridRow: `${c[2]} / span ${c[3]}` };
}

/** Height of a row of `n` grid rows (80px rows, 16px gaps in the editor; 84px in the Preview). */
export const DEFAULT_LAYOUT: LayoutName = "Hero + 2";

// ---------- the work being edited ----------

/** A picture or video of the work. Kept out of undo/redo, so an upload that finishes is never undone. */
export type Media = {
  kind: "image" | "video";
  /** Public URL; empty until the upload finishes. */
  url: string;
  /** Local `blob:` copy of a file picked on this page, shown instead of downloading the upload again. */
  preview?: string;
  /** Natural [width, height] (images; videos when known). */
  size: [number, number] | null;
  poster?: string;
  /** 0–100 while uploading, null when done. */
  progress: number | null;
  error?: string;
  name: string;
};

export type Block = { id: string; type: "image" | "video" } | { id: string; type: "text"; text: string; style: TextStyle };

export type Row = { id: string; layout: LayoutName };

export type SlotText = { text: string; style: TextStyle };

export type Mode = "Basic" | "Template";

/** Everything undo/redo covers (mock snap()). */
export type Draft = {
  blocks: Block[];
  coverId: string | null;
  rows: Row[];
  /** `${rowId}:${cellIndex}` → media id */
  fills: Record<string, string>;
  /** `${rowId}:${cellIndex}` → Fit (whole picture). Fill (crop to the frame) is the default (owner 2026-11-28, as the mock). */
  fit: Record<string, boolean>;
  slotTexts: Record<string, SlotText>;
  title: string;
  category: ScCategory | null;
  desc: string;
  tags: string;
  catalogId: string | null;
};

export const slotKey = (rowId: string, i: number) => `${rowId}:${i}`;

export function emptyDraft(firstRowId: string): Draft {
  return {
    blocks: [],
    coverId: null,
    rows: [{ id: firstRowId, layout: DEFAULT_LAYOUT }],
    fills: {},
    fit: {},
    slotTexts: {},
    title: "",
    category: null,
    desc: "",
    tags: "",
    catalogId: null,
  };
}

export const isUploaded = (m: Media | undefined): m is Media =>
  !!m && m.progress == null && !m.error && !!m.url && !m.url.startsWith("blob:");

/** Image blocks whose upload finished, top to bottom. */
export function readyImageIds(d: Draft, media: Record<string, Media>): string[] {
  return d.blocks.filter((b) => b.type === "image" && isUploaded(media[b.id]) && media[b.id].kind === "image").map((b) => b.id);
}

/** The cover of Basic mode: the starred picture, else the first finished one (mock). */
export function basicCoverId(d: Draft, media: Record<string, Media>): string | null {
  const ids = readyImageIds(d, media);
  return d.coverId && ids.includes(d.coverId) ? d.coverId : ids[0] ?? null;
}

/** The cover of Template mode: the first filled picture slot, row by row (mock firstKey). */
export function templateCoverKey(d: Draft, media: Record<string, Media>): string | null {
  for (const r of d.rows) {
    const cells = cellsOf(r.layout);
    for (let i = 0; i < cells.length; i++) {
      if (isTextCell(cells[i])) continue;
      const k = slotKey(r.id, i);
      const m = media[d.fills[k] ?? ""];
      if (isUploaded(m) && m.kind === "image") return k;
    }
  }
  return null;
}

export function coverMediaId(mode: Mode, d: Draft, media: Record<string, Media>): string | null {
  if (mode === "Basic") return basicCoverId(d, media);
  const k = templateCoverKey(d, media);
  return k ? d.fills[k] : null;
}

/** Image · Title · Category (mock checks). */
export function readiness(mode: Mode, d: Draft, media: Record<string, Media>) {
  const hasImage = !!coverMediaId(mode, d, media);
  const hasTitle = !!d.title.trim();
  const hasCategory = !!d.category;
  return { hasImage, hasTitle, hasCategory, ready: hasImage && hasTitle && hasCategory };
}

/** Anything worth keeping as a draft (mock hasContent). */
export const hasContent = (d: Draft) => d.blocks.length > 0 || Object.keys(d.fills).length > 0 || !!d.title.trim();

// ---------- tags ----------

export const TAGS_MAX = 15;
const TAG_LEN_MAX = 40;

/** "riso, poster" → ["riso", "poster"]: commas (Thai/Chinese too) or new lines, no "#", no repeats. */
export function parseTags(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,，、\n]/)) {
    const t = part.trim().replace(/^#+/, "").trim().slice(0, TAG_LEN_MAX);
    const k = t.toLocaleLowerCase("th");
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= TAGS_MAX) break;
  }
  return out;
}

// ---------- CATEGORY → old category (the old site reads `category` until cutover) ----------

const LEGACY_OF: Record<ScCategory, string> = {
  Illustration: "Illustration / Art",
  Graphic: "Graphic / Branding",
  Branding: "Graphic / Branding",
  Typography: "Graphic / Branding",
  Painting: "Illustration / Art",
  Drawing: "Illustration / Art",
  Printmaking: "Illustration / Art",
  Risograph: "Illustration / Art",
  Collage: "Illustration / Art",
  Zine: "Illustration / Art",
  Photography: "Photography",
  Motion: "Motion / Animation",
  "3D": "3D / CG / Game",
  Sculpture: "Art Toy / Model",
  Ceramics: "Craft / Handmade",
  Textile: "Fashion / Textile",
  Fashion: "Fashion / Textile",
  Product: "Product / Industrial",
  Character: "Art Toy / Model",
  "UX/UI": "UI/UX",
  "Mixed Media": "Illustration / Art",
  Other: "Graphic / Branding",
};

export const legacyCategory = (c: ScCategory) => LEGACY_OF[c];

// ---------- save ----------

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain text → the HTML the old site expects in a "body" block. */
const toOldHtml = (text: string) =>
  text
    .split("\n")
    .map((l) => escapeHtml(l))
    .join("<br>");

const sizeOk = (s: unknown): s is [number, number] =>
  Array.isArray(s) && s.length === 2 && s.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 32767);

const roundSize = (s: [number, number]): [number, number] => [Math.round(s[0]), Math.round(s[1])];

export type WorkFields = {
  title: string;
  description: string;
  sc_category: ScCategory | null;
  category: string | null;
  tags: string[];
  content_blocks: unknown[];
  cover_url: string | null;
  cover_width: number | null;
  cover_height: number | null;
  media_sizes: Record<string, [number, number]>;
  gallery_urls: string[];
  video_urls: string[];
};

/** The columns of `anthem.projects` for a work, from what is on screen. Unfinished uploads and errors are left out. */
export function toWorkFields(mode: Mode, d: Draft, media: Record<string, Media>): WorkFields {
  const content: unknown[] = [];
  const images: string[] = [];
  const videos: string[] = [];
  const sizes: Record<string, [number, number]> = {};
  const addImage = (m: Media) => {
    if (!images.includes(m.url)) images.push(m.url);
    if (sizeOk(m.size)) sizes[m.url] = roundSize(m.size);
  };

  if (mode === "Basic") {
    for (const b of d.blocks) {
      if (b.type === "text") {
        if (!b.text.trim()) continue;
        content.push({ id: b.id, type: "body", body: toOldHtml(b.text), scText: b.text, scStyle: b.style });
        continue;
      }
      const m = media[b.id];
      if (!isUploaded(m)) continue;
      if (m.kind === "image") {
        addImage(m);
        content.push({ id: b.id, type: "image", url: m.url, mediaLayout: "single", ...(sizeOk(m.size) ? { size: roundSize(m.size) } : {}) });
      } else {
        if (!videos.includes(m.url)) videos.push(m.url);
        content.push({ id: b.id, type: "video", url: m.url, ...(m.poster ? { posterUrl: m.poster } : {}) });
      }
    }
  } else {
    for (const r of d.rows) {
      const cells = cellsOf(r.layout).map((c, i) => {
        const k = slotKey(r.id, i);
        if (isTextCell(c)) {
          const t = d.slotTexts[k];
          return t && t.text.trim() ? { text: t.text, style: t.style } : null;
        }
        const m = media[d.fills[k] ?? ""];
        if (!isUploaded(m) || m.kind !== "image") return null;
        addImage(m);
        return { image: m.url, ...(sizeOk(m.size) ? { size: roundSize(m.size) } : {}), ...(d.fit[k] ? { fit: true } : {}) };
      });
      content.push({ id: r.id, type: "sc_layout", layout: r.layout, cells });
    }
  }

  const coverId = coverMediaId(mode, d, media);
  const cover = coverId ? media[coverId] : undefined;
  const coverSize = cover && sizeOk(cover.size) ? roundSize(cover.size) : null;
  return {
    title: d.title.trim(),
    description: d.desc.trim(),
    sc_category: d.category,
    category: d.category ? legacyCategory(d.category) : null,
    tags: parseTags(d.tags),
    content_blocks: content,
    cover_url: cover?.url ?? null,
    cover_width: coverSize ? coverSize[0] : null,
    cover_height: coverSize ? coverSize[1] : null,
    media_sizes: sizes,
    gallery_urls: images,
    video_urls: videos,
  };
}

// ---------- open a saved work ----------

export type StoredWork = {
  title: string | null;
  description: string | null;
  sc_category: string | null;
  tags: string[] | null;
  content_blocks: unknown;
  gallery_urls: string[] | null;
  video_urls: string[] | null;
  cover_url: string | null;
  cover_width: number | null;
  cover_height: number | null;
  media_sizes: Record<string, [number, number]> | null;
};

const isHttp = (u: unknown): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim());

export { isScContent };

/**
 * A saved work as editor state. Works from the old editor become Basic blocks: headings and texts
 * turn into text blocks, image + text modules into a picture then its text, galleries into one
 * picture per block. Columns this editor does not show (tools, licence, …) are never written.
 */
export function fromWork(row: StoredWork, newId: () => string): { mode: Mode; draft: Draft; media: Record<string, Media> } {
  const media: Record<string, Media> = {};
  const blocks: Block[] = [];
  const sizes = row.media_sizes ?? {};
  const sizeOf = (url: string, own?: unknown): [number, number] | null =>
    sizeOk(own) ? own : sizeOk(sizes[url]) ? sizes[url] : url === row.cover_url && row.cover_width && row.cover_height ? [row.cover_width, row.cover_height] : null;
  const nameOf = (url: string) => decodeURIComponent(url.split("?")[0].split("/").pop() || "image");
  const addImage = (url: string, own?: unknown) => {
    const id = newId();
    media[id] = { kind: "image", url, size: sizeOf(url, own), progress: null, name: nameOf(url) };
    blocks.push({ id, type: "image" });
  };
  const addVideo = (url: string, poster?: unknown) => {
    const id = newId();
    media[id] = { kind: "video", url, size: null, ...(isHttp(poster) ? { poster } : {}), progress: null, name: nameOf(url) };
    blocks.push({ id, type: "video" });
  };
  const addText = (text: string, style: TextStyle = DEFAULT_TEXT_STYLE) => {
    if (text.trim()) blocks.push({ id: newId(), type: "text", text, style });
  };
  const oldText = (v: unknown) => (typeof v === "string" ? htmlToText(v) : "");

  const raw = Array.isArray(row.content_blocks) ? (row.content_blocks as unknown[]) : [];
  const rows: Row[] = [];
  const fills: Record<string, string> = {};
  const fit: Record<string, boolean> = {};
  const slotTexts: Record<string, SlotText> = {};

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    const urls = Array.isArray(b.urls) ? b.urls.filter(isHttp) : [];
    switch (b.type) {
      case "sc_layout": {
        if (!isLayoutName(b.layout)) break;
        const id = typeof b.id === "string" && b.id ? b.id : newId();
        rows.push({ id, layout: b.layout });
        const cells = Array.isArray(b.cells) ? b.cells : [];
        cellsOf(b.layout).forEach((spec, i) => {
          const c = cells[i] as Record<string, unknown> | null | undefined;
          if (!c || typeof c !== "object") return;
          const k = slotKey(id, i);
          if (isTextCell(spec)) {
            if (typeof c.text === "string") slotTexts[k] = { text: c.text, style: parseTextStyle(c.style) };
            return;
          }
          if (!isHttp(c.image)) return;
          const mid = newId();
          media[mid] = { kind: "image", url: c.image, size: sizeOf(c.image, c.size), progress: null, name: nameOf(c.image) };
          fills[k] = mid;
          if (c.fit === true) fit[k] = true;
        });
        break;
      }
      case "image":
        if (urls.length) urls.forEach((u) => addImage(u, urls.length === 1 ? b.size : undefined));
        else if (isHttp(b.url)) addImage(b.url, b.size);
        break;
      case "video":
        if (isHttp(b.url)) addVideo(b.url, b.posterUrl);
        break;
      case "body":
        addText(typeof b.scText === "string" ? b.scText : oldText(b.body), "scStyle" in b ? parseTextStyle(b.scStyle) : DEFAULT_TEXT_STYLE);
        break;
      case "heading":
        addText(oldText(b.heading), { ...DEFAULT_TEXT_STYLE, size: OLD_HEADING_SIZE });
        break;
      case "heading_body":
        addText(oldText(b.heading), { ...DEFAULT_TEXT_STYLE, size: OLD_HEADING_SIZE });
        addText(oldText(b.body));
        break;
      case "image_text": {
        const pics = urls.length ? urls : isHttp(b.url) ? [b.url] : [];
        const text = () => {
          addText(oldText(b.heading), { ...DEFAULT_TEXT_STYLE, size: OLD_HEADING_SIZE });
          addText(oldText(b.body));
        };
        if (b.splitSide === "text_left") text();
        pics.forEach((u) => addImage(u, pics.length === 1 ? b.size : undefined));
        if (b.splitSide !== "text_left") text();
        break;
      }
      default:
        break;
    }
  }

  // Old works without media blocks keep their pictures in gallery_urls / video_urls.
  if (!rows.length && !blocks.some((x) => x.type !== "text")) {
    for (const u of row.gallery_urls ?? []) if (isHttp(u)) addImage(u);
    for (const u of row.video_urls ?? []) if (isHttp(u)) addVideo(u);
  }

  const mode: Mode = rows.length ? "Template" : "Basic";
  const coverId = Object.keys(media).find((id) => media[id].kind === "image" && media[id].url === row.cover_url) ?? null;
  const draft: Draft = {
    blocks: mode === "Basic" ? blocks : [],
    coverId: mode === "Basic" ? coverId : null,
    rows: rows.length ? rows : [{ id: newId(), layout: DEFAULT_LAYOUT }],
    fills,
    fit,
    slotTexts,
    title: row.title ?? "",
    category: isScCategory(row.sc_category) ? row.sc_category : null,
    desc: htmlToText(row.description ?? ""),
    tags: (row.tags ?? []).join(", "),
    catalogId: null,
  };
  return { mode, draft, media };
}
