import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Pictures per backstory answer — kept small so the story stays a story, not a second gallery. */
export const CONTEXT_IMAGES_MAX = 4;

type Props = {
  urls: string[];
  onChange: (urls: string[]) => void;
  upload: (file: File) => Promise<string>;
  disabled?: boolean;
};

export default function ContextImagesField({ urls, onChange, upload, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const full = urls.length >= CONTEXT_IMAGES_MAX;

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files).slice(0, CONTEXT_IMAGES_MAX - urls.length);
    setBusy(true);
    const added: string[] = [];
    try {
      for (const file of picked) added.push(await upload(file));
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      if (added.length) onChange([...urls, ...added]);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {urls.map((url) => (
        <div key={url} className="relative h-14 w-14 overflow-hidden rounded-md border border-border/70 bg-muted">
          <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(urls.filter((u) => u !== url))}
            className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 text-foreground shadow-sm hover:text-destructive"
            aria-label="ลบรูปนี้"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {full ? null : (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-xs text-muted-foreground transition-colors",
            "hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {busy ? "กำลังอัปโหลด…" : "เพิ่มรูป"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}
