import type { AboutCvModel, CvContactItem, CvEntryModel } from "@/lib/aboutCvModel";
import type { AboutCvTheme } from "@/lib/aboutCvTheme";

/**
 * Pure layout for the text-based About CV PDF. It turns an AboutCvModel into
 * positioned drawing ops per A4 page; `aboutCvTextPdf.ts` only paints them.
 * Keeping layout free of pdfkit makes it testable with a fake text measurer.
 */

export const A4_W = 595.28;
export const A4_H = 841.89;

export type PdfFont = "r" | "b";

export type PdfOp =
  | { t: "text"; x: number; y: number; text: string; font: PdfFont; size: number; color: string; spacing?: number }
  | { t: "rect"; x: number; y: number; w: number; h: number; color: string }
  | { t: "line"; x1: number; x2: number; y: number; color: string; width: number }
  | { t: "photo"; x: number; y: number; size: number }
  | { t: "qr"; x: number; y: number; size: number; value: string }
  | { t: "link"; x: number; y: number; w: number; h: number; url: string };

export type PdfMeasure = (text: string, font: PdfFont, size: number) => number;

export type PdfLayout = {
  pages: PdfOp[][];
  /** Density that was used (1 = normal, <1 = compact). */
  scale: number;
};

type Block = { h: number; ops: PdfOp[] };

const MARGIN = 38;
const INK = "#111111";
const SOFT = "#444444";
const RULE = "#d6d6d6";
const ACCENT: Record<AboutCvTheme, string> = { orange: "#e85d04", mono: "#111111", slate: "#111111" };


// Intl.Segmenter is not in this project's TS lib target, so type the slice we use.
type Segmenter = { segment(input: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locale: string | undefined, options: { granularity: "word" | "grapheme" }) => Segmenter;
const SegmenterImpl = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
const wordSegmenter = SegmenterImpl ? new SegmenterImpl("th", { granularity: "word" }) : null;
const graphemeSegmenter = SegmenterImpl ? new SegmenterImpl(undefined, { granularity: "grapheme" }) : null;

function words(text: string): string[] {
  if (wordSegmenter) return Array.from(wordSegmenter.segment(text), (s) => s.segment);
  return text.split(/(\s+)/).filter(Boolean);
}

function graphemes(text: string): string[] {
  if (graphemeSegmenter) return Array.from(graphemeSegmenter.segment(text), (s) => s.segment);
  return Array.from(text);
}

/** Greedy wrap that knows Thai word boundaries and never splits a cluster. */
export function wrapText(text: string, width: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    const flush = () => {
      out.push(line.trimEnd());
      line = "";
    };
    for (const seg of words(para)) {
      const blank = /^\s+$/.test(seg);
      if (!line && blank) continue;
      if (measure((line + seg).trimEnd()) <= width) {
        line += seg;
        continue;
      }
      if (line) flush();
      if (blank) continue;
      if (measure(seg) <= width) {
        line = seg;
        continue;
      }
      for (const g of graphemes(seg)) {
        if (line && measure(line + g) > width) flush();
        line += g;
      }
    }
    if (line) flush();
  }
  return out;
}

function shift(ops: PdfOp[], dx: number, dy: number): PdfOp[] {
  return ops.map((op) => {
    if (op.t === "line") return { ...op, x1: op.x1 + dx, x2: op.x2 + dx, y: op.y + dy };
    return { ...op, x: op.x + dx, y: op.y + dy };
  });
}

type Style = { font: PdfFont; size: number; color: string };

export function layoutAboutCv(
  model: AboutCvModel,
  measure: PdfMeasure,
  theme: AboutCvTheme,
  /** True when the portrait bytes were fetched and can be drawn. */
  photoReady: boolean,
): PdfLayout {
  const one = runLayout(model, measure, theme, photoReady, 1);
  if (one.pages.length <= 1) return one;
  const compact = runLayout(model, measure, theme, photoReady, 0.88);
  return compact.pages.length <= 1 ? compact : one;
}

