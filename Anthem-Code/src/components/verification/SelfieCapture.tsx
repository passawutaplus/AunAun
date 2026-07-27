import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KYC_SELFIE_ACCEPT } from "@/lib/kycUpload";
import { cn } from "@/lib/utils";

type Props = {
  previewUrl?: string;
  uploading?: boolean;
  onCapture: (file: File) => void;
  className?: string;
};

/** Selfie capture — open camera or upload (no face-circle guide). */
export function SelfieCapture({ previewUrl, uploading, onCapture, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError("เปิดกล้องไม่ได้ — ใช้ปุ่มอัปโหลดแทน");
      stopCamera();
    }
  };

  const snap = () => {
    const video = videoRef.current;
    if (!video || !cameraOn) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        onCapture(new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className={cn("rounded-xl border border-border overflow-hidden bg-card", className)}>
      <div className="px-3 py-2.5 border-b border-border space-y-0.5">
        <p className="text-base font-medium">ถ่ายภาพใบหน้าของคุณ</p>
        <p className="text-sm text-muted-foreground">ถือบัตรข้างใบหน้า · เห็นเต็มใบหน้าและบัตรเต็มใบ</p>
      </div>

      {previewUrl && !cameraOn ? (
        <div className="relative">
          <img src={previewUrl} alt="selfie" className="w-full max-h-[320px] object-cover bg-black" />
          {uploading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          <div className="p-2 flex gap-2">
            <Button type="button" size="sm" variant="outline" className="rounded-full flex-1" onClick={() => void startCamera()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> ถ่ายใหม่
            </Button>
            <label className="flex-1">
              <input
                type="file"
                accept={KYC_SELFIE_ACCEPT}
                capture="user"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onCapture(f);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex w-full h-10 items-center justify-center rounded-full border border-input bg-background px-3 text-sm cursor-pointer hover:bg-muted/40">
                อัปโหลดรูป
              </span>
            </label>
          </div>
        </div>
      ) : cameraOn ? (
        <div className="relative bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full max-h-[360px] object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          <div className="p-2 flex gap-2 bg-background">
            <Button type="button" size="sm" variant="outline" className="rounded-full h-10 text-sm" onClick={stopCamera}>
              ยกเลิก
            </Button>
            <Button type="button" size="sm" className="rounded-full flex-1 h-10 text-sm" onClick={snap} disabled={!!uploading}>
              <Camera className="w-4 h-4 mr-1" /> ถ่ายภาพ
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Camera className="w-8 h-8" />
            <p className="text-sm text-center">เปิดกล้องถ่าย หรืออัปโหลดรูปจากเครื่อง</p>
          </div>
          {cameraError && <p className="text-sm text-destructive text-center">{cameraError}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" className="rounded-full flex-1 h-10 text-sm" onClick={() => void startCamera()}>
              <SwitchCamera className="w-4 h-4 mr-1" /> เปิดกล้อง
            </Button>
            <label className="flex-1">
              <input
                type="file"
                accept={KYC_SELFIE_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onCapture(f);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex w-full h-10 items-center justify-center rounded-full border border-input bg-background px-3 text-sm cursor-pointer hover:bg-muted/40">
                อัปโหลดรูป
              </span>
            </label>
          </div>
          <p className="text-sm text-center text-muted-foreground">JPG หรือ PNG เท่านั้น</p>
        </div>
      )}
    </div>
  );
}

export default SelfieCapture;
