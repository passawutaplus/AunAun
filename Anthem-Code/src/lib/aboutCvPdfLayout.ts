import type { AboutCvModel, CvContactItem, CvEntryModel, CvSectionKey, CvSectionModel } from "@/lib/aboutCvModel";
import type { AboutCvTheme } from "@/lib/aboutCvTheme";

/**
 * Pure layout for the text-based About CV PDF. It turns an AboutCvModel into
 * positioned drawing ops per A4 page; `aboutCvTextPdf.ts` only paints them.
 * Three templates (editorial / index / grid) share the same builders and
 * differ in placement, mirroring the on-screen sheet. Dimensions are the
 * 794×1123px design × 0.75 (pt).
 */

export const A4_W = 595.28;
export const A4_H = 841.89;

/** r = regular, b = bold, d = heading font (chosen per CV; Thai text always falls back to bold). */
export type PdfFont = "r" | "b" | "d";

export type PdfOp =
  | {
      t: "text";
      x: number;
      y: number;
      text: string;
      font: PdfFont;
      size: number;
      color: string;
      spacing?: number;
      /** "r": x is the right edge of the text. */
      align?: "l" | "r";
    }
  | { t: "rect"; x: number; y: number; w: number; h: number; color: string }
  | { t: "line"; x1: number; x2: number; y: number; color: string; width: number }
  | { t: "vline"; x: number; y1: number; y2: number; color: string; width: number }
  | { t: "photo"; x: number; y: number; w: number; h: number }
  | { t: "qr"; x: number; y: number; size: number; value: string }
  | { t: "link"; x: number; y: number; w: number; h: number; url: string };

export type PdfMeasure = (text: string, font: PdfFont, size: number) => number;

export type PdfLayout = {
  pages: PdfOp[][];
  /** Density that was used (1 = normal, <1 = compact). */
  scale: number;
};

type Block = { h: number; ops: PdfOp[] };
type Item = { gapBefore: number; build: (width: number) => Block };
type Style = { font: PdfFont; size: number; color: string };
type Piece = { title: string; lines: string[]; bullet?: boolean } | null;

const INK = "#161616";
const SOFT = "#4a4a47";
const RULE = "#161616";
const ACCENT: Record<AboutCvTheme, string> = { orange: "#e85d04", mono: "#161616", slate: "#161616" };

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
    if (op.t === "vline") return { ...op, x: op.x + dx, y1: op.y1 + dy, y2: op.y2 + dy };
    return { ...op, x: op.x + dx, y: op.y + dy };
  });
}

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

function pick(model: AboutCvModel, keys: CvSectionKey[]): CvSectionModel[] {
  return keys.flatMap((key) => model.sections.filter((s) => s.key === key));
}

function splitName(name: string): { first: string; rest: string } {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return { first, rest: rest.join(" ") };
}

/** Largest size (pt) at which the longest word still fits the box. */
function fitSize(text: string, maxPt: number, boxPt: number): number {
  const longest = Math.max(1, ...text.split(/\s+/).map((w) => w.length));
  return Math.max(20, Math.min(maxPt, Math.floor(boxPt / (0.6 * longest))));
}

