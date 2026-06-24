import * as React from "react";
import { Loader2, Plus, Kanban, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePipelineDeals, type PipelineDeal } from "@/store/pipeline";
import { useQuotations, computeTotals } from "@/store/quotations";
import { useFinance } from "@/store/finance";
import {
  columnToQuotationStatus,
  moveColumnError,
  targetJobStepForBilling,
  targetJobStepForWorking,
  type PipelineColumn,
} from "@/lib/pipelineStatus";
import { PipelineKanban } from "./pipeline/PipelineKanban";
import { DealDrawer } from "./pipeline/DealDrawer";
import { PageFooterActions } from "./PageFooterActions";
import { SQUAD_PRICING } from "@/lib/sharedSquad";
import { consumePipelineNewDeal } from "@/lib/pipelineNewDeal";
import { PipelineNewDealButton } from "./layout/PipelineNewDealButton";

type Props = {
  onNavigate?: (sub: string) => void;
  onGoTab?: (tab: string, sub?: string) => void;
  onOpenQuotation?: (id: string) => void;
};

export function PipelineTab({ onNavigate, onGoTab, onOpenQuotation }: Props) {
  const { deals, isLoading, refetch } = usePipelineDeals();
  const { create, advanceStatusAsync, list } = useQuotations();
  const { upsertIncomeFromQuotation } = useFinance();
  const [selected, setSelected] = React.useState<PipelineDeal | null>(null);
  const [creating, setCreating] = React.useState(false);

  const liveSelected = selected
    ? (deals.find((d) => d.quotation.id === selected.quotation.id) ?? null)
    : null;

  React.useEffect(() => {
    if (selected && !liveSelected) setSelected(null);
  }, [selected, liveSelected]);

  const syncIncome = (q: PipelineDeal["quotation"]) => {
    const totals = computeTotals(q);
    const monthSrc = q.paidAt || q.receiptIssuedAt || q.updatedAt || new Date().toISOString();
    upsertIncomeFromQuotation({
      sourceQuotationId: q.id,
      month: monthSrc.slice(0, 7),
      client: q.clientName || "ลูกค้า",
      gross: totals.preTax,
      withholding: totals.withholdingAmount,
      incomeType: "freelance",
      whtRate: q.whtEnabled ? q.whtRate : 0,
      certificateReceived: false,
      note: `จาก ${q.number}`,
    });
  };

  const handleColumnChange = async (dealId: string, to: PipelineColumn) => {
    const deal = deals.find((d) => d.quotation.id === dealId);
    if (!deal) return;
    const err = moveColumnError(deal.column, to);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const nextStatus = columnToQuotationStatus(to);
      await advanceStatusAsync(dealId, nextStatus);

      if (deal.job) {
        if (to === "billing") {
          await supabase
            .from("job_trackers")
            .update({ current_step: targetJobStepForBilling() })
            .eq("id", deal.job.id);
        } else if (to === "working") {
          await supabase
            .from("job_trackers")
            .update({ current_step: targetJobStepForWorking() })
            .eq("id", deal.job.id);
        }
      }

      if (to === "done") {
        const updated = list.find((x) => x.id === dealId);
        if (updated) syncIncome(updated);
        toast.success("ปิดงานแล้ว — บันทึกรายได้เข้าหมวดภาษี");
      } else {
        toast.success("อัปเดตสถานะดีลแล้ว");
      }
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปเดตไม่สำเร็จ");
    }
  };

  const handleCreateDeal = React.useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const q = await create({ projectName: "ดีลใหม่", clientName: "ลูกค้าใหม่" });
      toast.success("สร้างดีลแล้ว — แก้รายละเอียดในใบเสนอราคา");
      onOpenQuotation?.(q.id);
      onNavigate?.("quotations");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างดีลไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  }, [creating, create, onNavigate, onOpenQuotation]);

  React.useEffect(() => {
    if (consumePipelineNewDeal() === "quotation") {
      void handleCreateDeal();
    }
  }, [handleCreateDeal]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Kanban className="h-5 w-5 text-[#FF5F05]" />
            <h2 className="text-lg font-semibold">Pipeline</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            ติดตามดีลจากคุยลูกค้าจนปิดงาน — ลิงก์ใบเสนอราคา Job Tracker และภาษี
          </p>
        </div>
        <PipelineNewDealButton
          variant="header"
          onNavigate={(tab, sub) => onGoTab?.(tab, sub)}
          onCreateQuotation={handleCreateDeal}
          creating={creating}
        />
      </div>

      {deals.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 px-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            ยังไม่มีดีลใน Pipeline — เริ่มจากสร้างใบเสนอราคาแล้วลากตามขั้นตอนธุรกิจได้เลย
          </p>
          <Button
            onClick={handleCreateDeal}
            disabled={creating}
            className="text-white"
            style={{ background: "#FF5F05" }}
          >
            สร้างดีลแรก
          </Button>
        </div>
      ) : (
        <PipelineKanban deals={deals} onColumnChange={handleColumnChange} onSelect={setSelected} />
      )}

      <div className="rounded-xl border border-dashed border-[#FF5F05]/30 bg-[#FF5F05]/5 p-4 flex gap-3 items-start">
        <Users className="h-5 w-5 text-[#FF5F05] shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">So1o Squad — เร็วๆ นี้</p>
          <p className="text-muted-foreground text-xs mt-1">
            แชร์โปรเจกต์กับทีมฟรีแลนซ์ หารเงิน/ภาษีอัตโนมัติ — เริ่ม ฿
            {SQUAD_PRICING.payPerProject.min}/โปรเจกต์ หรือ ฿{SQUAD_PRICING.monthlySquad.price}
            /เดือน
          </p>
        </div>
      </div>

      <PageFooterActions feature="pipeline" label="Pipeline" />

      {liveSelected && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelected(null)}
            aria-hidden
          />
          <DealDrawer
            deal={liveSelected}
            onClose={() => setSelected(null)}
            onOpenQuotation={() => {
              onOpenQuotation?.(liveSelected.quotation.id);
              onNavigate?.("quotations");
              setSelected(null);
            }}
            onOpenJobs={() => {
              onNavigate?.("jobs");
              setSelected(null);
            }}
            onOpenTax={() => {
              onNavigate?.("tax");
              setSelected(null);
            }}
            onOpenContract={() => refetch()}
          />
        </>
      )}
    </div>
  );
}
