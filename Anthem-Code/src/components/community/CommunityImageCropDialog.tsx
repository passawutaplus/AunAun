import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area, type MediaSize, type Point } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CommunityMediaAspectPicker } from "@/components/community/CommunityMediaAspectPicker";
import { getCroppedImageFile } from "@/lib/cropImage";
import {
  type CommunityMediaAspect,
  communityCropMinZoom,
  communityMediaAspectMeta,
  normalizeCommunityMediaAspect,
} from "@/lib/communityMediaAspect";

type Props = {
  file: File | null;
  aspect?: CommunityMediaAspect;
  /** First image of the post — user picks aspect here; later images use the locked ratio. */
  allowAspectChoice?: boolean;
  onAspectChange?: (aspect: CommunityMediaAspect) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => void;
  onCancel: () => void;
};

const MAX_ZOOM = 3;

export function CommunityImageCropDialog({
  file,
  aspect: aspectProp,
  allowAspectChoice = false,
  onAspectChange,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: Props) {
  const aspectKey = normalizeCommunityMediaAspect(aspectProp);
  const meta = communityMediaAspectMeta(aspectKey);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
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
    setMinZoom(1);
    setCroppedAreaPixels(null);
    return () => URL.revokeObjectURL(url);
  }, [file, aspectKey]);

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

  const handleAspectPick = (next: CommunityMediaAspect) => {
    onAspectChange?.(next);
  };

  const handleConfirm = async () => {
    if (!file || !imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const mime = file.type === "image/png" ? "image/png" : "image/webp";
      const cropped = await getCroppedImageFile(imageSrc, croppedAreaPixels, file.name, mime, {
        width: meta.exportW,
        height: meta.exportH,
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
          <DialogTitle className="text-base">
            {allowAspectChoice ? "อัปรูปแรก — เลือกสัดส่วนโพสต์" : `ครอปรูป ${meta.ratioLabel}`}
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-normal">
            {allowAspectChoice
              ? "เลือกสัดส่วนแล้วครอป — รูปและวิดีโอถัดไปใช้สัดส่วนเดียวกันทั้งโพสต์"
              : `โพสต์นี้ใช้สัดส่วน ${meta.label} (${meta.ratioLabel}) — ลากและซูมเพื่อจัดกรอบ`}
          </p>
        </DialogHeader>

        {allowAspectChoice && (
          <div className="px-4 pb-3">
            <CommunityMediaAspectPicker
              value={aspectKey}
              onChange={handleAspectPick}
            />
          </div>
        )}

        <div className="relative w-full max-w-md mx-auto h-[min(70vh,520px)] bg-muted">
          {imageSrc && (
            <Cropper
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
            />
          )}
        </div>

        <div className="px-4 py-3">
          <label className="text-xs text-muted-foreground mb-1 block">ซูม</label>
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
