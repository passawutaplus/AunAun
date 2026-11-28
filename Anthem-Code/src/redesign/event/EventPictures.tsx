import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { proxiedImageSrcSet, proxiedImageUrl } from "@/lib/imageProxy";

type Props = {
  /** Cover first, then the extra pictures. */
  pictures: string[];
  title: string;
  /** Width / height of a picture when known. */
  size: (src: string) => [number, number] | null;
};

/** Frame shape: the cover's own ratio, kept between 4:5 and 16:9 so a very tall or wide cover does not take over. */
const frameRatio = (s: [number, number] | null) => (s ? Math.min(16 / 9, Math.max(4 / 5, s[0] / s[1])) : 4 / 3);

const Arrow = ({ d }: { d: string }) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/**
 * Cover + extra pictures as one slider (owner 2026-11-28: a long column was hard to read, above all on phones).
 * Every picture is shown whole inside the frame (never cropped). Swipe on touch screens; ‹ › and a 1 / N counter,
 * in the round white buttons and counter of the home highlight.
 */
export default function EventPictures({ pictures, title, size }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = pictures.length;

  const onScroll = useCallback(() => {
    const el = track.current;
    if (el && el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const go = (to: number) => {
    const el = track.current;
    if (!el) return;
    const i = (to + count) % count;
    const smooth = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
    setIndex(i);
  };

  // A resize keeps the current picture in place.
  useEffect(() => {
    const el = track.current;
    if (!el || count < 2) return;
    const ro = new ResizeObserver(() => el.scrollTo({ left: index * el.clientWidth }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, count]);

  if (!count) return <div className="ev-cover" data-empty="" />;

  const frame: CSSProperties = { aspectRatio: String(frameRatio(size(pictures[0]))) };

  return (
    <div
      className="ev-cover"
      role={count > 1 ? "region" : undefined}
      aria-roledescription={count > 1 ? "carousel" : undefined}
      aria-label={count > 1 ? "รูปของงาน" : undefined}
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
    >
      <div ref={track} className="ev-slides" style={frame} onScroll={count > 1 ? onScroll : undefined}>
        {pictures.map((src, i) => {
          const s = size(src);
          return (
            <div
              key={src}
              className="ev-slide"
              role={count > 1 ? "group" : undefined}
              aria-roledescription={count > 1 ? "slide" : undefined}
              aria-label={count > 1 ? `${i + 1} จาก ${count}` : undefined}
            >
              <img
                src={proxiedImageUrl(src, 1600)}
                srcSet={proxiedImageSrcSet(src, [640, 1080, 1600, 2048]) || undefined}
                sizes="(max-width: 600px) 100vw, (max-width: 1440px) calc(100vw - 536px), 904px"
                alt={i === 0 ? title : `ภาพรายละเอียด ${i}`}
                width={s?.[0]}
                height={s?.[1]}
                loading={i === 0 ? undefined : "lazy"}
                decoding="async"
              />
            </div>
          );
        })}
      </div>
      {count > 1 ? (
        <>
          <button type="button" className="ev-sl-btn ev-sl-prev" aria-label="รูปก่อนหน้า" onClick={() => go(index - 1)}>
            <Arrow d="M14.5 6l-6 6 6 6" />
          </button>
          <button type="button" className="ev-sl-btn ev-sl-next" aria-label="รูปถัดไป" onClick={() => go(index + 1)}>
            <Arrow d="M9.5 6l6 6-6 6" />
          </button>
          <span className="ev-sl-pos" lang="en" aria-live="polite">{`${index + 1} / ${count}`}</span>
        </>
      ) : null}
    </div>
  );
}
