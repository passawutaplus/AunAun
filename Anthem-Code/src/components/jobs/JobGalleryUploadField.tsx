import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { uploadProjectImage } from "@/lib/uploadImage";
import { useSubscription } from "@/core/subscription";
import { toast } from "sonner";

const MAX_EXTRA = 6;

type Props = {
  userId: string;
  value: string[];
  onChange: (urls: string[]) => void;
};

export default function JobGalleryUploadField({ userId, value, onChange }: Props) {
  const { tier } = useSubscription();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const left = MAX_EXTRA - value.length;

  const upload = async (files: FileList | null) => {
    if (!files?.length || left <= 0) return;
    setBusy(true);
    try {
      const picked = Array.from(files).slice(0, left);
      const urls: string[] = [];
      for (const file of picked) {
        urls.push(await uploadProjectImage(file, userId, "job-covers", tier));
      }
      onChange([...value, ...urls].slice(0, MAX_EXTRA));
      toast.success(`อัปโหลดรูปเพิ่ม ${urls.length} ภาพ`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Label className="text-xs">รูปเพิ่มเติม — ได้สูงสุด 6 ภาพ โชว์เป็น thumbnail ใต้ปก</Label>
      <div className="mt-1 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {value.map((url, i) => (
          <div key={`${url}-${i}`} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border/60">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 border border-border/60 grid place-items-center"
              aria-label={`ลบรูปที่ ${i + 1}`}
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {left > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="aspect-[4/3] rounded-lg border border-dashed border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 grid place-items-center"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            <span className="sr-only">เพิ่มรูป</span>
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
