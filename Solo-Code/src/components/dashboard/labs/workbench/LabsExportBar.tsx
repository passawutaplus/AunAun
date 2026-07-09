import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLabsWorkbench } from "./LabsWorkbenchContext";

export function LabsExportBar() {
  const { getExport, exportVersion, status } = useLabsWorkbench();
  const action = getExport();
  void exportVersion;

  if (!action) return null;

  return (
    <div className="lg:hidden shrink-0 border-t border-border bg-background/95 backdrop-blur px-3 py-2 flex items-center gap-2">
      <p className="text-[10px] text-muted-foreground flex-1 min-w-0 truncate hidden xs:block">
        {status.privacyNote}
      </p>
      <Button
        size="sm"
        className="h-9 text-xs gap-1.5 ml-auto shrink-0 min-w-[7rem]"
        disabled={action.disabled || status.processing}
        onClick={() => void action.onExport()}
      >
        {status.processing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {action.label}
      </Button>
    </div>
  );
}
