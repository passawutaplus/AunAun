import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { proxiedImageSrcSet, proxiedImageUrl } from "@/lib/imageProxy";

export type TileWork = {
  id: string;
  title: string;
  artist: string;
  /** Second line under the title: "Category · Artist". */
  sub: string;
  cover: string;
  /** width / height of the cover, or null when the size was never recorded. */
  ratio: number | null;
};

type Props = {
  work: TileWork;
  saved: boolean;
  onToggleSave: (id: string) => void;
  /** Added by "load more": rises in when it scrolls into view. */
  isNew?: boolean;
  delay?: number;
  eager?: boolean;
};

/**
 * A work on the home grid. The frame always has the picture's own ratio (never cropped);
 * a cover without a recorded size is shown whole inside a square frame instead.
 */
export default function WorkTile({ work, saved, onToggleSave, isNew, delay, eager }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!isNew || !el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver((entries, ob) => {
      if (entries.some((e) => e.isIntersecting)) {
        setInView(true);
        ob.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [isNew]);

  const label = work.artist ? `${work.title} โดย ${work.artist}` : work.title;

  return (
    <div
      ref={ref}
      className="mn-tile"
      data-new={isNew ? "" : undefined}
      data-in={isNew && inView ? "" : undefined}
      style={{ aspectRatio: String(work.ratio ?? 1), transitionDelay: isNew && delay ? `${delay.toFixed(2)}s` : undefined }}
    >
      <img
        data-sc-work=""
        src={proxiedImageUrl(work.cover, 640)}
        srcSet={proxiedImageSrcSet(work.cover, [384, 640, 828, 1080]) || undefined}
        sizes="(max-width: 900px) 50vw, 30vw"
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={work.ratio ? undefined : { objectFit: "contain" }}
      />
      <span className="mn-shade" aria-hidden="true" />
      <Link to={`/showcase/${work.id}`} aria-label={`เปิดผลงาน ${label}`} className="mn-open" />
      <span className="mn-name">
        <span className="mn-name-t">{work.title}</span>
        <span className="mn-name-s">{work.sub}</span>
      </span>
      <button
        type="button"
        className="mn-save"
        aria-label={`เก็บ ${work.title} เข้าคอลเลคชั่น`}
        aria-pressed={saved}
        onClick={() => onToggleSave(work.id)}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M6 3h12v18l-6-4.5L6 21z" />
        </svg>
      </button>
    </div>
  );
}
