import { Loader2, Kanban, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePipelineDeals } from "@/store/pipeline";
import { PIPELINE_LABELS } from "@/lib/pipelineStatus";
import { formatBaht } from "@/store/quotations";

export function PipelineMiniWidget({ onGo }: { onGo: (tab: string, sub?: string) => void }) {
  const { deals, isLoading, byColumn } = usePipelineDeals();
  const active = deals.filter((d) => d.column !== "done").slice(0, 3);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Kanban className="h-4 w-4 text-[#FF5F05]" />
            ดีลที่ต้องทำ
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onGo("finance", "pipeline")}
          >
            ทั้งหมด
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : active.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            ยังไม่มีดีลเปิดอยู่ — สร้างดีลแรกใน Pipeline
          </p>
        ) : (
          active.map((d) => (
            <button
              key={d.quotation.id}
              type="button"
              onClick={() => onGo("finance", "pipeline")}
              className="w-full text-left rounded-lg border px-3 py-2 hover:bg-muted/40 transition"
            >
              <div className="flex justify-between gap-2">
                <span className="text-[10px] font-mono text-[#FF5F05]">{d.quotation.number}</span>
                <span className="text-[10px] font-medium">฿{formatBaht(d.grandTotal)}</span>
              </div>
              <p className="text-xs font-medium truncate">{d.quotation.projectName}</p>
              <p className="text-[10px] text-muted-foreground">{PIPELINE_LABELS[d.column]}</p>
            </button>
          ))
        )}
        {!isLoading && deals.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            เปิดอยู่{" "}
            {byColumn("working").length +
              byColumn("contract").length +
              byColumn("proposal").length +
              byColumn("lead").length +
              byColumn("billing").length}{" "}
            ดีล
          </p>
        )}
      </CardContent>
    </Card>
  );
}
