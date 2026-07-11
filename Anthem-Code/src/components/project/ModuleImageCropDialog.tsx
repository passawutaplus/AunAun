import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Cropper, { type Area, type MediaSize, type Point } from "react-easy-crop";
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

const MAX_ZOOM = 3;

export type ModuleImageCropConfirmResult = {
  file: File;
  applyToAll: boolean;
  aspect: CommunityMediaAspect;
  cornerRadiusPercent: number;
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
};

function clampCorner(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
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
}: Props) {
  const [aspect, setAspect] = useState<CommunityMediaAspect>(DEFAULT_COMMUNITY_MEDIA_ASPECT);
  const freeMeta = communityMediaAspectMeta(normalizeCommunityMediaAspect(aspect));
  const locked = typeof lockedRatio === "number" && lockedRatio > 0;
  const meta = locked
    ? {
        ratio: lockedRatio,
        exportW: lockedExport?.width ?? freeMeta.exportW,
        exportH: lockedExport?.height ?? freeMeta.exportH,
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
    setApplyToAll(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!showApplyToAll) setApplyToAll(false);
  }, [showApplyToAll]);

  const applyCorner = useCallback((value: number) => {
    const next = clampCorner(value);
    setCornerRadius(next);
    setCornerInput(String(next));
  }, []);

  const onMediaLoaded = useCallback(
    (media: MediaSize) => {
      const nextMin = communityCropMinZoom(media.naturalWidth, media.naturalHeight, meta.ratio);
      setMinZoom(nextMin);
      setZoom((z) => Math.max(nextMin, Math.min(MAX_ZOOM, z)));
    },
    [meta.ratio],
  );

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!file || !imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const mime = "image/png";
      const cropped = await getCroppedImageFile(imageSrc, croppedAreaPixels, file.name, mime, {
        width: meta.exportW,
        height: meta.exportH,
        cornerRadiusPercent: cornerRadius,
      });
      onConfirm({
        file: cropped,
        applyToAll: showApplyToAll && applyToAll,
        aspect,
        cornerRadiusPercent: cornerRadius,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  // Preview: 0–100 maps to 0–50% of the shorter side of the crop frame.
  const previewRadius = `${cornerRadius / 2}%`;

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
              : "เลือกสัดส่วน แล้วลาก/ซูมจัดกรอบก่อนบันทึก"}
          </p>
        </DialogHeader>

        {locked ? null : (
          <div className="px-4 pb-3">
            <CommunityMediaAspectPicker value={aspect} onChange={setAspect} />
          </div>
        )}

        <div
          className="relative mx-auto h-[min(70vh,520px)] w-full max-w-md bg-muted"
          style={
            {
              ["--module-crop-radius" as string]: previewRadius,
            } as CSSProperties
          }
        >
          {imageSrc && cropReady ? (
            <Cropper
              key={`${imageSrc}-${locked ? lockedRatio : aspect}`}
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={MAX_ZOOM}
              aspect={meta.ratio}
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
          <style>{`
            .module-crop-area-radius {
              border-radius: var(--module-crop-radius, 0) !important;
            }
          `}</style>
        </div>

        <div className="space-y-3 px-4 py-3">
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
