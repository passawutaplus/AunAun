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

const MAX_EXPORT_DIM = 1920;

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
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!file || !imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const mime = file.type === "image/png" ? "image/png" : "image/webp";
      let outW = Math.round(croppedAreaPixels.width);
      let outH = Math.round(croppedAreaPixels.height);
      const longSide = Math.max(outW, outH);
      if (longSide > MAX_EXPORT_DIM) {
        const scale = MAX_EXPORT_DIM / longSide;
        outW = Math.round(outW * scale);
        outH = Math.round(outH * scale);
      }
      const cropped = await getCroppedImageFile(imageSrc, croppedAreaPixels, file.name, mime, {
        width: outW,
        height: outH,
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
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">ครอปภาพปก</DialogTitle>
          <p className="text-xs text-muted-foreground font-normal">
            ลากและซูมเพื่อจัดกรอบ — อัตราส่วนตามที่คุณเลือก ใช้เป็นภาพหลักในฟีดและการค้นหา
          </p>
        </DialogHeader>

        <div className="relative w-full max-w-md mx-auto h-[min(70vh,480px)] bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="px-4 py-3">
          <label className="text-xs text-muted-foreground mb-1 block">ซูม</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
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
