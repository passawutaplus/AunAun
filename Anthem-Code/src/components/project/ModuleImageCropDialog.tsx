import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Cropper, { type Area, type MediaSize, type Point } from "react-easy-crop";
import { ArrowDownRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCroppedImageFile } from "@/lib/cropImage";
import {
  type CommunityMediaAspect,
  communityCropMinZoom,
  COMMUNITY_MEDIA_ASPECT_ORDER,
  COMMUNITY_MEDIA_ASPECTS,
  communityMediaAspectMeta,
  DEFAULT_COMMUNITY_MEDIA_ASPECT,
  normalizeCommunityMediaAspect,
} from "@/lib/communityMediaAspect";
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

export type ModuleImageCropConfirmResult = {
  file: File;
  applyToAll: boolean;
  aspect: CommunityMediaAspect;
  cornerRadiusPercent: number;
  /** Width/height of the crop frame — used by Full Grid to resize the module box. */
  frameAspectRatio?: number;
};

type Props = {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (result: ModuleImageCropConfirmResult) => void;
  onCancel: () => void;
  /** Show checkbox to apply aspect + corner crop to every slide image. */
  showApplyToAll?: boolean;
  /** Lock crop frame to a fixed ratio (e.g. 3-up grid slots). */
  lockedRatio?: number;
  lockedExport?: { width: number; height: number };
  lockedRatioLabel?: string;
  /**
   * Full Grid: pick 1:1 / 16:9 / 9:16 / 4:3 / 3:4 / free and resize the crop
   * frame via the SE corner handle (ignores lockedRatio).
   */
  variant?: "default" | "flex_grid";
};

