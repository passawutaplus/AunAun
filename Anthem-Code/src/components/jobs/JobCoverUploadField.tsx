import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { uploadProjectImage } from "@/lib/uploadImage";
import { useSubscription } from "@/core/subscription";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  className?: string;
};

export default function JobCoverUploadField({ userId, value, onChange, className }: Props) {
  const { tier } = useSubscription();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadProjectImage(file, userId, "job-covers", tier);
      onChange(url);
      toast.success("อัปโหลดภาพปกแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <Label className="text-xs">ภาพปกประกาศ (ไม่บังคับ)</Label>
      <div
        className={cn(
          "relative mt-1 rounded-xl overflow-hidden border border-dashed border-border/60 bg-muted/30",
          value ? "h-32" : "h-24",
        )}
      >
        {value ? (
          <>
            <img src={value} alt="ภาพปกประกาศ" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-background/90 border border-border/60 hover:bg-background"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              เปลี่ยนรูป
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 border border-border/60 grid place-items-center hover:bg-background"
              aria-label="ลบภาพปก"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-[11px]">คลิกเพื่ออัปโหลดภาพปก</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
