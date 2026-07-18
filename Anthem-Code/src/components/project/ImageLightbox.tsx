import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import ImageActionBar from "@/components/project/ImageActionBar";
import { lightboxBackdropVariants, lightboxTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  /** Preferred: full project image list for prev/next. */
  images?: string[];
  /** Active index within `images` (ignored when only `src` is set). */
  index?: number;
  onIndexChange?: (index: number) => void;
  /** Legacy single-image API. */
  src?: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
  projectId?: string;
  projectTitle?: string;
};

const SWIPE_PX = 56;
const ZOOM_SCALE = 2;
const CLICK_MOVE_PX = 6;

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

const ImageLightbox = ({
  images,
  index = 0,
  onIndexChange,
  src,
  alt = "",
  open,
  onClose,
  projectId,
  projectTitle,
}: Props) => {
  const list =
    images && images.length > 0
      ? images.filter((u) => !!u?.trim())
      : src?.trim()
        ? [src.trim()]
        : [];
  const safeIndex = list.length ? Math.max(0, Math.min(list.length - 1, index)) : 0;
  const currentSrc = list[safeIndex] ?? "";
  const canNav = list.length > 1;

  const touchStartX = useRef<number | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const zoomedRef = useRef(false);
  const [dragHint, setDragHint] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [panning, setPanning] = useState(false);

  // Direct motion values so pan updates every frame without React re-render lag.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  zoomedRef.current = zoomed;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!canNav || !list.length) return;
      const next = (safeIndex + dir + list.length) % list.length;
      onIndexChange?.(next);
    },
    [canNav, list.length, safeIndex, onIndexChange],
  );

  const resetView = useCallback(() => {
    setZoomed(false);
    zoomedRef.current = false;
    setPanning(false);
    setDragHint(0);
    dragRef.current = null;
    x.set(0);
    y.set(0);
    scale.set(1);
  }, [x, y, scale]);

  const applyZoom = useCallback(
    (next: boolean) => {
      setZoomed(next);
      zoomedRef.current = next;
      if (next) {
        scale.set(ZOOM_SCALE);
        x.set(0);
        y.set(0);
      } else {
        scale.set(1);
        x.set(0);
        y.set(0);
      }
    },
    [scale, x, y],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (zoomedRef.current) {
          resetView();
          return;
        }
        onClose();
        return;
      }
      if (zoomedRef.current) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, go, resetView]);

  useEffect(() => {
    resetView();
  }, [open, safeIndex, resetView]);

  // Keep swipe-nav when not zoomed (touch on backdrop/stage).
  const onTouchStart = (e: ReactTouchEvent) => {
    if (zoomedRef.current) return;
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
    setDragHint(0);
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    if (zoomedRef.current || touchStartX.current == null || !canNav) return;
    const tx = e.changedTouches[0]?.clientX ?? touchStartX.current;
    setDragHint(tx - touchStartX.current);
  };

  const onTouchEnd = (e: ReactTouchEvent) => {
    if (zoomedRef.current || touchStartX.current == null) return;
    const tx = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = tx - touchStartX.current;
    touchStartX.current = null;
    setDragHint(0);
    if (Math.abs(dx) < SWIPE_PX) return;
    go(dx < 0 ? 1 : -1);
  };

  // Document-level listeners so drag keeps working even if pointer leaves the image.
  useEffect(() => {
    if (!open) return;

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > CLICK_MOVE_PX || Math.abs(dy) > CLICK_MOVE_PX) {
        drag.moved = true;
      }
      if (!zoomedRef.current) return;
      e.preventDefault();
      x.set(drag.originX + dx);
      y.set(drag.originY + dy);
    };

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const moved = drag.moved;
      dragRef.current = null;
      setPanning(false);

      if (!moved) {
        // Tap → toggle zoom
        applyZoom(!zoomedRef.current);
      }
    };

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [open, applyZoom, x, y]);

  const onStagePointerDown = (e: ReactPointerEvent) => {
    // Ignore secondary buttons / UI chrome.
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: x.get(),
      originY: y.get(),
      moved: false,
    };
    if (zoomedRef.current) setPanning(true);
  };

  const showActions = !!projectId && !!projectTitle && !!currentSrc;

  return createPortal(
    <AnimatePresence>
      {open && currentSrc ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="ดูภาพขนาดใหญ่"
          onClick={() => {
            if (zoomedRef.current) {
              resetView();
              return;
            }
            onClose();
          }}
          variants={lightboxBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={lightboxTransition}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/90 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // While zoomed, X only exits zoom back to the large popup (same as Escape).
              if (zoomedRef.current) {
                resetView();
                return;
              }
              onClose();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={zoomed ? "ออกจากซูม" : "ปิด"}
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-transparent text-white/90 hover:text-white transition"
          >
            <X className="w-5 h-5" strokeWidth={2.2} />
          </button>

          {canNav && !zoomed ? (
            <>
              <button
                type="button"
                aria-label="ภาพก่อนหน้า"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute left-2 sm:left-4 z-30 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-transparent text-white/90 hover:text-white transition"
              >
                <ChevronLeft className="h-7 w-7" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                aria-label="ภาพถัดไป"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute right-2 sm:right-4 z-30 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-transparent text-white/90 hover:text-white transition"
              >
                <ChevronRight className="h-7 w-7" strokeWidth={2.2} />
              </button>
            </>
          ) : null}

          {/* Full-stage drag surface when zoomed so pan isn't limited to the unscaled box. */}
          <div
            className={cn(
              "group z-10 flex items-center justify-center",
              zoomed
                ? "absolute inset-0 cursor-grab touch-none"
                : "relative max-h-[92vh] max-w-[95vw]",
              zoomed && panning && "cursor-grabbing",
              !zoomed && "cursor-zoom-in",
            )}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={onStagePointerDown}
          >
            <motion.img
              key={currentSrc}
              src={currentSrc}
              alt={alt}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                // Swipe hint only when not zoomed (pan uses motion values instead).
                x: zoomed ? undefined : dragHint * 0.15,
              }}
              exit={{ opacity: 0 }}
              transition={lightboxTransition}
              style={zoomed ? { x, y, scale } : { scale }}
              className="pointer-events-none max-h-[92vh] max-w-[95vw] origin-center rounded-lg object-contain shadow-2xl select-none"
              draggable={false}
            />

            {/* Bottom-center actions: hover image only; hidden while zoomed 200%. */}
            {showActions && !zoomed ? (
              <div
                className={cn(
                  "absolute bottom-3 left-1/2 z-20 -translate-x-1/2",
                  "opacity-0 pointer-events-none transition-opacity duration-150",
                  "group-hover:opacity-100 group-hover:pointer-events-auto",
                )}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <ImageActionBar
                  projectId={projectId!}
                  projectTitle={projectTitle!}
                  imageUrl={currentSrc}
                  imageIndex={safeIndex}
                  forceVisible
                  className="justify-center"
                />
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default ImageLightbox;
