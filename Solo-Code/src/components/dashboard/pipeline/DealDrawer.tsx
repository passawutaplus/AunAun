import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { X, FileText, ExternalLink, Receipt, Calculator, ScrollText, Scale } from "lucide-react";
import { UsageRightsBuilder } from "@/components/legal-desk/UsageRightsBuilder";
import { useUsageRightsById } from "@/store/legalUsageRights";
import { Button } from "@/components/ui/button";
import { PIPELINE_LABELS, PIPELINE_COLORS, type PipelineColumn } from "@/lib/pipelineStatus";
import { formatBaht, statusLabel } from "@/store/quotations";
import type { PipelineDeal } from "@/store/pipeline";
import { ContractSignDialog } from "./ContractSignDialog";
import { DealTimeline } from "./DealTimeline";

export function DealDrawer({
  deal,
  onClose,
  onOpenQuotation,
  onOpenJobs,
  onOpenTax,
  onOpenContract,
}: {
  deal: PipelineDeal;
  onClose: () => void;
  onOpenQuotation: () => void;
  onOpenJobs: () => void;
  onOpenTax: () => void;
  onOpenContract: () => void;
}) {
  const [contractOpen, setContractOpen] = React.useState(false);
  const [rightsOpen, setRightsOpen] = React.useState(false);
  const q = deal.quotation;
  const { data: usageRights } = useUsageRightsById(q.usageRightsId);
  const st = statusLabel(q.status);
  const colLabel = PIPELINE_LABELS[deal.column];
  const colColor = PIPELINE_COLORS[deal.column as PipelineColumn];

  const trackUrl = deal.job
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/track/${deal.job.shareToken}`
    : null;

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-mono font-bold text-[#FF5F05]">{q.number}</p>
            <p className="text-sm font-semibold truncate">{q.projectName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={cnBadge(colColor)}>{colLabel}</span>
            <span className={cnBadge(st.tone)}>{st.label}</span>
            {q.contractAccepted && (
              <span className={cnBadge("bg-emerald-50 text-emerald-800 border-emerald-200")}>
                สัญญายืนยันแล้ว
              </span>
            )}
            {q.usageRightsId && (
              <span className={cnBadge("bg-violet-50 text-violet-800 border-violet-200")}>
                มีสิทธิลิขสิทธิ์
              </span>
            )}
            {(q.signatureMode === "online" || q.signatureMode === "wet") && !q.clientSignedAt && (
              <span className={cnBadge("bg-amber-50 text-amber-900 border-amber-200")}>
                รอลูกค้าเซ็น
              </span>
            )}
            {q.clientSignedAt && (
              <span className={cnBadge("bg-emerald-50 text-emerald-800 border-emerald-200")}>
                ลูกค้าเซ็นแล้ว
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground">ลูกค้า</p>
              <p className="font-medium">{q.clientName}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">มูลค่า</p>
              <p className="font-medium">฿{formatBaht(deal.grandTotal)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-muted-foreground">อัปเดต</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(q.updatedAt), { addSuffix: true, locale: th })}
              </p>
            </div>
          </div>

          {q.briefId && (
            <p className="text-[11px] text-muted-foreground">
              เชื่อม Smart Brief ·{" "}
              <span className="font-mono text-[10px]">{q.briefId.slice(0, 8)}…</span>
            </p>
          )}

          <DealTimeline deal={deal} />

          <div className="space-y-2">
            <p className="text-xs font-semibold">ทางลัด</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={onOpenQuotation}
              >
                <FileText className="h-3.5 w-3.5" />
                เปิดใบเสนอราคา
              </Button>
              {deal.job ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={onOpenJobs}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Job Tracker
                  </Button>
                  {trackUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 col-span-2"
                      asChild
                    >
                      <a href={trackUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        แชร์ลิงก์ให้ลูกค้า
                      </a>
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  onClick={onOpenJobs}
                >
                  สร้าง Job Tracker
                </Button>
              )}
              {deal.hasIncome && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  onClick={onOpenTax}
                >
                  <Calculator className="h-3.5 w-3.5" />
                  ดูภาษี
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => setRightsOpen(true)}
              >
                <Scale className="h-3.5 w-3.5" />
                ตั้งสิทธิ์ลิขสิทธิ์
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => setContractOpen(true)}
              >
                <ScrollText className="h-3.5 w-3.5" />
                สัญญาจ้าง
              </Button>
            </div>
          </div>

          {usageRights && (
            <div className="rounded-lg border border-violet-200/60 bg-violet-50/50 p-3 text-[11px] text-violet-900">
              <p className="font-semibold mb-1">สรุปสิทธิลิขสิทธิ์</p>
              <p>{usageRights.label}</p>
            </div>
          )}

          {deal.column === "done" && deal.hasIncome && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              ปิดงานแล้ว — รายได้ ฿{formatBaht(deal.incomeGross ?? deal.grandTotal)} บันทึกแล้ว
            </div>
          )}
        </div>
      </div>

      <UsageRightsBuilder
        open={rightsOpen}
        onOpenChange={setRightsOpen}
        quotation={q}
        onSaved={onOpenContract}
      />
      <ContractSignDialog
        open={contractOpen}
        onOpenChange={setContractOpen}
        quotation={q}
        usageRights={usageRights ?? undefined}
        onSigned={onOpenContract}
      />
    </>
  );
}

function cnBadge(cls: string) {
  return `inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`;
}
