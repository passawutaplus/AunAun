import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Cropper, { type Area, type MediaSize, type Point } from "react-easy-crop";
import { ArrowDownRight } from "lucide-react";
import { getCroppedImageFile } from "@/lib/cropImage";
import { communityCropMinZoom } from "@/lib/communityMediaAspect";
import {
  computeCropSize,
  DEFAULT_FLEX_GRID_CROP_ASPECT,
  exportSizeFromCropPixels,
  FLEX_GRID_CROP_ASPECT_ORDER,
  FLEX_GRID_CROP_ASPECTS,
  type FlexGridCropAspectKey,
} from "@/lib/flexGridCropAspect";
import { cn } from "@/lib/utils";

const MAX_ZOOM = 3;
const MIN_CROP_W = 40;
const MIN_CROP_H = 40;

export type FlexGridInlineCropResult = {
  file: File;
  frameAspectRatio: number;
  cornerRadiusPercent: number;
};

export type FlexGridInlineCropHandle = {
  confirm: () => Promise<void>;
  /** Restore full original image (100%) at its natural aspect and apply. */
  restoreOriginal: () => Promise<void>;
};

type Props = {
  imageUrl: string;
  /** First-upload URL; restore uses this when present. */
  originalImageUrl?: string | null;
  className?: string;
  onConfirm: (result: FlexGridInlineCropResult) => void | Promise<void>;
  /** Prefer this for "คืนภาพต้นฉบับ" — restores without re-encoding. */
  onRestoreOriginal?: () => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
};

type Edge = "n" | "s" | "e" | "w";

