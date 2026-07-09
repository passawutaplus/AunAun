import { Settings2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLabsWorkbench } from "./LabsWorkbenchContext";

export function LabsInspectorPanel() {
  const { getInspector, inspectorVersion } = useLabsWorkbench();
  const inspector = getInspector();
  void inspectorVersion;

  return (
    <aside className="flex flex-col h-full w-full min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 shrink-0">
        <Settings2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
          ตั้งค่า / ผลลัพธ์
        </p>
      </div>
      <ScrollArea className="flex-1 min-w-0">
        <div className="p-3 text-sm min-w-0 max-w-full overflow-x-hidden space-y-4 [&_label]:text-xs [&_button]:max-w-full">
          {inspector ?? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              เลือกเครื่องมือแล้วตั้งค่าจะแสดงที่นี่
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
