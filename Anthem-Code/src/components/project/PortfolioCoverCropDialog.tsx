import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCroppedImageFile } from "@/lib/cropImage";
import {
  PROJECT_COVER_ASPECT_RATIO,
  PROJECT_COVER_EXPORT,
  PROJECT_COVER_RATIO_LABEL,
} from "@/lib/projectCoverAspect";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type Props = {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => void;
  onCancel: () => void;
};

export function PortfolioCoverCropDialog({
  file,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  /** Mount after dialog scale animation — react-easy-crop mis-measures during zoom-in. */
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
    setZoom(MIN_ZOOM);
    setCroppedAreaPixels(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleZoomChange = useCallback((next: number) => {
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next)));
  }, []);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!file || !imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const mime = file.type === "image/png" ? "image/png" : "image/webp";
      const cropped = await getCroppedImageFile(imageSrc, croppedAreaPixels, file.name, mime, {
        width: PROJECT_COVER_EXPORT.width,
        height: PROJECT_COVER_EXPORT.height,
      });
      onConfirm(cropped);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">ครอปภาพปก ({PROJECT_COVER_RATIO_LABEL} แนวนอน)</DialogTitle>
          <p className="text-xs text-muted-foreground font-normal">
            ลากและซูมเพื่อจัดกรอบ — ภาพปกต้องเป็นอัตราส่วน {PROJECT_COVER_RATIO_LABEL} แนวนอนเท่านั้น
          </p>
        </DialogHeader>

        <div className="relative w-full aspect-[4/3] bg-muted">
          {imageSrc && cropReady ? (
            <Cropper
              key={imageSrc}
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              aspect={PROJECT_COVER_ASPECT_RATIO}
              objectFit="horizontal-cover"
              cropShape="rect"
              showGrid
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={handleZoomChange}
              onCropComplete={onCropComplete}
            />
          ) : imageSrc ? (
            <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
          ) : null}
        </div>

        <div className="px-4 py-3">
          <label className="text-xs text-muted-foreground mb-1 block">ซูม</label>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <DialogFooter className="px-4 pb-4 gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={saving || !croppedAreaPixels}>
            {saving ? "กำลังครอป..." : "ใช้รูปนี้"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
