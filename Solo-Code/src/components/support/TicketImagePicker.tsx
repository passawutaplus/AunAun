import * as React from "react";
import { ImagePlus, Loader2, Scissors, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { capturePageScreenshot } from "@/lib/captureScreenshot";

const MAX_FILES = 3;

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  className?: string;
  compact?: boolean;
};

export function TicketImagePicker({ files, onChange, className, compact }: Props) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [snipping, setSnipping] = React.useState(false);

  const addFiles = (incoming: FileList | File[]) => {
    const next = [...files];
    for (const f of Array.from(incoming)) {
      if (!f.type.startsWith("image/")) {
        toast.error("รองรับเฉพาะไฟล์รูปภาพ");
        continue;
      }
      if (next.length >= MAX_FILES) break;
      next.push(f);
    }
    onChange(next.slice(0, MAX_FILES));
  };

  const captureScreen = async () => {
    if (files.length >= MAX_FILES) {
      toast.error("แนบได้สูงสุด 3 ภาพ");
      return;
    }
    setSnipping(true);
    try {
      const blob = await capturePageScreenshot({ ignoreSelector: ".give-feedback-popover" });
      const file = new File([blob], `screenshot-${Date.now()}.jpg`, { type: "image/jpeg" });
      onChange([...files, file].slice(0, MAX_FILES));
      toast.success("จับภาพหน้าจอแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "จับภาพไม่สำเร็จ");
    } finally {
      setSnipping(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] font-medium text-muted-foreground">แนบภาพ (สูงสุด 3)</p>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex-1 rounded-lg border border-dashed border-border p-2 text-center",
            "hover:border-primary/40 transition-colors",
            compact && "py-1.5",
          )}
        >
          <ImagePlus className="h-4 w-4 text-muted-foreground mx-auto" />
          <span className="text-[10px] text-muted-foreground mt-0.5 block">อัปโหลด</span>
        </button>
        <button
          type="button"
          onClick={captureScreen}
          disabled={snipping || files.length >= MAX_FILES}
          className={cn(
            "flex-1 rounded-lg border border-dashed border-border p-2 text-center",
            "hover:border-primary/40 transition-colors disabled:opacity-50",
            compact && "py-1.5",
          )}
        >
          {snipping ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary mx-auto" />
          ) : (
            <Scissors className="h-4 w-4 text-muted-foreground mx-auto" />
          )}
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Snip หน้าจอ</span>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative">
              <img
                src={URL.createObjectURL(f)}
                alt=""
                className="h-12 w-12 rounded-md object-cover border"
              />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