function runLayout(
  model: AboutCvModel,
  measure: PdfMeasure,
  theme: AboutCvTheme,
  photoReady: boolean,
  S: number,
): PdfLayout {
  const accent = ACCENT[theme];
  const showPhoto = model.showPhoto && photoReady && !!model.portraitUrl;

  const body: Style = { font: "r", size: 9.4 * S, color: INK };
  const small: Style = { font: "r", size: 9.4 * S, color: SOFT };
  const strong: Style = { font: "b", size: 9.4 * S, color: INK };

  const text = (
    s: string,
    st: Style,
    x: number,
    y: number,
    extra: Partial<Extract<PdfOp, { t: "text" }>> = {},
  ): PdfOp => ({
    t: "text",
    x,
    y,
    text: s,
    font: st.font,
    size: st.size,
    color: st.color,
    ...extra,
  });

  const paragraph = (
    s: string,
    st: Style,
    w: number,
    opts: { indent?: number; align?: "l" | "r"; leading?: number } = {},
  ): Block => {
    const { indent = 0, align = "l", leading = 1.55 } = opts;
    const lines = wrapText(s, w - indent, (t) => measure(t, st.font, st.size));
    const step = st.size * leading;
    return {
      h: lines.length * step,
      ops: lines.map((l, i) => text(l, st, align === "r" ? w : indent, i * step, align === "r" ? { align: "r" } : {})),
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

  const bullets = (items: string[], w: number): Block => {
    const ops: PdfOp[] = [];
    let y = 0;
    for (const b of items) {
      const p = paragraph(b, body, w, { indent: 13.5, leading: 1.85 });
      ops.push({ t: "rect", x: 3.5, y: y + (body.size * 1.85) / 2 - 1.4, w: 2.8, h: 2.8, color: accent });
      ops.push(...shift(p.ops, 0, y));
      y += p.h;
    }
    return { h: y, ops };
  };

  const linkBox = (w: number, h: number, url?: string): PdfOp[] => (url ? [{ t: "link", x: 0, y: 0, w, h, url }] : []);

  /** One contact per line: value only when self-explaining, else "LABEL value". */
  const contactLine = (c: CvContactItem, w: number): Block => {
    const selfExplaining = ["email", "phone", "profile", "portfolio", "website"].includes(c.kind);
    const label: Style = { font: "b", size: 7.6 * S, color: SOFT };
    const labelW = selfExplaining ? 0 : 39 * S;
    const p = paragraph(c.value, body, w - labelW);
    const ops: PdfOp[] = [];
    if (!selfExplaining) ops.push(text(c.label, label, 0, (body.size * 1.55 - label.size * 1.55) / 2 + 0.5));
    ops.push(...shift(p.ops, labelW, 0));
    ops.push(...shift(linkBox(w - labelW, p.h, c.href), labelW, 0));
    return { h: p.h, ops };
  };

  const contactList = (items: CvContactItem[], w: number, gap = 1.5 * S): Block =>
    stack(items.map((c) => contactLine(c, w)), gap);

  /** Entry body shared by all templates: bold title, soft detail lines, bullets. */
  const entryCore = (e: CvEntryModel, w: number, titleWidth = w): Block => {
    const title = paragraph(e.title, strong, titleWidth);
    const ops: PdfOp[] = [...title.ops];
    let y = title.h;
    for (const line of e.lines) {
      const p = paragraph(line, small, w);
      ops.push(...shift(p.ops, 0, y));
      y += p.h;
    }
    if (e.bullets.length) {
      y += 2 * S;
      const b = bullets(e.bullets, w);
      ops.push(...shift(b.ops, 0, y));
      y += b.h;
    }
    return { h: y, ops };
  };

  const sidePieces = () => {
    const l = model.labels.blocks;
    return {
      personal: model.personal.length
        ? { title: l.personal, lines: model.personal.map((p) => `${p.label}: ${p.value}`) }
        : null,
      skills: model.craftSkills.length ? { title: l.skills, lines: model.craftSkills, bullet: true } : null,
      software: model.software.length ? { title: l.software, lines: [model.software.join(" · ")] } : null,
      languages: model.languages.length ? { title: l.languages, lines: model.languages } : null,
      location: model.place ? { title: l.location, lines: [model.place] } : null,
    } satisfies Record<string, Piece>;
  };

  const listBody = (piece: NonNullable<Piece>, w: number): Block =>
    piece.bullet ? bullets(piece.lines, w) : stack(piece.lines.map((line) => paragraph(line, body, w)), 0);

  const pages: PdfOp[][] = [[]];
  const put = (page: number, x: number, y: number, ops: PdfOp[]) => {
    while (pages.length <= page) pages.push([]);
    pages[page].push(...shift(ops, x, y));
  };

  /** Fill one column; returns the items that did not fit. */
  const fillColumn = (items: Item[], page: number, x: number, w: number, y0: number, bottom: number): Item[] => {
    let y = y0;
    for (let i = 0; i < items.length; i += 1) {
      const block = items[i].build(w);
      const gap = y === y0 ? 0 : items[i].gapBefore;
      if (y + gap + block.h > bottom + 0.5 && y > y0) return items.slice(i);
      y += gap;
      put(page, x, y, block.ops);
      y += block.h;
    }
    return [];
  };

  /** Anything left over continues on full-width pages. */
  const continuePages = (rest: Item[], inner: { x: number; w: number; top: number; bottom: number }) => {
    let remaining = rest;
    let page = 1;
    while (remaining.length) {
      const next = fillColumn(remaining, page, inner.x, inner.w, inner.top, inner.bottom);
      if (next.length === remaining.length) break; // nothing fits even alone — avoid looping
      remaining = next;
      page += 1;
    }
  };

  type SectionStyle = {
    heading: (title: string, w: number) => Block;
    entry: (e: CvEntryModel, w: number) => Block;
    headGap: number;
    entryGap: number;
    sectionGap: number;
  };
  const sectionItems = (sections: CvSectionModel[], style: SectionStyle): Item[] => {
    const items: Item[] = [];
    sections.forEach((section, si) => {
      section.entries.forEach((e, ei) => {
        if (ei === 0) {
          items.push({
            gapBefore: si === 0 ? 0 : style.sectionGap,
            build: (w) => stack([style.heading(section.title, w), style.entry(e, w)], style.headGap),
          });
        } else {
          items.push({ gapBefore: style.entryGap, build: (w) => style.entry(e, w) });
        }
      });
    });
    return items;
  };

  const pieceItems = (
    pieces: Piece[],
    heading: (title: string, w: number) => Block,
    gap: number,
    headGap: number,
  ): Item[] =>
    pieces.flatMap((piece) =>
      piece
        ? [{ gapBefore: gap, build: (w: number) => stack([heading(piece.title, w), listBody(piece, w)], headGap) }]
        : [],
    );

  const MX = 39;
  const bottomEdge = (margin: number) => A4_H - margin;
  const nameParts = splitName(model.name);

  // ═══ A · Editorial split ═════════════════════════════════════════════════
  const layoutEditorial = () => {
    const TOP = 30;
    const BOT = 25.5;
    const innerW = A4_W - MX * 2;
    const right = MX + innerW;
    const half = innerW / 2;

    put(0, MX, TOP, [
      text(model.name, { font: "r", size: 9.75 * S, color: INK }, 0, 0, { spacing: 0.5 }),
      text(model.desiredRole.toUpperCase(), { font: "r", size: 9.75 * S, color: INK }, innerW, 0, {
        align: "r",
        spacing: 0.5,
      }),
      { t: "line", x1: 0, x2: innerW, y: 19.5, color: RULE, width: 1.5 },
    ]);

    const heroY = TOP + 19.5 + 22.5;
    const colW = (innerW - 30) / 2;
    const copyX = showPhoto ? MX + colW + 30 : MX;
    const copyW = showPhoto ? colW : innerW;
    const photoH = colW * 1.1;
    if (showPhoto) put(0, MX, heroY, [{ t: "photo", x: 0, y: 0, w: colW, h: photoH }]);

    const nameSt: Style = { font: "r", size: fitSize(model.name, 40.5, copyW) * S, color: INK };
    const nameBlock = stack(
      [nameParts.first, nameParts.rest]
        .filter(Boolean)
        .map((line) => paragraph(line, nameSt, copyW, { align: "r", leading: 1.12 })),
      0,
    );
    const roleBlock: Block | null = model.desiredRole
      ? paragraph(model.desiredRole, { font: "d", size: 11.25 * S, color: INK }, copyW, { align: "r" })
      : null;
    const ruleBlock: Block | null =
      model.name || model.desiredRole
        ? { h: 1.5, ops: [{ t: "rect", x: copyW - 27, y: 0, w: 27, h: 1.5, color: accent }] }
        : null;
    const head = stack([nameBlock, ...(roleBlock ? [roleBlock] : []), ...(ruleBlock ? [ruleBlock] : [])].filter((b) => b.h > 0), 8);
    put(0, copyX, heroY + 22.5, head.ops);
    const headBottom = heroY + 22.5 + head.h;
    const bio = model.bio ? paragraph(model.bio, { ...body, size: 9.75 * S }, copyW, { align: "r", leading: 1.9 }) : null;
    let heroBottom = Math.max(showPhoto ? heroY + photoH : heroY, headBottom);
    if (bio) {
      const bioY = showPhoto ? Math.max(headBottom + 8, heroY + photoH - bio.h) : headBottom + 10;
      put(0, copyX, bioY, bio.ops);
      heroBottom = Math.max(heroBottom, bioY + bio.h);
    }

    // footer: contacts (2 columns) + QR
    const footW = model.qrTarget ? innerW - 50 - 15 : innerW;
    const cellW = (footW - 19.5) / 2;
    const cells = model.contacts.map((c) => contactLine(c, cellW));
    const rows: Block[] = [];
    for (let i = 0; i < cells.length; i += 2) {
      const pair = cells.slice(i, i + 2);
      rows.push({
        h: Math.max(...pair.map((c) => c.h)),
        ops: pair.flatMap((c, k) => shift(c.ops, k * (cellW + 19.5), 0)),
      });
    }
    const contactsBlock = stack(rows, 1.5);
    const footH = Math.max(contactsBlock.h, model.qrTarget ? 50 : 0);
    const footRuleY = bottomEdge(BOT) - footH - 9;
    put(0, MX, footRuleY, [{ t: "line", x1: 0, x2: innerW, y: 0, color: RULE, width: 1.5 }]);
    put(0, MX, footRuleY + 9, contactsBlock.ops);
    if (model.qrTarget) put(0, right - 50, footRuleY + 9, [{ t: "qr", x: 0, y: 0, size: 50, value: model.qrTarget }]);

    // two columns with a centre rule
    const colsY = heroBottom + 21;
    const colsBottom = footRuleY - 8;
    put(0, MX, colsY, [{ t: "line", x1: 0, x2: innerW, y: 0, color: RULE, width: 1.1 }]);
    put(0, MX + half, colsY, [{ t: "vline", x: 0, y1: 0, y2: colsBottom - colsY, color: RULE, width: 1.1 }]);

    const heading = (title: string): Block => ({
      h: 11.25 * 1.4 + 1,
      ops: [text(title.toUpperCase(), { font: "d", size: 11.25 * S, color: INK }, 0, 0, { spacing: 0.9 })],
    });
    const entry = (e: CvEntryModel, w: number): Block => {
      const periodW = 73.5;
      if (!e.period) {
        const core = entryCore(e, w);
        return { h: core.h, ops: [...core.ops, ...linkBox(w, core.h, e.href)] };
      }
      const core = entryCore(e, w - periodW - 7.5);
      const period = paragraph(e.period, small, periodW);
      return {
        h: Math.max(core.h, period.h),
        ops: [...period.ops, ...shift(core.ops, periodW + 7.5, 0), ...linkBox(w, core.h, e.href)],
      };
    };
    const style: SectionStyle = { heading, entry, headGap: 7.5, entryGap: 10.5, sectionGap: 16.5 };
    const pieces = sidePieces();
    const leftItems = [
      ...sectionItems(pick(model, ["education"]), style),
      ...pieceItems(
        [pieces.personal, pieces.skills, pieces.software, pieces.languages, pieces.location],
        heading,
        16.5,
        7.5,
      ),
    ];
    const rightItems = sectionItems(pick(model, ["experience", "projects", "certification", "awards", "references"]), style);

    const colTop = colsY + 16.5;
    const innerColW = half - 18;
    const leftRest = fillColumn(leftItems, 0, MX, innerColW, colTop, colsBottom);
    const rightRest = fillColumn(rightItems, 0, MX + half + 18, innerColW, colTop, colsBottom);
    continuePages([...rightRest, ...leftRest], { x: MX, w: innerW, top: 40, bottom: bottomEdge(40) });
  };

  // ═══ B · Bold index ══════════════════════════════════════════════════════
  const layoutIndex = () => {
    const TOP = 42;
    const BOT = 39;
    const innerW = A4_W - MX * 2;
    const leftW = innerW * 0.36;
    const leftInner = leftW - 22.5;
    const ruleX = MX + leftW;
    const rightX = ruleX + 24;
    const rightW = A4_W - MX - rightX;
    const bottom = bottomEdge(BOT);

    put(0, 0, 0, [
      { t: "vline", x: ruleX, y1: TOP, y2: bottom, color: INK, width: 1.1 },
      { t: "rect", x: ruleX - 3, y: TOP - 3, w: 6, h: 6, color: INK },
      { t: "rect", x: ruleX - 3, y: bottom - 3, w: 6, h: 6, color: INK },
    ]);

    let y = TOP;
    if (showPhoto) {
      const h = leftInner * 1.25;
      put(0, MX, y, [
        { t: "photo", x: 0, y: 0, w: leftInner, h },
        { t: "line", x1: 0, x2: leftInner, y: 0, color: INK, width: 1.1 },
        { t: "line", x1: 0, x2: leftInner, y: h, color: INK, width: 1.1 },
        { t: "vline", x: 0, y1: 0, y2: h, color: INK, width: 1.1 },
        { t: "vline", x: leftInner, y1: 0, y2: h, color: INK, width: 1.1 },
      ]);
      y += h;
    }
    const leftHead = (title: string): Block => ({
      h: 16 * 1.25,
      ops: [text(title, { font: "d", size: 16 * S, color: INK }, 0, 0)],
    });
    const contactLines = model.contacts.map((c) => contactLine(c, leftInner));
    if (model.place) contactLines.push(paragraph(model.place, body, leftInner));
    if (contactLines.length || model.qrTarget) {
      y += 13.5;
      const parts: Block[] = [leftHead(model.labels.blocks.contact), stack(contactLines, 2 * S)];
      if (model.qrTarget) parts.push({ h: 58, ops: [{ t: "qr", x: 0, y: 0, size: 58, value: model.qrTarget }] });
      const b = stack(parts, 5);
      put(0, MX, y, b.ops);
      y += b.h;
    }
    const pieces = sidePieces();
    if (pieces.personal) {
      y += 13.5;
      const b = stack(
        [leftHead(pieces.personal.title), stack(pieces.personal.lines.map((l) => paragraph(l, body, leftInner)), 0)],
        5,
      );
      put(0, MX, y, b.ops);
      y += b.h;
    }
    // name block pinned to the bottom of the column
    const nameSt: Style = { font: "b", size: fitSize(model.name, 36, leftInner) * S, color: INK };
    const nameLines = [nameParts.first, nameParts.rest ? `${nameParts.rest}.` : "."].filter(Boolean);
    const nameBlock = stack(
      model.name ? nameLines.map((line) => paragraph(line, nameSt, leftInner, { leading: 0.98 })) : [],
      0,
    );
    const roleB = model.desiredRole
      ? paragraph(model.desiredRole.toUpperCase(), { font: "d", size: 9 * S, color: INK }, leftInner)
      : null;
    const bioB = model.bio ? paragraph(model.bio, body, leftInner, { leading: 1.85 }) : null;
    const nameStack = stack(
      [nameBlock, ...(roleB ? [roleB] : []), ...(bioB ? [bioB] : [])].filter((b) => b.h > 0),
      7.5,
    );
    put(0, MX, Math.max(y + 12, bottom - nameStack.h), nameStack.ops);

    // right column
    const heading = (title: string): Block => ({
      h: 20 * 1.25,
      ops: [text(title, { font: "d", size: 20 * S, color: INK }, 0, 0)],
    });
    const entry = (e: CvEntryModel, w: number): Block => {
      const ops: PdfOp[] = [];
      let yy = 0;
      const addRow = (s: string, st: Style, underline: boolean) => {
        const p = paragraph(s, st, w);
        ops.push(...shift(p.ops, 0, yy));
        if (underline && p.h > 0) {
          const lastLine = wrapText(s, w, (t) => measure(t, st.font, st.size)).pop() ?? s;
          ops.push({
            t: "line",
            x1: 0,
            x2: Math.min(w, measure(lastLine, st.font, st.size)),
            y: yy + p.h - st.size * 1.55 * 0.2,
            color: INK,
            width: 0.5,
          });
        }
        yy += p.h;
      };
      addRow(e.lines[0] ? `${e.title} | ${e.lines[0]}` : e.title, body, true);
      e.lines.slice(1).forEach((l) => addRow(l, small, false));
      if (e.period) addRow(e.period, body, true);
      if (e.bullets.length) {
        yy += 2 * S;
        const b = bullets(e.bullets, w);
        ops.push(...shift(b.ops, 0, yy));
        yy += b.h;
      }
      ops.push(...linkBox(w, yy, e.href));
      return { h: yy, ops };
    };
    const style: SectionStyle = { heading, entry, headGap: 6, entryGap: 9, sectionGap: 19.5 };
    const items: Item[] = [
      ...sectionItems(pick(model, ["experience", "projects", "education", "certification", "awards"]), style),
      ...pieceItems([pieces.skills, pieces.software, pieces.languages], heading, 19.5, 6),
      ...sectionItems(pick(model, ["references"]), style).map((it, i) => (i === 0 ? { ...it, gapBefore: 19.5 } : it)),
    ];
    const rest = fillColumn(items, 0, rightX, rightW, TOP, bottom);
    continuePages(rest, { x: MX, w: innerW, top: 40, bottom: bottomEdge(40) });
  };

  // ═══ C · Wide grid ═══════════════════════════════════════════════════════
  const layoutGrid = () => {
    const TOP = 42;
    const BOT = 33;
    const mx = 40.5;
    const innerW = A4_W - mx * 2;
    const right = mx + innerW;

    const lastText = nameParts.rest || nameParts.first;
    const firstText = nameParts.rest ? nameParts.first : "";
    const lastSize = fitSize(lastText, 48, 300) * S;
    const headOps: PdfOp[] = [];
    let nameY = 0;
    if (firstText) {
      headOps.push(text(firstText, { font: "r", size: 24 * S, color: INK }, 1.5, 0));
      nameY = 24 * S * 1.2;
    }
    headOps.push(text(lastText, { font: "b", size: lastSize, color: INK }, 0, nameY + 1.5));
    const nameH = model.name ? nameY + 1.5 + lastSize * 1.05 : 0;
    put(0, mx, TOP, headOps);

    const headerKinds = ["phone", "email", "line"];
    const headerContacts = model.contacts.filter((c) => headerKinds.includes(c.kind));
    const links = model.contacts.filter((c) => !headerKinds.includes(c.kind));
    const contactLines: Block[] = headerContacts.map((c) => {
      const p = paragraph(c.value, body, 210, { align: "r" });
      return { h: p.h, ops: [...p.ops, ...linkBox(210, p.h, c.href)] };
    });
    if (model.place) contactLines.push(paragraph(model.place, body, 210, { align: "r" }));
    const contactsBlock = stack(contactLines, 6);
    put(0, right - 210, TOP + 6, contactsBlock.ops);
    const headH = Math.max(nameH, contactsBlock.h + 6);

    const gridY = TOP + headH + 22.5;
    const bottom = bottomEdge(BOT);
    const pieces = sidePieces();
    const sideLists: Piece[] = [pieces.skills, pieces.software, pieces.languages, pieces.personal];
    const hasSide = showPhoto || links.length > 0 || !!model.qrTarget || sideLists.some(Boolean);
    const gap = 31.5;
    const sideW = hasSide ? (innerW - gap) * (1 / 2.55) : 0;
    const mainW = hasSide ? innerW - gap - sideW : innerW;
    const sideX = mx + mainW + gap;

    const cHeading = (title: string, w: number, plus = true): Block => {
      const size = 10.5 * S;
      const ops: PdfOp[] = [
        text(title.toUpperCase(), { font: "d", size, color: INK }, 0, 0, { spacing: 2.2 }),
        { t: "line", x1: 0, x2: w, y: size * 1.3 + 4, color: RULE, width: 1.1 },
      ];
      if (plus) ops.push(text("+", { font: "r", size: 16 * S, color: accent }, w, -3, { align: "r" }));
      return { h: size * 1.3 + 9, ops };
    };
    const entry = (e: CvEntryModel, w: number): Block => {
      const periodW = e.period ? measure(e.period, "r", small.size) : 0;
      const core = entryCore(e, w, e.period ? w - periodW - 9 : w);
      const ops = [...core.ops];
      if (e.period) ops.push(text(e.period, small, w, 0, { align: "r" }));
      ops.push(...linkBox(w, core.h, e.href));
      return { h: core.h, ops };
    };
    const style: SectionStyle = {
      heading: (t, w) => cHeading(t, w),
      entry,
      headGap: 7.5,
      entryGap: 10.5,
      sectionGap: 19.5,
    };

    const intro: Block[] = [];
    if (model.desiredRole) {
      intro.push(paragraph(model.desiredRole.toUpperCase(), { font: "d", size: 11.25 * S, color: INK }, mainW));
    }
    if (model.bio) intro.push(paragraph(model.bio, body, mainW, { leading: 1.85 }));
    const introBlock = stack(intro, 7.5);
    const mainItems: Item[] = [
      ...(introBlock.h ? [{ gapBefore: 0, build: () => introBlock }] : []),
      ...sectionItems(
        pick(model, ["experience", "projects", "education", "certification", "awards", "references"]),
        style,
      ).map((it, i) => (i === 0 && introBlock.h ? { ...it, gapBefore: 19.5 } : it)),
    ];
    const mainRest = fillColumn(mainItems, 0, mx, mainW, gridY, bottom);

    let sideRest: Item[] = [];
    if (hasSide) {
      let y = gridY;
      if (showPhoto) {
        const h = sideW * 1.25;
        put(0, sideX, y, [{ t: "photo", x: 0, y: 0, w: sideW, h }]);
        y += h + 16;
      }
      const sideItems: Item[] = [
        ...(links.length || model.qrTarget
          ? [
              {
                gapBefore: 0,
                build: (w: number) => {
                  const parts: Block[] = [cHeading(model.labels.blocks.links, w, false), contactList(links, w)];
                  if (model.qrTarget) {
                    parts.push({ h: 58, ops: [{ t: "qr" as const, x: 0, y: 0, size: 58, value: model.qrTarget }] });
                  }
                  return stack(parts, 7.5);
                },
              },
            ]
          : []),
        ...pieceItems(sideLists, (t, w) => cHeading(t, w, false), 19.5, 7.5),
      ];
      sideRest = fillColumn(sideItems, 0, sideX, sideW, y, bottom);
    }
    continuePages([...mainRest, ...sideRest], { x: mx, w: innerW, top: 40, bottom: bottomEdge(40) });
  };

  if (model.template === "index") layoutIndex();
  else if (model.template === "grid") layoutGrid();
  else layoutEditorial();

  return { pages, scale: S };
}
