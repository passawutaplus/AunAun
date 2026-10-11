import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MascotCharacter } from "@/components/project/TourMascot";

/** Show the mascot only when an upload/compress is slow enough to feel long. */
const MASCOT_AFTER_MS = 1500;

/** Spinner + stage label + optional percent bar; the mascot joins in if it takes a while. */
export function UploadProgressCard({
  label,
  percent,
  onCancel,
  className,
}: {
  label?: string | null;
  percent?: number | null;
  onCancel?: () => void;
  className?: string;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), MASCOT_AFTER_MS);
    return () => window.clearTimeout(t);
  }, []);
  const pct = typeof percent === "number" ? Math.max(0, Math.min(100, Math.round(percent))) : null;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)} role="status" aria-live="polite">
      {slow ? (
        <MascotCharacter className="h-20 w-24 animate-in fade-in zoom-in-95 duration-500" />
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      )}
      <p className="max-w-[220px] text-center text-xs font-medium text-foreground">
        {label ?? "กำลังอัปโหลด..."}
        {slow ? <span className="block text-[11px] font-normal text-muted-foreground">ไฟล์ใหญ่หน่อย รอสักครู่นะ</span> : null}
      </p>
      {pct !== null ? (
        <div className="h-1.5 w-36 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="pointer-events-auto text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          ยกเลิก
        </button>
      ) : null}
    </div>
  );
}
