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
import { CommunityMediaAspectPicker } from "@/components/community/CommunityMediaAspectPicker";
import { getCroppedImageFile } from "@/lib/cropImage";
import {
  type CommunityMediaAspect,
  communityCropMinZoom,
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
      : freeMeta;
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
    if (!open || !isFlexGrid) return;
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
  }, [open, isFlexGrid, cropReady]);

  const applyCorner = useCallback((value: number) => {
    const next = clampCorner(value);
    setCornerRadius(next);
    setCornerInput(String(next));
  }, []);

  const activeRatio =
    isFlexGrid && flexAspect === "free"
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
      setMinZoom(nextMin);
      setZoom((z) => Math.max(nextMin, Math.min(MAX_ZOOM, z)));
    },
    [activeRatio],
  );

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const cropSize =
    isFlexGrid && containerSize.w > 0 && containerSize.h > 0
      ? computeCropSize(containerSize.w, containerSize.h, activeRatio, frameScale)
      : undefined;

  /** Drag SE corner of the crop frame to shrink/grow (replaces size slider). */
  const onFrameResizePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isFlexGrid || !cropHostRef.current || !cropSize) return;
    e.preventDefault();
    e.stopPropagation();
    const host = cropHostRef.current;
    const startAspect = activeRatio;
    const freeMode = flexAspect === "free";
    const startHalfW = cropSize.width / 2;
    const startHalfH = cropSize.height / 2;

    const applyFromPointer = (clientX: number, clientY: number) => {
      const rect = host.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const halfW = Math.max(20, clientX - cx);
      const halfH = Math.max(10, clientY - cy);
      let ratio = startAspect;
      let targetW: number;

      if (freeMode) {
        ratio = Math.min(3, Math.max(0.3, (halfW * 2) / Math.max(1, halfH * 2)));
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

  const handleConfirm = async () => {
    if (!file || !imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const mime = "image/png";
      const exportDims =
        isFlexGrid && (meta.ratio == null || flexAspect === "free")
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
    : `${imageSrc}-${locked ? lockedRatio : aspect}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100">
        <DialogHeader className="px-4 pb-2 pt-4">
          <DialogTitle className="text-base">ครอบภาพ</DialogTitle>
          <p className="text-xs font-normal text-muted-foreground">
            {locked
              ? `สัดส่วนล็อก ${lockedRatioLabel ?? "ตามช่อง"} — ลาก/ซูมจัดกรอบก่อนบันทึก`
              : isFlexGrid
                ? "เลือกสัดส่วน แล้วลากมุมขวาล่างเพื่อย่อขยายกรอบ · ลาก/ซูมจัดภาพก่อนบันทึก"
                : "เลือกสัดส่วน แล้วลาก/ซูมจัดกรอบก่อนบันทึก"}
          </p>
        </DialogHeader>

        {locked ? null : isFlexGrid ? (
          <div className="px-4 pb-3">
            <FlexGridAspectPicker value={flexAspect} onChange={setFlexAspect} />
          </div>
        ) : (
          <div className="px-4 pb-3">
            <CommunityMediaAspectPicker value={aspect} onChange={setAspect} />
          </div>
        )}

        <div
          ref={cropHostRef}
          className="relative mx-auto h-[min(70vh,520px)] w-full max-w-md bg-muted"
          style={
            {
              ["--module-crop-radius" as string]: previewRadius,
            } as CSSProperties
          }
        >
          {imageSrc && cropReady ? (
            <Cropper
              key={cropperKey}
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={MAX_ZOOM}
              aspect={isFlexGrid ? activeRatio : meta.ratio}
              cropSize={cropSize}
              cropShape="rect"
              showGrid
              restrictPosition={zoom >= minZoom + 0.01}
              onMediaLoaded={onMediaLoaded}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              classes={{
                cropAreaClassName: "module-crop-area-radius",
              }}
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
              onPointerDown={onFrameResizePointerDown}
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

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">ซูม</label>
            <input
              type="range"
              min={minZoom}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
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

        <DialogFooter className="gap-2 px-4 pb-4 sm:gap-2">
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
