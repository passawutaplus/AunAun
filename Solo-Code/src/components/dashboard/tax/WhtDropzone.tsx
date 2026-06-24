import * as React from "react";
import { UploadCloud, FileText, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onFiles: (files: File[]) => void;
  busy?: boolean;
  progress?: { current: number; total: number } | null;
};

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*";
const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024;

export function WhtDropzone({ onFiles, busy, progress }: Props) {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files)
      .filter((f) => f.size <= MAX_SIZE)
      .slice(0, MAX_FILES);
    if (arr.length > 0) onFiles(arr);
  }

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
      )}
    >
      <div className="rounded-xl bg-primary/15 text-primary p-3 shrink-0">
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {busy
            ? `AI กำลังอ่านไฟล์... ${progress ? `${progress.current}/${progress.total}` : ""}`
            : "ลากไฟล์ ทวิ 50 (PDF/รูปถ่าย) มาวางที่นี่"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {busy
            ? "ขออภัยที่ทำให้รอ — กำลังแกะข้อมูลให้อัตโนมัติ"
            : `รองรับ PDF, JPG, PNG · สูงสุด ${MAX_FILES} ไฟล์/ครั้ง · ไฟล์ละ 10MB · กดเพื่อเลือกไฟล์`}
        </p>
      </div>
      <FileText className="h-8 w-8 text-muted-foreground/40 shrink-0" />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}