function clampCorner(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function FlexGridAspectPicker({
  value,
  onChange,
}: {
  value: FlexGridCropAspectKey;
  onChange: (key: FlexGridCropAspectKey) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
      {FLEX_GRID_CROP_ASPECT_ORDER.map((key) => {
        const meta = FLEX_GRID_CROP_ASPECTS[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "min-w-0 rounded-xl border px-1.5 py-2 text-center transition-colors",
              active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <span className="block truncate text-[11px] font-medium">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ModuleImageCropDialog({
  file,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  showApplyToAll = false,
  lockedRatio,
  lockedExport,
  lockedRatioLabel,
  variant = "default",
}: Props) {
  const isFlexGrid = variant === "flex_grid";
  const [aspect, setAspect] = useState<CommunityMediaAspect>(DEFAULT_COMMUNITY_MEDIA_ASPECT);
  /** Default variant opens at the image's own ratio; a fixed ratio is picked from the dropdown. */
  const [useOriginal, setUseOriginal] = useState(true);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const [zoomInput, setZoomInput] = useState("100");
  /** Free ("original") crop frame in screen px; each edge drags on its own. */
  const [freeFrame, setFreeFrame] = useState<{ w: number; h: number } | null>(null);
  const [mediaDisp, setMediaDisp] = useState<{ w: number; h: number } | null>(null);
  const [flexAspect, setFlexAspect] = useState<FlexGridCropAspectKey>(DEFAULT_FLEX_GRID_CROP_ASPECT);
  const freeMeta = communityMediaAspectMeta(normalizeCommunityMediaAspect(aspect));
  const locked = !isFlexGrid && typeof lockedRatio === "number" && lockedRatio > 0;
  const flexMeta = FLEX_GRID_CROP_ASPECTS[flexAspect];
  const meta = locked
    ? {
        ratio: lockedRatio,
        exportW: lockedExport?.width ?? freeMeta.exportW,
        exportH: lockedExport?.height ?? freeMeta.exportH,
      }
    : isFlexGrid
      ? {
          ratio: flexMeta.ratio,
          exportW: flexMeta.exportW,
          exportH: flexMeta.exportH,
        }
      : useOriginal
        ? { ratio: naturalRatio ?? 1, exportW: freeMeta.exportW, exportH: freeMeta.exportH }
        : freeMeta;
  const originalMode = !locked && !isFlexGrid && useOriginal;
  /** Frame can be resized by dragging (flex grid, or the free "original" crop). */
  const resizableFrame = isFlexGrid || originalMode;
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cornerRadius, setCornerRadius] = useState(0);
  const [cornerInput, setCornerInput] = useState("0");
  const [applyToAll, setApplyToAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cropReady, setCropReady] = useState(false);
  /** 0.25–1: shrink/grow the crop frame inside the container (Full Grid). */
  const [frameScale, setFrameScale] = useState(0.85);
  /** Width/height when Free is selected (lets the frame go tall ↔ wide). */
  const [freeRatio, setFreeRatio] = useState(1);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const cropHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setCropReady(false);
      return;
    }
    const t = window.setTimeout(() => setCropReady(true), 220);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setMinZoom(1);
    setCroppedAreaPixels(null);
    setCornerRadius(0);
    setCornerInput("0");
    setAspect(DEFAULT_COMMUNITY_MEDIA_ASPECT);
    setUseOriginal(true);
    setNaturalRatio(null);
    const probe = new Image();
    probe.onload = () => {
      if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
        setNaturalRatio(probe.naturalWidth / probe.naturalHeight);
      }
    };
    probe.src = url;
    setFlexAspect(DEFAULT_FLEX_GRID_CROP_ASPECT);
    setFrameScale(0.85);
    setFreeRatio(1);
    setApplyToAll(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!showApplyToAll) setApplyToAll(false);
  }, [showApplyToAll]);

  useEffect(() => {
    if (!open || !resizableFrame) return;
    const el = cropHostRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setContainerSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, resizableFrame, cropReady]);

  // Free crop starts as the whole image; the frame is then dragged to any shape.
  useEffect(() => {
    if (!originalMode) return;
    setFreeFrame(mediaDisp ? { w: mediaDisp.w, h: mediaDisp.h } : null);
    if (mediaDisp) setCrop({ x: 0, y: 0 });
  }, [originalMode, mediaDisp]);

  // Keep the zoom number in step with pinch / slider changes.
  useEffect(() => {
    setZoomInput(String(Math.round(zoom * 100)));
  }, [zoom]);

  const applyZoomPercent = useCallback(
    (percent: number) => {
      const next = Number.isFinite(percent)
        ? Math.max(minZoom, Math.min(MAX_ZOOM, percent / 100))
        : zoom;
      setZoom(next);
      setZoomInput(String(Math.round(next * 100)));
    },
    [minZoom, zoom],
  );

  const applyCorner = useCallback((value: number) => {
    const next = clampCorner(value);
    setCornerRadius(next);
    setCornerInput(String(next));
  }, []);

  const activeRatio =
    originalMode && freeFrame
      ? freeFrame.w / Math.max(1, freeFrame.h)
      : isFlexGrid && flexAspect === "free"
      ? freeRatio
      : typeof meta.ratio === "number" && meta.ratio > 0
        ? meta.ratio
        : 1;

  const onMediaLoaded = useCallback(
    (media: MediaSize) => {
      const nextMin = communityCropMinZoom(
        media.naturalWidth,
        media.naturalHeight,
        activeRatio,
      );
      setMediaDisp({ w: media.width, h: media.height });
      setMinZoom(nextMin);
      setZoom((z) => Math.max(nextMin, Math.min(MAX_ZOOM, z)));
    },
    [activeRatio],
  );

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const cropSize = originalMode
    ? freeFrame
      ? { width: freeFrame.w, height: freeFrame.h }
      : undefined
    : resizableFrame && containerSize.w > 0 && containerSize.h > 0
      ? computeCropSize(containerSize.w, containerSize.h, activeRatio, frameScale)
      : undefined;

  type FrameHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

  /**
   * Drag an edge / corner of the crop frame. The frame stays centred (react-easy-crop),
   * so dragging one side resizes symmetrically; free modes also change the ratio.
   */
  const onFrameResizePointerDown = (handle: FrameHandle) => (e: ReactPointerEvent<HTMLElement>) => {
    if (!resizableFrame || !cropHostRef.current || !cropSize) return;
    e.preventDefault();
    e.stopPropagation();
    const host = cropHostRef.current;
    const startAspect = activeRatio;
    const freeMode = originalMode || flexAspect === "free";
    const startHalfW = cropSize.width / 2;
    const startHalfH = cropSize.height / 2;
    const movesX = handle.includes("e") || handle.includes("w");
    const movesY = handle.includes("n") || handle.includes("s");

    const applyFromPointer = (clientX: number, clientY: number) => {
      const rect = host.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const halfW = movesX ? Math.max(20, Math.abs(clientX - cx)) : startHalfW;
      const halfH = movesY ? Math.max(20, Math.abs(clientY - cy)) : startHalfH;
      let ratio = startAspect;
      let targetW: number;

      if (freeMode) {
        ratio = Math.min(5, Math.max(0.2, halfW / Math.max(1, halfH)));
        setFreeRatio(ratio);
        targetW = halfW * 2;
      } else if (Math.abs(halfW - startHalfW) >= Math.abs(halfH - startHalfH)) {
        targetW = halfW * 2;
      } else {
        targetW = halfH * 2 * startAspect;
      }

      const full = computeCropSize(rect.width, rect.height, ratio, 1);
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

  /**
   * Free crop: drag one edge / corner and only that side moves. react-easy-crop keeps the
   * frame centred, so the image is panned by the same amount to pin the opposite side.
   */
  const onFreeEdgePointerDown = (handle: FrameHandle) => (e: ReactPointerEvent<HTMLElement>) => {
    if (!originalMode || !freeFrame || !mediaDisp || !cropHostRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = cropHostRef.current.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, w: freeFrame.w, h: freeFrame.h, cx: crop.x, cy: crop.y };
    const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
    const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
    const imgHalfW = (mediaDisp.w * zoom) / 2;
    const imgHalfH = (mediaDisp.h * zoom) / 2;
    const MIN = 40;

    const axis = (d: number, s: -1 | 0 | 1, size0: number, c0: number, imgHalf: number, boxMax: number) => {
      if (s === 0) return { size: size0, c: c0 };
      // Edge on the dragged side follows the finger; centre offset shifts by the same delta.
      let size = size0 + 2 * s * d;
      let c = c0 - d;
      size = Math.max(MIN, Math.min(boxMax, size));
      c = c0 - (s * (size - size0)) / 2;
      // Keep the frame on the image.
      const over = Math.abs(c) + size / 2 - imgHalf;
      if (over > 0) {
        size -= over;
        c = c0 - (s * (size - size0)) / 2;
      }
      return { size: Math.max(MIN, size), c };
    };

    const onMove = (ev: PointerEvent) => {
      const x = axis(ev.clientX - start.x, sx as -1 | 0 | 1, start.w, start.cx, imgHalfW, rect.width);
      const y = axis(ev.clientY - start.y, sy as -1 | 0 | 1, start.h, start.cy, imgHalfH, rect.height);
      setFreeFrame({ w: x.size, h: y.size });
      setCrop({ x: x.c, y: y.c });
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const handleConfirm = async () => {
    if (!file || !imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const mime = "image/png";
      const exportDims =
        originalMode
          ? // Original ratio: keep the cropped pixels (no upscale), long edge capped at 2400.
            exportSizeFromCropPixels(
              croppedAreaPixels.width,
              croppedAreaPixels.height,
              Math.min(2400, Math.max(croppedAreaPixels.width, croppedAreaPixels.height)),
            )
          : isFlexGrid && (meta.ratio == null || flexAspect === "free")
          ? exportSizeFromCropPixels(croppedAreaPixels.width, croppedAreaPixels.height)
          : { width: meta.exportW, height: meta.exportH };
      const cropped = await getCroppedImageFile(imageSrc, croppedAreaPixels, file.name, mime, {
        width: exportDims.width,
        height: exportDims.height,
        cornerRadiusPercent: cornerRadius,
      });
      onConfirm({
        file: cropped,
        applyToAll: showApplyToAll && applyToAll,
        aspect,
        cornerRadiusPercent: cornerRadius,
        frameAspectRatio: isFlexGrid ? activeRatio : undefined,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  // Preview: 0–100 maps to 0–50% of the shorter side of the crop frame.
  const previewRadius = `${cornerRadius / 2}%`;

  // Remount only when media/aspect changes — resizing the frame via cropSize
  // should keep pan/zoom state.
  const cropperKey = isFlexGrid
    ? `${imageSrc}-${flexAspect}`
    : `${imageSrc}-${locked ? lockedRatio : originalMode ? `orig-${naturalRatio}` : aspect}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-y-auto overflow-x-hidden p-0 flex max-h-[calc(100dvh-1.5rem)] flex-col data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100">
        <DialogHeader className="shrink-0 px-4 pb-2 pt-4">
          <DialogTitle className="text-base">ครอบภาพ</DialogTitle>
          <p className="text-xs font-normal text-muted-foreground">
            {locked
              ? `สัดส่วนล็อก ${lockedRatioLabel ?? "ตามช่อง"} — ลาก/ซูมจัดกรอบก่อนบันทึก`
              : isFlexGrid
                ? "เลือกสัดส่วน แล้วลากมุมขวาล่างเพื่อย่อขยายกรอบ · ลาก/ซูมจัดภาพก่อนบันทึก"
                : "ลาก/ซูมจัดกรอบ · เปลี่ยนสัดส่วนได้ใต้ภาพ"}
          </p>
        </DialogHeader>

        {locked ? null : isFlexGrid ? (
          <div className="px-4 pb-3">
            <FlexGridAspectPicker value={flexAspect} onChange={setFlexAspect} />
          </div>
        ) : null}

        <div
          ref={cropHostRef}
          className="relative mx-auto h-[min(70dvh,520px)] min-h-[180px] w-full max-w-md shrink bg-muted"
          style={
            {
              ["--module-crop-radius" as string]: previewRadius,
            } as CSSProperties
          }
        >
          {imageSrc && cropReady && (!originalMode || naturalRatio) ? (
            <Cropper
              key={cropperKey}
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={MAX_ZOOM}
              aspect={resizableFrame ? activeRatio : meta.ratio}
              cropSize={cropSize}
              cropShape="rect"
              showGrid
              restrictPosition={originalMode || zoom >= minZoom + 0.01}
              onMediaLoaded={onMediaLoaded}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              classes={{
                cropAreaClassName: "module-crop-area-radius",
              }}
            />
          ) : null}
          {originalMode && cropSize ? (
            <FreeFrameHandles
              width={cropSize.width}
              height={cropSize.height}
              onHandlePointerDown={onFreeEdgePointerDown}
            />
          ) : null}
          {isFlexGrid && cropSize ? (
            <button
              type="button"
              title="ลากเพื่อย่อ/ขยายกรอบครอป"
              aria-label="ลากมุมขวาล่างเพื่อย่อขยายกรอบครอป"
              className="absolute z-30 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-md ring-2 ring-background touch-none"
              style={{
                left: `calc(50% + ${cropSize.width / 2}px - 10px)`,
                top: `calc(50% + ${cropSize.height / 2}px - 10px)`,
              }}
              onPointerDown={onFrameResizePointerDown("se")}
            >
              <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          ) : null}
          <style>{`
            .module-crop-area-radius {
              border-radius: var(--module-crop-radius, 0) !important;
            }
          `}</style>
        </div>

        <div className="space-y-3 px-4 py-3">
          {isFlexGrid ? (
            <p className="text-[11px] text-muted-foreground">
              ลากมุมขวาล่างของกรอบครอปเพื่อย่อ/ขยาย
              {flexAspect === "free" ? " · โหมด Free ลากเพื่อเปลี่ยนสัดส่วนได้ด้วย" : ""}
            </p>
          ) : null}

          {!locked && !isFlexGrid ? (
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="module-crop-aspect">
                สัดส่วน
              </label>
              <Select
                value={useOriginal ? "original" : aspect}
                onValueChange={(v) => {
                  if (v === "original") {
                    setUseOriginal(true);
                  } else {
                    setUseOriginal(false);
                    setAspect(v as CommunityMediaAspect);
                  }
                }}
              >
                <SelectTrigger id="module-crop-aspect" className="h-8 w-44 rounded-none text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original" className="text-xs">
                    ต้นฉบับ (ครอบอิสระ)
                  </SelectItem>
                  {COMMUNITY_MEDIA_ASPECT_ORDER.map((key) => {
                    const m = COMMUNITY_MEDIA_ASPECTS[key];
                    return (
                      <SelectItem key={key} value={key} className="text-xs">
                        {m.label} · {m.ratioLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-xs text-muted-foreground">ซูม</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={Math.round(minZoom * 100)}
                  max={MAX_ZOOM * 100}
                  step={1}
                  value={zoomInput}
                  onChange={(e) => setZoomInput(e.target.value)}
                  onBlur={() => applyZoomPercent(Number(zoomInput))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyZoomPercent(Number(zoomInput));
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="h-7 w-16 rounded-none px-2 text-center text-xs"
                  aria-label={`ซูม ${Math.round(minZoom * 100)} ถึง ${MAX_ZOOM * 100} เปอร์เซ็นต์`}
                />
                <span className="text-[10px] text-muted-foreground">%</span>
              </div>
            </div>
            <input
              type="range"
              min={minZoom}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="เลื่อนซูม"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-xs text-muted-foreground">ความโค้งมุม</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={cornerInput}
                  onChange={(e) => setCornerInput(e.target.value)}
                  onBlur={() => applyCorner(Number(cornerInput))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCorner(Number(cornerInput));
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="h-7 w-16 rounded-none px-2 text-center text-xs"
                  aria-label="ความโค้งมุม 0 ถึง 100"
                />
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={cornerRadius}
              onChange={(e) => applyCorner(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="เลื่อนความโค้งมุม"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              0 = มุมเหลี่ยม · 100 = โค้งสุดขอบ
            </p>
          </div>

          {showApplyToAll ? (
            <label className="flex cursor-pointer items-start gap-2 rounded-none border border-border/60 bg-muted/30 px-3 py-2.5">
              <Checkbox
                checked={applyToAll}
                onCheckedChange={(v) => setApplyToAll(v === true)}
                className="mt-0.5"
                aria-label="ใช้การครอปกับทุกภาพในสไลด์"
              />
              <span className="min-w-0 space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  ใช้กับทุกภาพในสไลด์
                </span>
                <span className="block text-[11px] leading-snug text-muted-foreground">
                  ใช้สัดส่วนและความโค้งมุมเดียวกันกับภาพอื่น (จัดกลางอัตโนมัติ)
                </span>
              </span>
            </label>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 gap-2 px-4 pb-4 sm:gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={saving || !croppedAreaPixels}
          >
            {saving ? "กำลังครอบ..." : applyToAll && showApplyToAll ? "ใช้กับทุกภาพ" : "ใช้ภาพนี้"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function urlToImageFile(url: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("โหลดรูปเดิมไม่สำเร็จ");
  const blob = await res.blob();
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const name = url.split("/").pop()?.split("?")[0]?.replace(/\.\w+$/, "") || "crop";
  return new File([blob], `${name}.${ext}`, { type: blob.type || "image/jpeg" });
}

const FRAME_HANDLES: { id: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"; x: -1 | 0 | 1; y: -1 | 0 | 1; cursor: string }[] = [
  { id: "nw", x: -1, y: -1, cursor: "nwse-resize" },
  { id: "n", x: 0, y: -1, cursor: "ns-resize" },
  { id: "ne", x: 1, y: -1, cursor: "nesw-resize" },
  { id: "e", x: 1, y: 0, cursor: "ew-resize" },
  { id: "se", x: 1, y: 1, cursor: "nwse-resize" },
  { id: "s", x: 0, y: 1, cursor: "ns-resize" },
  { id: "sw", x: -1, y: 1, cursor: "nesw-resize" },
  { id: "w", x: -1, y: 0, cursor: "ew-resize" },
];

/** Corner + edge grips around the centred crop frame (free crop). 32px touch targets. */
function FreeFrameHandles({
  width,
  height,
  onHandlePointerDown,
}: {
  width: number;
  height: number;
  onHandlePointerDown: (
    handle: (typeof FRAME_HANDLES)[number]["id"],
  ) => (e: ReactPointerEvent<HTMLElement>) => void;
}) {
  return (
    <>
      {FRAME_HANDLES.map((h) => {
        const corner = h.x !== 0 && h.y !== 0;
        return (
          <span
            key={h.id}
            role="presentation"
            className="absolute z-30 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center touch-none"
            style={{
              left: `calc(50% + ${(h.x * width) / 2}px)`,
              top: `calc(50% + ${(h.y * height) / 2}px)`,
              cursor: h.cursor,
            }}
            onPointerDown={onHandlePointerDown(h.id)}
          >
            <span
              className={cn(
                "block bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]",
                corner ? "h-3.5 w-3.5 rounded-[3px]" : h.x === 0 ? "h-1.5 w-6 rounded-full" : "h-6 w-1.5 rounded-full",
              )}
            />
          </span>
        );
      })}
    </>
  );
}
