import { Loader2, Shield } from "lucide-react";
import { useLabsWorkbench } from "./LabsWorkbenchContext";
import { cn } from "@/lib/utils";

export function LabsStatusBar() {
  const { status } = useLabsWorkbench();

  return (
    <footer
      className={cn(
        "shrink-0 border-t border-border bg-muted/30 px-3 py-1.5",
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground",
      )}
    >
      <span className="shrink-0">
        ไฟล์: <span className="text-foreground font-medium">{status.fileCount}</span>
      </span>
      <span className="shrink-0 flex items-center gap-1">
        {status.processing ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-foreground">{status.processingLabel ?? "กำลังทำงาน..."}</span>
          </>
        ) : (
          <span className="text-foreground/80">พร้อมใช้งาน</span>
        )}
      </span>
      <span className="hidden sm:flex items-center gap-1 min-w-0 max-w-[14rem] lg:max-w-xs">
        <Shield className="h-3 w-3 shrink-0" />
        <span className="truncate">{status.privacyNote}</span>
      </span>
      {status.lastAction && (
        <span className="sm:ml-auto shrink-0 truncate max-w-full sm:max-w-[40%] text-foreground/80">
          {status.lastAction}
        </span>
      )}
    </footer>
  );
}
