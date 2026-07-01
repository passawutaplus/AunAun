import * as React from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type FileDropzoneProps = {
  onFiles: (files: File[]) => void;
  busy?: boolean;
  progress?: { current: number; total: number } | null;
  accept?: string;
  maxFiles?: number;
  maxSizeBytes?: number;
  title?: string;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
};

const DEFAULT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*";
const DEFAULT_MAX_FILES = 20;
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

export function FileDropzone({
  onFiles,
  busy,
  progress,
  accept = DEFAULT_ACCEPT,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  title,
  hint,
  icon,
  className,
}: FileDropzoneProps) {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files)
      .filter((f) => f.size <= maxSizeBytes)
      .slice(0, maxFiles);
    if (arr.length > 0) onFiles(arr);
  }

  const busyLabel = progress
    ? `กำลังประมวลผล... ${progress.current}/${progress.total}`
    : "กำลังประมวลผล...";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (busy) return;
        pick(e.dataTransfer.files);
      }}
      onClick={() => !busy && inputRef.current?.click()}
      className={cn(
        "relative cursor-pointer rounded-2xl border-2 border-dashed p-5 transition-all",
        "flex items-center gap-4",
        drag
          ? "border-primary bg-primary/10 scale-[1.01]"
          : "border-border/70 bg-gradient-to-br from-primary-soft/40 to-card hover:border-primary/60 hover:bg-primary/5",
        busy && "pointer-events-none opacity-80",
        className,
      )}
    >
      <div className="rounded-xl bg-primary/15 text-primary p-3 shrink-0">
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          icon ?? <UploadCloud className="h-6 w-6" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{busy ? busyLabel : (title ?? "ลากไฟล์มาวางที่นี่")}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {hint ??
            `สูงสุด ${maxFiles} ไฟล์/ครั้ง · ไฟล์ละ ${Math.round(maxSizeBytes / (1024 * 1024))}MB · กดเพื่อเลือกไฟล์`}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}
