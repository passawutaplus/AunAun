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
import { ChevronLeft, ChevronRight, MessageCircle, X } from "lucide-react";
import ImageActionBar from "@/components/project/ImageActionBar";
import LightboxColorTools from "@/components/project/LightboxColorTools";
import {
  GuidesMenu,
  LightboxFilterDefs,
  LightboxGuidesOverlay,
  LightboxLoupe,
  LoupeButton,
  OrientationButtons,
  UPRIGHT,
  ViewModeMenu,
  lightboxFilter,
  orientationTransform,
  toImagePoint,
  type ImageOrientation,
  type LightboxGuide,
  type LightboxViewMode,
} from "@/components/project/LightboxViewTools";
import { lightboxBackdropVariants, lightboxTransition } from "@/lib/motion";
import { isolateColorUrl } from "@/lib/imageColorTools";
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
  /** "Contact about this work" — opens the hire/contact flow for this project. */
  onContact?: () => void;
};

const SWIPE_PX = 56;

/** Read one pixel of the image at a relative point (0–1). Null when the host blocks reading pixels. */
async function sampleImageColor(src: string, rx: number, ry: number): Promise<string | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const sx = Math.min(img.naturalWidth - 1, Math.max(0, Math.floor(rx * img.naturalWidth)));
  const sy = Math.min(img.naturalHeight - 1, Math.max(0, Math.floor(ry * img.naturalHeight)));
  ctx.drawImage(img, sx, sy, 1, 1, 0, 0, 1, 1);
  try {
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return null;
  }
}

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
  onContact,
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
  const [grayscale, setGrayscale] = useState(false);
  const [viewMode, setViewMode] = useState<LightboxViewMode>("normal");
  const [blurPx, setBlurPx] = useState(6);
  const [orientation, setOrientation] = useState<ImageOrientation>(UPRIGHT);
  const imgRef = useRef<HTMLImageElement>(null);
  const [guide, setGuide] = useState<LightboxGuide>("none");
  const [spiralTurn, setSpiralTurn] = useState(0);
  const [loupe, setLoupe] = useState(false);
  const [loupeZoom, setLoupeZoom] = useState(4);
  const [isolateHex, setIsolateHex] = useState<string | null>(null);
  const [isolatedSrc, setIsolatedSrc] = useState<string | null>(null);
  const loupeRef = useRef(false);
  loupeRef.current = loupe;
  const [pickMode, setPickMode] = useState(false);
  const [pickedHex, setPickedHex] = useState<string | null>(null);

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
      // A dialog opened from inside the lightbox (e.g. share) handles its own keys first.
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (zoomedRef.current) {
          resetView();
          return;
        }
        onClose();
        return;
      }
      if (zoomedRef.current) return;
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]");
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "z" || e.key === "Z") {
          setLoupe((v) => !v);
          return;
        }
        if (e.key === "m" || e.key === "M") {
          setOrientation((o) => ({ ...o, flipX: !o.flipX }));
          return;
        }
        if (e.key === "r" || e.key === "R") {
          setOrientation((o) => ({ ...o, rotate: ((o.rotate + 90) % 360) as ImageOrientation["rotate"] }));
          return;
        }
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        go(1);
      }
    };
    document.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = "";
    };
  }, [open, onClose, go, resetView]);

  useEffect(() => {
    resetView();
    setPickMode(false);
    setPickedHex(null);
    setIsolateHex(null);
  }, [open, safeIndex, resetView]);

  // Colour isolate renders a processed copy of the image; drop it when the colour or image changes.
  useEffect(() => {
    if (!isolateHex || !currentSrc) {
      setIsolatedSrc(null);
      return;
    }
    let url: string | null = null;
    let alive = true;
    void isolateColorUrl(currentSrc, isolateHex).then((u) => {
      url = u;
      if (!alive) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      if (!u) setIsolateHex(null);
      setIsolatedSrc(u);
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isolateHex, currentSrc]);

  // Keep swipe-nav when not zoomed (touch on backdrop/stage).
  const onTouchStart = (e: ReactTouchEvent) => {
    if (zoomedRef.current || loupeRef.current) return;
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
    // Ignore secondary buttons / UI chrome. The loupe replaces tap-to-zoom while it's on.
    if (e.button !== 0 || loupeRef.current) return;
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
  const imageFilter = lightboxFilter(viewMode, blurPx, grayscale);
  const shownSrc = isolatedSrc ?? currentSrc;

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
          <LightboxFilterDefs />
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

          {!zoomed ? (
            <div className="absolute bottom-4 left-1/2 z-30 w-max max-w-[95vw] -translate-x-1/2">
              <LightboxColorTools
                src={currentSrc}
                grayscale={grayscale}
                onGrayscaleChange={setGrayscale}
                pickMode={pickMode}
                onPickModeChange={(on) => {
                  setPickMode(on);
                  if (on) setLoupe(false);
                }}
                pickedHex={pickedHex}
                isolateHex={isolateHex}
                onIsolateChange={setIsolateHex}
              >
                <OrientationButtons value={orientation} onChange={setOrientation} />
                <LoupeButton
                  on={loupe}
                  onChange={(on) => {
                    setLoupe(on);
                    if (on) setPickMode(false);
                  }}
                />
                <ViewModeMenu
                  mode={viewMode}
                  onModeChange={setViewMode}
                  blurPx={blurPx}
                  onBlurChange={setBlurPx}
                />
                <GuidesMenu
                  guide={guide}
                  onGuideChange={setGuide}
                  spiralTurn={spiralTurn}
                  onSpiralTurn={() => setSpiralTurn((t) => t + 1)}
                />
              </LightboxColorTools>
            </div>
          ) : null}

          {/* Full-stage drag surface when zoomed so pan isn't limited to the unscaled box. */}
          <div
            className={cn(
              "group z-10 flex items-center justify-center",
              zoomed
                ? "absolute inset-0 cursor-grab touch-none"
                : "relative max-h-[78vh] max-w-[95vw] -translate-y-6",
              zoomed && panning && "cursor-grabbing",
              !zoomed && !loupe && "cursor-zoom-in",
            )}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={onStagePointerDown}
          >
            {/* Flips / quarter turns wrap the image and its guides so both turn together. */}
            <div
              className="relative transition-transform duration-300"
              style={{ transform: zoomed ? undefined : orientationTransform(orientation) }}
            >
              <motion.img
                ref={imgRef}
                key={currentSrc}
                src={shownSrc}
                alt={alt}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  // Swipe hint only when not zoomed (pan uses motion values instead).
                  x: zoomed ? undefined : dragHint * 0.15,
                }}
                exit={{ opacity: 0 }}
                transition={lightboxTransition}
                style={{ ...(zoomed ? { x, y, scale } : { scale }), filter: imageFilter }}
                className={cn(
                  "pointer-events-none origin-center rounded-lg object-contain shadow-sm select-none transition-[filter] duration-300",
                  // Turned sideways the image's width becomes its on-screen height — swap the limits.
                  !zoomed && orientation.rotate % 180 ? "max-h-[95vw] max-w-[78vh]" : "max-h-[78vh] max-w-[95vw]",
                )}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
              {!zoomed ? <LightboxGuidesOverlay guide={guide} spiralTurn={spiralTurn} /> : null}
            </div>
            {/* Bottom-center actions: always on mobile; hover on desktop. Hidden while zoomed 200%. */}
            {showActions && !zoomed ? (
              <div
                className={cn(
                  // Phones: the buttons sit under the image, not on it. Desktop: hover overlay at the bottom.
                  "absolute left-1/2 top-full z-20 mt-3 -translate-x-1/2",
                  "opacity-100 pointer-events-auto transition-opacity duration-150",
                  "md:bottom-3 md:top-auto md:mt-0",
                  "md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto",
                )}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <ImageActionBar
                    projectId={projectId!}
                    projectTitle={projectTitle!}
                    imageUrl={currentSrc}
                    imageIndex={safeIndex}
                    forceVisible
                    className="justify-center whitespace-nowrap"
                  />
                  {onContact ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onContact();
                      }}
                      aria-label="ทักแชทจากภาพนี้"
                      title="ทักแชทจากภาพนี้"
                      className="group/chat inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-white/10 bg-black/25 px-3 py-2 text-xs font-medium text-white shadow-sm backdrop-blur-md transition-all hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {/* Icon only; the label slides out on hover / keyboard focus (desktop) */}
                      <span className="max-w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/chat:ml-1.5 group-hover/chat:max-w-[9rem] group-hover/chat:opacity-100 group-focus-visible/chat:ml-1.5 group-focus-visible/chat:max-w-[9rem] group-focus-visible/chat:opacity-100 motion-reduce:transition-none">
                        ทักแชทจากภาพนี้
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          {loupe && !zoomed && !pickMode ? (
            <LightboxLoupe
              src={shownSrc}
              imgRef={imgRef}
              filter={imageFilter}
              orientation={orientation}
              zoom={loupeZoom}
              onZoomChange={setLoupeZoom}
            />
          ) : null}
          {pickMode && !zoomed ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="แตะเพื่อเลือกสีจากภาพ"
              className="absolute inset-0 z-20 cursor-crosshair"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const img = imgRef.current;
                const pt = img ? toImagePoint(img, e.clientX, e.clientY, orientation) : null;
                if (!pt) {
                  setPickMode(false);
                  return;
                }
                void sampleImageColor(currentSrc, pt.x / pt.w, pt.y / pt.h).then((hex) => {
                  if (hex) setPickedHex(hex);
                  setPickMode(false);
                });
              }}
            />
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default ImageLightbox;
