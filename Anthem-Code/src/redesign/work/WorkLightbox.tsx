import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { proxiedImageSrcSet, proxiedImageUrl } from "@/lib/imageProxy";

type Props = {
  /** The work's pictures, top to bottom. */
  pictures: readonly string[];
  start: number;
  /** The work's title, for the pictures' alt text. */
  title: string;
  onClose: () => void;
};

type View = { s: number; x: number; y: number };
const REST: View = { s: 1, x: 0, y: 0 };
const TAP_ZOOM = 2.5;
const MAX_ZOOM = 4;
const clampScale = (s: number) => Math.min(MAX_ZOOM, Math.max(1, s));

/**
 * A picture full screen (old ImageLightbox, new look; no colour tools): the whole picture, never cropped.
 * Tap / click zooms in where you tapped and back; drag moves the zoomed picture; pinch or the mouse wheel zoom;
 * ‹ › and the arrow keys (or a swipe on phones) go to the next picture; Esc zooms out first, then closes.
 */
export default function WorkLightbox({ pictures, start, title, onClose }: Props) {
  const [i, setI] = useState(() => Math.min(Math.max(0, start), pictures.length - 1));
  const [view, setView] = useState<View>(REST);
  const [live, setLive] = useState(false); // a finger / the mouse is moving the picture: no easing
  const [nudge, setNudge] = useState(0); // swipe feedback before letting go
  const zoomed = view.s > 1.01;
  const count = pictures.length;
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const go = useCallback(
    (d: number) => {
      setI((v) => Math.min(count - 1, Math.max(0, v + d)));
      setView(REST);
    },
    [count],
  );

  /** The picture's centre without the zoom (layout, not transform). */
  const centre = () => {
    const r = img.current?.getBoundingClientRect();
    const v = viewRef.current;
    if (!r) return { cx: 0, cy: 0, w: 0, h: 0 };
    return { cx: r.left + r.width / 2 - v.x, cy: r.top + r.height / 2 - v.y, w: r.width / v.s, h: r.height / v.s };
  };
  /** Zoom to `s` keeping the point under (px, py) where it is. */
  const zoomAt = (s: number, px: number, py: number) => {
    const v = viewRef.current;
    const { cx, cy, w, h } = centre();
    const next = clampScale(s);
    if (next <= 1.01) return setView(REST);
    const ix = (px - cx - v.x) / v.s;
    const iy = (py - cy - v.y) / v.s;
    setView(clampPan({ s: next, x: px - cx - next * ix, y: py - cy - next * iy }, w, h));
  };
  const clampPan = (v: View, w: number, h: number): View => {
    const mx = (w * (v.s - 1)) / 2;
    const my = (h * (v.s - 1)) / 2;
    return { s: v.s, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
  };

  // Keys: handled before the page's own Esc / arrows, and not passed on (the work stays open behind).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (viewRef.current.s > 1.01) setView(REST);
        else closeRef.current();
      } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && viewRef.current.s <= 1.01) {
        e.preventDefault();
        e.stopPropagation();
        go(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [go]);

  // Focus moves in, and back to the picture that opened it on close.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    return () => before?.focus?.();
  }, []);

  // The wheel zooms (needs a non-passive listener to keep the page from scrolling).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(viewRef.current.s * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // zoomAt only reads refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pointers: one = tap / drag / swipe, two = pinch.
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<{ x0: number; y0: number; v0: View; moved: boolean; onImg: boolean; d0: number; m0: { x: number; y: number } } | null>(null);
  const dist = () => {
    const [a, b] = [...pts.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const mid = () => {
    const [a, b] = [...pts.current.values()];
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : { x: 0, y: 0 };
  };

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // A second finger starts a pinch from here; it is never a tap.
    g.current = { x0: e.clientX, y0: e.clientY, v0: viewRef.current, moved: pts.current.size > 1, onImg: e.target === img.current, d0: dist(), m0: mid() };
    setLive(true);
  };
  const move = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId) || !g.current) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const st = g.current;
    if (pts.current.size >= 2) {
      if (!st.d0) {
        st.d0 = dist();
        st.m0 = mid();
        st.v0 = viewRef.current;
      }
      const m = mid();
      const { cx, cy, w, h } = centre();
      const s = clampScale(st.v0.s * (dist() / st.d0));
      const ix = (st.m0.x - cx - st.v0.x) / st.v0.s;
      const iy = (st.m0.y - cy - st.v0.y) / st.v0.s;
      st.moved = true;
      return setView(s <= 1.01 ? REST : clampPan({ s, x: m.x - cx - s * ix, y: m.y - cy - s * iy }, w, h));
    }
    const dx = e.clientX - st.x0;
    const dy = e.clientY - st.y0;
    if (Math.abs(dx) + Math.abs(dy) > 6) st.moved = true;
    if (st.v0.s > 1.01) {
      const { w, h } = centre();
      setView(clampPan({ s: st.v0.s, x: st.v0.x + dx, y: st.v0.y + dy }, w, h));
    } else if (count > 1 && Math.abs(dx) > Math.abs(dy)) {
      setNudge(dx);
    }
  };
  const up = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.delete(e.pointerId);
    const st = g.current;
    if (!st) return;
    if (pts.current.size > 0) {
      // One finger of a pinch lifted: the other one carries on moving the picture from where it is.
      const [rest] = [...pts.current.values()];
      g.current = { x0: rest.x, y0: rest.y, v0: viewRef.current, moved: true, onImg: false, d0: 0, m0: rest };
      return;
    }
    g.current = null;
    setLive(false);
    setNudge(0);
    const dx = e.clientX - st.x0;
    const dy = e.clientY - st.y0;
    if (!st.moved) {
      if (st.onImg) {
        if (viewRef.current.s > 1.01) setView(REST);
        else zoomAt(TAP_ZOOM, e.clientX, e.clientY);
      } else if (viewRef.current.s <= 1.01) {
        onClose();
      }
      return;
    }
    if (st.v0.s <= 1.01 && viewRef.current.s <= 1.01 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1);
  };
  const cancel = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size === 0) {
      g.current = null;
      setLive(false);
      setNudge(0);
    }
  };

  const src = pictures[i];
  const transform = zoomed ? `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s})` : nudge ? `translate3d(${nudge * 0.4}px, 0, 0)` : undefined;

  // On <body>, above everything (the work layer, the chat button): its own .sc-app root for the tokens.
  return createPortal(
    <div className="sc-app wk-lb" role="dialog" aria-modal="true" aria-label={`ภาพ ${i + 1} จาก ${count}`}>
      <div
        ref={box}
        className="wk-lb-stage"
        data-zoomed={zoomed ? "" : undefined}
        data-live={live ? "" : undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
      >
        <img
          key={src}
          ref={img}
          className="wk-lb-img"
          src={proxiedImageUrl(src, 1920, 85)}
          srcSet={proxiedImageSrcSet(src, [1080, 1920], 85) || undefined}
          sizes="100vw"
          alt={title ? `${title} (${i + 1}/${count})` : ""}
          draggable={false}
          style={transform ? { transform } : undefined}
        />
      </div>

      <button ref={closeBtn} type="button" className="wk-lb-btn wk-lb-x" aria-label={zoomed ? "ย่อกลับ" : "ปิด"} onClick={() => (zoomed ? setView(REST) : onClose())}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {count > 1 ? (
        <span className="wk-lb-n" aria-hidden="true">
          {i + 1} / {count}
        </span>
      ) : null}
      {count > 1 && !zoomed && i > 0 ? (
        <button type="button" className="wk-lb-btn wk-lb-side wk-lb-prev" aria-label="ภาพก่อนหน้า" onClick={() => go(-1)}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      ) : null}
      {count > 1 && !zoomed && i < count - 1 ? (
        <button type="button" className="wk-lb-btn wk-lb-side wk-lb-next" aria-label="ภาพถัดไป" onClick={() => go(1)}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