function clampCorner(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const FlexGridInlineCrop = forwardRef<FlexGridInlineCropHandle, Props>(
  function FlexGridInlineCrop(
    {
      imageUrl,
      originalImageUrl,
      className,
      onConfirm,
      onRestoreOriginal,
      onCancel,
      saving,
    },
    ref,
  ) {
    const [flexAspect, setFlexAspect] = useState<FlexGridCropAspectKey>(DEFAULT_FLEX_GRID_CROP_ASPECT);
    const [freeRatio, setFreeRatio] = useState(1);
    /** Explicit free-mode crop box size (px). Edge drag edits W/H independently. */
    const [freeSize, setFreeSize] = useState<{ w: number; h: number } | null>(null);
    const [frameScale, setFrameScale] = useState(0.85);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [minZoom, setMinZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [cornerRadius, setCornerRadius] = useState(0);
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
    const [localSrc, setLocalSrc] = useState<string | null>(null);
    const [cropReady, setCropReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const hostRef = useRef<HTMLDivElement>(null);
    const mediaSizeRef = useRef<MediaSize | null>(null);
    const freeInitRef = useRef(false);

    const flexMeta = FLEX_GRID_CROP_ASPECTS[flexAspect];
    const isFree = flexAspect === "free";
    const activeRatio =
      isFree ? freeRatio : flexMeta.ratio && flexMeta.ratio > 0 ? flexMeta.ratio : 1;

    // Blob URL so canvas export is not blocked by CORS on storage hosts.
    useEffect(() => {
      let revoked: string | null = null;
      let cancelled = false;
      setCropReady(false);
      setLocalSrc(null);
      freeInitRef.current = false;
      (async () => {
        try {
          const res = await fetch(imageUrl);
          if (!res.ok) throw new Error("โหลดรูปไม่สำเร็จ");
          const blob = await res.blob();
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          revoked = url;
          setLocalSrc(url);
          window.setTimeout(() => {
            if (!cancelled) setCropReady(true);
          }, 80);
        } catch {
          if (!cancelled) {
            setLocalSrc(imageUrl);
            setCropReady(true);
          }
        }
      })();
      return () => {
        cancelled = true;
        if (revoked) URL.revokeObjectURL(revoked);
      };
    }, [imageUrl]);

    useEffect(() => {
      const el = hostRef.current;
      if (!el) return;
      const measure = () => {
        const r = el.getBoundingClientRect();
        setContainerSize({ w: Math.round(r.width), h: Math.round(r.height) });
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, [cropReady]);

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [onCancel]);

    const fitFreeSize = useCallback(
      (ratio: number, scale = 0.9) => {
        if (containerSize.w <= 0 || containerSize.h <= 0) return;
        const size = computeCropSize(containerSize.w, containerSize.h, ratio, scale);
        setFreeSize({ w: size.width, h: size.height });
        setFreeRatio(ratio);
      },
      [containerSize.w, containerSize.h],
    );

    const onMediaLoaded = useCallback(
      (media: MediaSize) => {
        mediaSizeRef.current = media;
        const naturalRatio = media.naturalWidth / Math.max(1, media.naturalHeight);
        if (isFree && !freeInitRef.current) {
          freeInitRef.current = true;
          fitFreeSize(naturalRatio, 0.9);
        }
        const ratioForZoom = isFree ? naturalRatio : activeRatio;
        const nextMin = communityCropMinZoom(
          media.naturalWidth,
          media.naturalHeight,
          ratioForZoom,
        );
        setMinZoom(nextMin);
        setZoom((z) => Math.max(nextMin, Math.min(MAX_ZOOM, z)));
      },
      [activeRatio, isFree, fitFreeSize],
    );

    // When switching into Free (or container ready before media), seed a box.
    useEffect(() => {
      if (!isFree || containerSize.w <= 0) return;
      if (freeSize) return;
      const media = mediaSizeRef.current;
      const ratio =
        media && media.naturalWidth > 0
          ? media.naturalWidth / Math.max(1, media.naturalHeight)
          : freeRatio;
      fitFreeSize(ratio, 0.9);
    }, [isFree, containerSize.w, containerSize.h, freeSize, freeRatio, fitFreeSize]);

    const readNaturalSize = useCallback(async (): Promise<{ w: number; h: number }> => {
      const cached = mediaSizeRef.current;
      if (cached && cached.naturalWidth > 0 && cached.naturalHeight > 0) {
        return { w: cached.naturalWidth, h: cached.naturalHeight };
      }
      const src = localSrc ?? imageUrl;
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error("โหลดขนาดภาพไม่สำเร็จ"));
        img.src = src;
      });
    }, [localSrc, imageUrl]);

    const onCropComplete = useCallback((_: Area, pixels: Area) => {
      setCroppedAreaPixels(pixels);
    }, []);

    const cropSize =
      isFree && freeSize
        ? { width: freeSize.w, height: freeSize.h }
        : containerSize.w > 0 && containerSize.h > 0
          ? computeCropSize(containerSize.w, containerSize.h, activeRatio, frameScale)
          : undefined;

    const selectAspect = (key: FlexGridCropAspectKey) => {
      setFlexAspect(key);
      if (key === "free") {
        freeInitRef.current = false;
        const media = mediaSizeRef.current;
        const ratio =
          media && media.naturalWidth > 0
            ? media.naturalWidth / Math.max(1, media.naturalHeight)
            : freeRatio;
        fitFreeSize(ratio, 0.9);
        freeInitRef.current = true;
      } else {
        setFreeSize(null);
        setFrameScale(0.85);
      }
    };

    const onEdgePointerDown = (edge: Edge) => (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!hostRef.current || !cropSize || !isFree) return;
      e.preventDefault();
      e.stopPropagation();
      const host = hostRef.current;
      const startW = cropSize.width;
      const startH = cropSize.height;

      const applyFromPointer = (clientX: number, clientY: number) => {
        const rect = host.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxW = Math.max(MIN_CROP_W, rect.width * 0.96);
        const maxH = Math.max(MIN_CROP_H, rect.height * 0.96);

        let w = startW;
        let h = startH;
        if (edge === "e" || edge === "w") {
          w = Math.min(maxW, Math.max(MIN_CROP_W, Math.abs(clientX - cx) * 2));
        } else {
          h = Math.min(maxH, Math.max(MIN_CROP_H, Math.abs(clientY - cy) * 2));
        }
        const ratio = Math.min(4, Math.max(0.25, w / Math.max(1, h)));
        setFreeSize({ w: Math.round(w), h: Math.round(h) });
        setFreeRatio(ratio);
      };

      applyFromPointer(e.clientX, e.clientY);
      const onMove = (ev: PointerEvent) => applyFromPointer(ev.clientX, ev.clientY);
      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    };

    const onFrameResizePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!hostRef.current || !cropSize || isFree) return;
      e.preventDefault();
      e.stopPropagation();
      const host = hostRef.current;
      const startAspect = activeRatio;

      const applyFromPointer = (clientX: number, clientY: number) => {
        const rect = host.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const halfW = Math.max(20, clientX - cx);
        const halfH = Math.max(10, clientY - cy);
        const scaleFromX = Math.abs(halfW * 2);
        const scaleFromY = Math.abs(halfH * 2) * startAspect;
        const targetW =
          Math.abs(clientX - cx) >= Math.abs(clientY - cy) ? scaleFromX : scaleFromY;
        const full = computeCropSize(rect.width, rect.height, startAspect, 1);
        setFrameScale(Math.min(1, Math.max(0.25, targetW / Math.max(1, full.width))));
      };

      applyFromPointer(e.clientX, e.clientY);
      const onMove = (ev: PointerEvent) => applyFromPointer(ev.clientX, ev.clientY);
      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    };

    const confirm = useCallback(async () => {
      if (!croppedAreaPixels || !localSrc || busy || saving) return;
      setBusy(true);
      try {
        const meta = FLEX_GRID_CROP_ASPECTS[flexAspect];
        const exportDims =
          flexAspect === "free" || meta.ratio == null
            ? exportSizeFromCropPixels(croppedAreaPixels.width, croppedAreaPixels.height)
            : { width: meta.exportW, height: meta.exportH };
        const name =
          imageUrl.split("/").pop()?.split("?")[0]?.replace(/\.\w+$/, "") || "crop";
        const file = await getCroppedImageFile(
          localSrc,
          croppedAreaPixels,
          `${name}.png`,
          "image/png",
          {
            width: exportDims.width,
            height: exportDims.height,
            cornerRadiusPercent: cornerRadius,
          },
        );
        await onConfirm({
          file,
          frameAspectRatio: activeRatio,
          cornerRadiusPercent: cornerRadius,
        });
      } finally {
        setBusy(false);
      }
    }, [
      croppedAreaPixels,
      localSrc,
      busy,
      saving,
      flexAspect,
      imageUrl,
      cornerRadius,
      activeRatio,
      onConfirm,
    ]);

    const restoreOriginal = useCallback(async () => {
      if (busy || saving) return;
      setBusy(true);
      try {
        // Preferred path: parent swaps URL back to first upload + natural aspect.
        if (onRestoreOriginal) {
          await onRestoreOriginal();
          return;
        }
        // Fallback: export full current (or original) image.
        const src = (originalImageUrl?.trim() || localSrc || imageUrl).trim();
        if (!src) return;
        const { w, h } = await new Promise<{ w: number; h: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => reject(new Error("โหลดขนาดภาพไม่สำเร็จ"));
          img.src = src;
        });
        const ratio = w / Math.max(1, h);
        setFlexAspect("free");
        fitFreeSize(ratio, 1);
        setCrop({ x: 0, y: 0 });
        setCornerRadius(0);

        const res = await fetch(src);
        if (!res.ok) throw new Error("โหลดภาพต้นฉบับไม่สำเร็จ");
        const blob = await res.blob();
        const base =
          src.split("/").pop()?.split("?")[0]?.replace(/\.\w+$/, "") || "original";
        const ext =
          blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        const file = new File([blob], `${base}.${ext}`, {
          type: blob.type || "image/jpeg",
          lastModified: Date.now(),
        });
        await onConfirm({
          file,
          frameAspectRatio: ratio,
          cornerRadiusPercent: 0,
        });
      } finally {
        setBusy(false);
      }
    }, [
      busy,
      saving,
      onRestoreOriginal,
      originalImageUrl,
      localSrc,
      imageUrl,
      fitFreeSize,
      onConfirm,
    ]);

    useImperativeHandle(ref, () => ({ confirm, restoreOriginal }), [confirm, restoreOriginal]);

    const previewRadius = `${cornerRadius / 2}%`;
    const isBusy = busy || !!saving;
    const edgeHit = 10;

    return (
      <div
        className={cn("relative h-full w-full", className)}
        style={
          {
            ["--inline-crop-radius" as string]: previewRadius,
          } as CSSProperties
        }
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-auto absolute bottom-full left-1/2 z-[70] mb-1 flex w-max max-w-[min(100vw,28rem)] -translate-x-1/2 flex-wrap justify-center gap-0.5 rounded-full border border-border/70 bg-card px-1.5 py-1 shadow-md"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {FLEX_GRID_CROP_ASPECT_ORDER.map((key) => {
            const meta = FLEX_GRID_CROP_ASPECTS[key];
            const active = flexAspect === key;
            return (
              <button
                key={key}
                type="button"
                disabled={isBusy}
                onClick={() => selectAspect(key)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        <div ref={hostRef} className="absolute inset-0 overflow-hidden bg-muted">
          {cropReady && localSrc ? (
            <Cropper
              key={`${localSrc}-${flexAspect}`}
              image={localSrc}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={MAX_ZOOM}
              aspect={activeRatio}
              cropSize={cropSize}
              cropShape="rect"
              showGrid
              restrictPosition={zoom >= minZoom + 0.01}
              onMediaLoaded={onMediaLoaded}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              classes={{
                cropAreaClassName: "flex-inline-crop-area-radius",
              }}
            />
          ) : null}

          {cropSize && isFree ? (
            <>
              {(
                [
                  {
                    edge: "w" as const,
                    title: "ลากขอบซ้าย",
                    cursor: "cursor-ew-resize",
                    style: {
                      left: `calc(50% - ${cropSize.width / 2}px - ${edgeHit / 2}px)`,
                      top: `calc(50% - ${cropSize.height / 2}px)`,
                      width: edgeHit,
                      height: cropSize.height,
                    },
                  },
                  {
                    edge: "e" as const,
                    title: "ลากขอบขวา",
                    cursor: "cursor-ew-resize",
                    style: {
                      left: `calc(50% + ${cropSize.width / 2}px - ${edgeHit / 2}px)`,
                      top: `calc(50% - ${cropSize.height / 2}px)`,
                      width: edgeHit,
                      height: cropSize.height,
                    },
                  },
                  {
                    edge: "n" as const,
                    title: "ลากขอบบน",
                    cursor: "cursor-ns-resize",
                    style: {
                      left: `calc(50% - ${cropSize.width / 2}px)`,
                      top: `calc(50% - ${cropSize.height / 2}px - ${edgeHit / 2}px)`,
                      width: cropSize.width,
                      height: edgeHit,
                    },
                  },
                  {
                    edge: "s" as const,
                    title: "ลากขอบล่าง",
                    cursor: "cursor-ns-resize",
                    style: {
                      left: `calc(50% - ${cropSize.width / 2}px)`,
                      top: `calc(50% + ${cropSize.height / 2}px - ${edgeHit / 2}px)`,
                      width: cropSize.width,
                      height: edgeHit,
                    },
                  },
                ] as const
              ).map((h) => (
                <button
                  key={h.edge}
                  type="button"
                  title={h.title}
                  aria-label={h.title}
                  disabled={isBusy}
                  className={cn(
                    "absolute z-30 touch-none border-0 bg-transparent p-0 disabled:opacity-50",
                    h.cursor,
                  )}
                  style={h.style}
                  onPointerDown={onEdgePointerDown(h.edge)}
                >
                  <span
                    className={cn(
                      "absolute bg-primary shadow-sm",
                      h.edge === "w" || h.edge === "e"
                        ? "left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        : "left-1/2 top-1/2 h-1 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full",
                    )}
                  />
                </button>
              ))}
            </>
          ) : null}

          {cropSize && !isFree ? (
            <button
              type="button"
              title="ลากเพื่อย่อ/ขยายกรอบครอป"
              aria-label="ลากมุมขวาล่างเพื่อย่อขยายกรอบครอป"
              disabled={isBusy}
              className="absolute z-30 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-md ring-2 ring-background touch-none disabled:opacity-50"
              style={{
                left: `calc(50% + ${cropSize.width / 2}px - 10px)`,
                top: `calc(50% + ${cropSize.height / 2}px - 10px)`,
              }}
              onPointerDown={onFrameResizePointerDown}
            >
              <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          ) : null}
        </div>

        <div
          className="pointer-events-auto absolute left-full top-1/2 z-[70] ml-1.5 flex h-[min(100%,12rem)] w-9 -translate-y-1/2 flex-col items-center justify-center gap-3 rounded-full border border-border/70 bg-card py-2 shadow-md"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <label className="flex h-[42%] min-h-[48px] w-full flex-col items-center gap-1">
            <span className="text-[9px] font-medium text-muted-foreground [writing-mode:vertical-rl]">
              ซูม
            </span>
            <input
              type="range"
              min={minZoom}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={isBusy}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-full w-4 accent-primary"
              style={{ writingMode: "vertical-lr", direction: "rtl" }}
              aria-label="ซูม"
            />
          </label>
          <label className="flex h-[42%] min-h-[48px] w-full flex-col items-center gap-1">
            <span className="text-[9px] font-medium text-muted-foreground [writing-mode:vertical-rl]">
              มุม
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={cornerRadius}
              disabled={isBusy}
              onChange={(e) => setCornerRadius(clampCorner(Number(e.target.value)))}
              className="h-full w-4 accent-primary"
              style={{ writingMode: "vertical-lr", direction: "rtl" }}
              aria-label="ความโค้งมุม"
            />
          </label>
        </div>

        <style>{`
          .flex-inline-crop-area-radius {
            border-radius: var(--inline-crop-radius, 0) !important;
          }
        `}</style>
      </div>
    );
  },
);