function runLayout(
  model: AboutCvModel,
  measure: PdfMeasure,
  theme: AboutCvTheme,
  photoReady: boolean,
  S: number,
): PdfLayout {
  const accent = ACCENT[theme];
  const innerW = A4_W - MARGIN * 2;
  const bottom = A4_H - MARGIN;
  const twoCol = model.layout !== "one";
  const hasHero = !!(model.name || model.desiredRole || model.bio);
  const showPhoto = model.showPhoto && photoReady && !!model.portraitUrl;

  const body: Style = { font: "r", size: 9.5 * S, color: INK };
  const small: Style = { font: "r", size: 8.8 * S, color: SOFT };
  const title: Style = { font: "b", size: 10.5 * S, color: INK };
  const lh = (size: number) => size * 1.5;

  const text = (s: string, st: Style, x: number, y: number, spacing?: number): PdfOp => ({
    t: "text",
    x,
    y,
    text: s,
    font: st.font,
    size: st.size,
    color: st.color,
    spacing,
  });

  /** Wrapped paragraph; `gap` adds space after every line break in the source. */
  const paragraph = (s: string, st: Style, w: number, indent = 0): Block => {
    const lines = wrapText(s, w - indent, (t) => measure(t, st.font, st.size));
    const step = lh(st.size);
    return {
      h: lines.length * step,
      ops: lines.map((l, i) => text(l, st, indent, i * step)),
    };
  };

  const heading = (label: string, w: number): Block => {
    const size = 8 * S;
    const st: Style = { font: "b", size, color: INK };
    return {
      h: lh(size) + 3 * S,
      ops: [
        { t: "rect", x: 0, y: size * 0.55, w: 4, h: 4, color: accent },
        text(label.toUpperCase(), st, 9, 0, 0.9),
        { t: "line", x1: 0, x2: w, y: lh(size) + 1, color: RULE, width: 0.5 },
      ],
    };
  };

  const stack = (blocks: Block[], gap: number): Block => {
    const ops: PdfOp[] = [];
    let y = 0;
    blocks.forEach((b, i) => {
      if (i > 0) y += gap;
      ops.push(...shift(b.ops, 0, y));
      y += b.h;
    });
    return { h: y, ops };
  };

  const entry = (e: CvEntryModel, w: number): Block => {
    const dateW = e.period ? measure(e.period, "r", small.size) : 0;
    const titleW = e.period ? w - dateW - 10 : w;
    const head = paragraph(e.title, title, titleW);
    const ops: PdfOp[] = [...head.ops];
    if (e.period) {
      ops.push(text(e.period, small, w - dateW, (lh(title.size) - lh(small.size)) / 2 + 1));
    }
    let y = head.h;
    for (const line of e.lines) {
      const p = paragraph(line, small, w);
      ops.push(...shift(p.ops, 0, y));
      y += p.h;
    }
    if (e.bullets.length) y += 2 * S;
    for (const b of e.bullets) {
      const p = paragraph(b, body, w, 9);
      ops.push({ t: "rect", x: 1.5, y: y + lh(body.size) / 2 - 1.5, w: 2.5, h: 2.5, color: accent });
      ops.push(...shift(p.ops, 0, y));
      y += p.h;
    }
    if (e.href) ops.push({ t: "link", x: 0, y: 0, w, h: y, url: e.href });
    return { h: y, ops };
  };

  const linkOp = (x: number, y: number, w: number, h: number, c: CvContactItem): PdfOp[] =>
    c.href ? [{ t: "link", x, y, w, h, url: c.href }] : [];

  /** Label + value rows (value wraps, URLs break anywhere). */
  const contactRows = (items: CvContactItem[], w: number, labelW: number): Block => {
    const labelStyle: Style = { font: "b", size: 7.2 * S, color: SOFT };
    const ops: PdfOp[] = [];
    let y = 0;
    for (const c of items) {
      const p = paragraph(c.value, body, w - labelW);
      ops.push(text(c.label, labelStyle, 0, y + (lh(body.size) - lh(labelStyle.size)) / 2 + 0.5));
      ops.push(...shift(p.ops, labelW, y));
      ops.push(...linkOp(labelW, y, w - labelW, p.h, c));
      y += p.h + 1.5 * S;
    }
    return { h: Math.max(0, y - 1.5 * S), ops };
  };

  const qrSize = (twoCol ? 74 : 62) * S;

  const contactBlock = (w: number): Block | null => {
    if (!model.contacts.length && !model.qrTarget) return null;
    const parts: Block[] = [heading(model.labels.blocks.contact, w)];
    if (twoCol) {
      if (model.contacts.length) parts.push(contactRows(model.contacts, w, 40 * S));
      if (model.qrTarget) {
        parts.push({ h: qrSize, ops: [{ t: "qr", x: 0, y: 0, size: qrSize, value: model.qrTarget }] });
      }
      return stack(parts, 6 * S);
    }
    // One column: three columns of rows beside the QR.
    const gridW = model.qrTarget ? w - qrSize - 14 : w;
    const cols = 3;
    const colGap = 12;
    const colW = (gridW - colGap * (cols - 1)) / cols;
    const buckets: CvContactItem[][] = Array.from({ length: cols }, () => []);
    model.contacts.forEach((c, i) => buckets[i % cols].push(c));
    let gridH = 0;
    const gridOps: PdfOp[] = [];
    buckets.forEach((items, i) => {
      if (!items.length) return;
      const b = contactRows(items, colW, 36 * S);
      gridOps.push(...shift(b.ops, i * (colW + colGap), 0));
      gridH = Math.max(gridH, b.h);
    });
    const ops = [...gridOps];
    if (model.qrTarget) ops.push({ t: "qr", x: w - qrSize, y: 0, size: qrSize, value: model.qrTarget });
    return stack([parts[0], { h: Math.max(gridH, model.qrTarget ? qrSize : 0), ops }], 6 * S);
  };

  const sideBlocks = (w: number): Block[] => {
    const out: Block[] = [];
    if (model.place) out.push(stack([heading(model.labels.blocks.location, w), paragraph(model.place, body, w)], 5 * S));
    if (model.personal.length) {
      out.push(
        stack(
          [
            heading(model.labels.blocks.personal, w),
            ...model.personal.map((p) => paragraph(`${p.label}: ${p.value}`, body, w)),
          ],
          2 * S,
        ),
      );
    }
    if (model.languages.length) {
      out.push(
        stack([heading(model.labels.blocks.languages, w), ...model.languages.map((l) => paragraph(l, body, w))], 5 * S),
      );
    }
    if (model.craftSkills.length) {
      out.push(
        stack([heading(model.labels.blocks.skills, w), ...model.craftSkills.map((s) => paragraph(s, body, w))], 2 * S),
      );
    }
    if (model.software.length) {
      out.push(stack([heading(model.labels.blocks.software, w), paragraph(model.software.join(" · "), body, w)], 5 * S));
    }
    return out;
  };

  const heroBlock = (w: number): Block | null => {
    if (!hasHero) return null;
    const parts: Block[] = [];
    if (model.name) parts.push(paragraph(model.name, { font: "b", size: 24 * S, color: INK }, w));
    if (model.desiredRole) parts.push(paragraph(model.desiredRole, { font: "r", size: 12 * S, color: INK }, w));
    if (model.name || model.desiredRole) {
      parts.push({ h: 2, ops: [{ t: "rect", x: 0, y: 0, w: 30, h: 1.6, color: accent }] });
    }
    if (model.bio) parts.push(paragraph(model.bio, body, w));
    return stack(parts, 3 * S);
  };

  // ── placement ────────────────────────────────────────────────────────────
  const pages: PdfOp[][] = [[]];
  const put = (page: number, x: number, y: number, ops: PdfOp[]) => {
    while (pages.length <= page) pages.push([]);
    pages[page].push(...shift(ops, x, y));
  };

  const photoSize = (twoCol ? 96 : 74) * S;
  const photoOps: PdfOp[] = showPhoto ? [{ t: "photo", x: 0, y: 0, size: photoSize }] : [];

  let mainX: number;
  let mainW: number;
  let mainY: number;
  const sideX = MARGIN;
  let sideY = MARGIN;
  let sideList: Block[] = [];
  const overflowSide: Block[] = [];

  if (twoCol) {
    const sideW = 150;
    const gap = 22;
    mainX = MARGIN + sideW + gap;
    mainW = A4_W - MARGIN - mainX;
    sideList = sideBlocks(sideW);
    const contact = contactBlock(sideW);
    if (contact) sideList = [contact, ...sideList];

    const hero = heroBlock(mainW);
    let rowBottom = MARGIN;
    if (showPhoto) {
      put(0, MARGIN, MARGIN, photoOps);
      rowBottom = MARGIN + photoSize;
    }
    let heroBottom = MARGIN;
    if (hero) {
      put(0, mainX, MARGIN, hero.ops);
      heroBottom = MARGIN + hero.h;
    }
    if (showPhoto) {
      mainY = Math.max(rowBottom, heroBottom) + 16 * S;
      sideY = mainY;
    } else {
      sideY = MARGIN;
      mainY = (hero ? heroBottom : MARGIN) + 16 * S;
    }
  } else {
    mainX = MARGIN;
    mainW = innerW;
    let y = MARGIN;
    const heroW = showPhoto ? innerW - photoSize - 16 : innerW;
    const hero = heroBlock(heroW);
    if (showPhoto) put(0, MARGIN, y, photoOps);
    if (hero) put(0, MARGIN + (showPhoto ? photoSize + 16 : 0), y, hero.ops);
    y += Math.max(showPhoto ? photoSize : 0, hero ? hero.h : 0);
    if (hasHero || showPhoto) y += 14 * S;
    const contact = contactBlock(innerW);
    if (contact) {
      put(0, MARGIN, y, contact.ops);
      y += contact.h + 14 * S;
    }
    mainY = y;
  }

  // Sidebar (two columns only): whole blocks that fit on page 1, the rest follow the main flow.
  if (twoCol) {
    let y = sideY;
    for (const b of sideList) {
      if (y + b.h <= bottom) {
        put(0, sideX, y, b.ops);
        y += b.h + 14 * S;
      } else {
        overflowSide.push(b);
      }
    }
  }

  // Main flow: sections with dividers; entries never split across pages.
  let page = 0;
  let x = mainX;
  let w = mainW;
  let y = mainY;
  const newPage = () => {
    page += 1;
    x = MARGIN;
    w = innerW;
    y = MARGIN;
  };
  const place = (build: (width: number) => Block, keepWith?: (width: number) => Block) => {
    let b = build(w);
    const need = b.h + (keepWith ? keepWith(w).h : 0);
    if (y + need > bottom && y > (page === 0 ? mainY : MARGIN)) {
      newPage();
      b = build(w);
    }
    put(page, x, y, b.ops);
    y += b.h;
  };

  model.sections.forEach((section, si) => {
    const headBlock = (width: number) => heading(section.title, width);
    if (si > 0) y += 8 * S;
    section.entries.forEach((e, ei) => {
      if (ei === 0) {
        place((width) => stack([headBlock(width), entry(e, width)], 7 * S));
      } else {
        y += 9 * S;
        place((width) => entry(e, width));
      }
    });
    y += 4 * S;
  });

  // Sidebar leftovers (two columns) or the skills grid (one column) follow the main content.
  if (twoCol) {
    for (const b of overflowSide) {
      y += 8 * S;
      if (y + b.h > bottom) newPage();
      put(page, x, y, b.ops);
      y += b.h;
    }
  } else {
    const cols = 3;
    const colGap = 12;
    const colW = (w - colGap * (cols - 1)) / cols;
    const cells = sideBlocks(colW);
    if (cells.length) y += 8 * S;
    for (let i = 0; i < cells.length; i += cols) {
      const row = cells.slice(i, i + cols);
      const h = Math.max(...row.map((c) => c.h));
      if (y + h > bottom) newPage();
      row.forEach((c, k) => put(page, x + k * (colW + colGap), y, c.ops));
      y += h + 12 * S;
    }
  }

  return { pages, scale: S };
}
