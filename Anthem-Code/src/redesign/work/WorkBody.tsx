import type { CSSProperties, ReactNode } from "react";
import { proxiedImageSrcSet, proxiedImageUrl } from "@/lib/imageProxy";
import { cellPlace, cellsOf, isLayoutName, isTextCell, parseTextStyle, textCss, type LayoutName, type TextStyle } from "../upload/model";

/** One part of a work's body, top to bottom (mock Upload Preview: pvMods / pvRows). */
export type BodyItem =
  | { kind: "image"; key: string; src: string; local?: boolean; ratio: number | null }
  | { kind: "video"; key: string; src: string; poster?: string }
  | { kind: "text"; key: string; text: string; style: TextStyle }
  | { kind: "row"; key: string; layout: LayoutName; cells: BodyCell[] };

export type BodyCell = { image: string; local?: boolean; fit: boolean } | { text: string; style: TextStyle } | null;

const isHttp = (u: unknown): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim());
const okSize = (s: unknown): s is [number, number] => Array.isArray(s) && s.length === 2 && s.every((n) => typeof n === "number" && n > 0);

/** Stored blocks of a work made in the new editor (see upload/model.ts) as body items. */
export function bodyFromBlocks(raw: unknown, sizes: Record<string, [number, number]> | null): BodyItem[] {
  if (!Array.isArray(raw)) return [];
  const out: BodyItem[] = [];
  raw.forEach((item, n) => {
    if (!item || typeof item !== "object") return;
    const b = item as Record<string, unknown>;
    const key = typeof b.id === "string" && b.id ? b.id : `b${n}`;
    if (b.type === "image" && isHttp(b.url)) {
      const s = okSize(b.size) ? b.size : sizes && okSize(sizes[b.url]) ? sizes[b.url] : null;
      out.push({ kind: "image", key, src: b.url, ratio: s ? s[0] / s[1] : null });
    } else if (b.type === "video" && isHttp(b.url)) {
      out.push({ kind: "video", key, src: b.url, ...(isHttp(b.posterUrl) ? { poster: b.posterUrl } : {}) });
    } else if (b.type === "body" && typeof b.scText === "string" && b.scText.trim()) {
      out.push({ kind: "text", key, text: b.scText, style: parseTextStyle(b.scStyle) });
    } else if (b.type === "sc_layout" && isLayoutName(b.layout)) {
      const stored = Array.isArray(b.cells) ? b.cells : [];
      const cells: BodyCell[] = cellsOf(b.layout).map((spec, i) => {
        const c = stored[i] as Record<string, unknown> | null | undefined;
        if (!c || typeof c !== "object") return null;
        if (isTextCell(spec)) return typeof c.text === "string" && c.text.trim() ? { text: c.text, style: parseTextStyle(c.style) } : null;
        return isHttp(c.image) ? { image: c.image, fit: c.fit === true } : null;
      });
      if (cells.some(Boolean)) out.push({ kind: "row", key, layout: b.layout, cells });
    }
  });
  return out;
}

/** Every picture of a body, top to bottom — the same order (and index) `imageExtra` / `onOpen` get. */
export function bodyPictures(items: readonly BodyItem[]): string[] {
  const out: string[] = [];
  for (const it of items) {
    if (it.kind === "image") out.push(it.src);
    else if (it.kind === "row") for (const c of it.cells) if (c && "image" in c) out.push(c.image);
  }
  return out;
}

const IMG_WIDTHS = [640, 1080, 1920] as const;

type ImgProps = { src: string; local?: boolean; sizes: string; alt?: string; eager?: boolean; style?: CSSProperties; className?: string; onOpen?: () => void };

/** Tap / click / Enter on a picture that can open full screen. */
export const pictureOpenProps = (onOpen: (() => void) | undefined) =>
  onOpen
    ? {
        role: "button",
        tabIndex: 0,
        "aria-label": "ดูภาพเต็มจอ",
        "data-open": "",
        onClick: onOpen,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        },
      }
    : {};

function Img({ src, local, sizes, alt = "", eager, style, className, onOpen }: ImgProps) {
  if (local) return <img src={src} alt={alt} className={className} style={style} {...pictureOpenProps(onOpen)} />;
  const srcSet = proxiedImageSrcSet(src, IMG_WIDTHS);
  return (
    <img
      src={proxiedImageUrl(src, 1920, 85)}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={style}
      {...pictureOpenProps(onOpen)}
    />
  );
}

/**
 * A work's body the way its owner laid it out: pictures at their real shape, styled text, and
 * Template rows on the 6-column grid. Used by Upload's Preview and by the Work page.
 */
export default function WorkBody({
  items,
  sizes = "(max-width: 600px) 100vw, 1000px",
  firstAlt = "",
  imageExtra,
  onOpen,
}: {
  items: readonly BodyItem[];
  sizes?: string;
  /** Alt text of the first picture (the work's title); the others are decorative. */
  firstAlt?: string;
  /** Drawn over each picture, numbered top to bottom (the Work page's like button). */
  imageExtra?: (src: string, index: number) => ReactNode;
  /** Opens a picture full screen (the Work page's lightbox), by its index in `bodyPictures`. */
  onOpen?: (index: number) => void;
}) {
  let n = 0;
  const pic = () => n++;
  return (
    <div className="sc-wb">
      {items.map((it) => {
        if (it.kind === "image") {
          const i = pic();
          return (
            <div key={it.key} className="sc-wb-img" style={{ aspectRatio: String(it.ratio ?? 4 / 3) }}>
              <Img src={it.src} local={it.local} sizes={sizes} alt={i === 0 ? firstAlt : ""} eager={i < 2} onOpen={onOpen ? () => onOpen(i) : undefined} />
              {imageExtra?.(it.src, i)}
            </div>
          );
        }
        if (it.kind === "video") {
          return (
            <video key={it.key} className="sc-wb-video" src={it.src} poster={it.poster} controls playsInline preload="metadata" />
          );
        }
        if (it.kind === "text") {
          return (
            <p key={it.key} className="sc-wb-text" style={textCss(it.style)}>
              {it.text}
            </p>
          );
        }
        return (
          <div key={it.key} className="sc-wb-row">
            {cellsOf(it.layout).map((spec, i) => {
              const c = it.cells[i];
              const place = cellPlace(spec);
              if (!c) return <div key={i} aria-hidden="true" className="sc-wb-cell sc-wb-empty" style={place} />;
              if ("text" in c) {
                return (
                  <p key={i} className="sc-wb-cell sc-wb-celltext" style={{ ...place, ...textCss(c.style) }}>
                    {c.text}
                  </p>
                );
              }
              const k = pic();
              return (
                <div key={i} className={c.fit ? "sc-wb-cell sc-wb-fit" : "sc-wb-cell"} style={place}>
                  <Img src={c.image} local={c.local} sizes={sizes} alt={k === 0 ? firstAlt : ""} eager={k < 2} onOpen={onOpen ? () => onOpen(k) : undefined} />
                  {imageExtra?.(c.image, k)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
