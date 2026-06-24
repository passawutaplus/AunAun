import * as React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadJobTrackerImage } from "./uploadImage";

export function ImageUploadField({
  value,
  onChange,
  folder,
  label,
  hint,
  watermark,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folder: string;
  label?: string;
  hint?: string;
  watermark?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadJobTrackerImage(f, folder);
      onChange(url);
      toast.success("อัปโหลดรูปแล้ว");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-medium">{label}</p>}
      {value ? (
        <div className="relative rounded-lg overflow-hidden border bg-muted">
          <img src={value} alt="" className="w-full h-auto max-h-48 object-contain" />
          {watermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-white/80 font-bold text-2xl rotate-[-20deg] tracking-widest drop-shadow-lg"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
              >
                {watermark}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 bg-background/90 rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full border-2 border-dashed rounded-lg py-6 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-5 w-5" />
              <span>คลิกเพื่ออัปโหลดรูป</span>
            </>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          เปลี่ยนรูป
        </Button>
      )}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
