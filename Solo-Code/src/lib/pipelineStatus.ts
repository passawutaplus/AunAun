import type { Quotation, QuotationStatus } from "@/store/quotations";

export const PIPELINE_COLUMNS = [
  "lead",
  "proposal",
  "contract",
  "working",
  "billing",
  "done",
] as const;

export type PipelineColumn = (typeof PIPELINE_COLUMNS)[number];

export const PIPELINE_LABELS: Record<PipelineColumn, string> = {
  lead: "คุย/ร่าง",
  proposal: "ส่งใบเสนอราคา",
  contract: "รอเซ็น/มัดจำ",
  working: "กำลังทำงาน",
  billing: "เก็บเงิน/ใบเสร็จ",
  done: "ปิดงาน",
};

export const PIPELINE_COLORS: Record<PipelineColumn, string> = {
  lead: "bg-slate-100 text-slate-700 border-slate-200",
  proposal: "bg-blue-50 text-blue-700 border-blue-200",
  contract: "bg-amber-50 text-amber-800 border-amber-200",
  working: "bg-[#FF5F05]/10 text-[#FF5F05] border-[#FF5F05]/30",
  billing: "bg-violet-50 text-violet-800 border-violet-200",
  done: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export interface PipelineJobContext {
  id: string;
  currentStep: number;
  shareToken: string;
  depositPaid: boolean;
  finalPaid: boolean;
  pendingSlips: number;
}

export interface PipelineIncomeContext {
  id: string;
  gross: number;
}

export function isPipelineExcluded(status: QuotationStatus): boolean {
  return status === "rejected" || status === "expired";
}

/** Derive kanban column from quotation + linked job/income. */
export function derivePipelineColumn(
  q: Quotation,
  job?: PipelineJobContext | null,
  income?: PipelineIncomeContext | null,
): PipelineColumn {
  if (q.status === "completed" || income) return "done";
  if (q.status === "draft") return "lead";
  if (q.status === "pending_approval") return "proposal";
  if (q.status === "pending_payment") return "contract";

  if (q.status === "pending_receipt") {
    if (job && job.currentStep >= 4) return "billing";
    return "working";
  }

  return "lead";
}

/** Map column → quotation status for drag updates. */
export function columnToQuotationStatus(col: PipelineColumn): QuotationStatus {
  switch (col) {
    case "lead":
      return "draft";
    case "proposal":
      return "pending_approval";
    case "contract":
      return "pending_payment";
    case "working":
    case "billing":
      return "pending_receipt";
    case "done":
      return "completed";
  }
}

export function canMoveColumn(from: PipelineColumn, to: PipelineColumn): boolean {
  if (from === to) return false;
  const fromIdx = PIPELINE_COLUMNS.indexOf(from);
  const toIdx = PIPELINE_COLUMNS.indexOf(to);
  return Math.abs(fromIdx - toIdx) <= 1;
}

export function moveColumnError(from: PipelineColumn, to: PipelineColumn): string | null {
  if (from === to) return null;
  if (!canMoveColumn(from, to)) {
    return "ย้ายได้ทีละขั้นเท่านั้น — ลากไปคอลัมน์ถัดไป";
  }
  if (to === "done" && from !== "billing") {
    return "ปิดงานได้จากคอลัมน์เก็บเงินเท่านั้น";
  }
  return null;
}

/** Job step to set when moving into billing column. */
export function targetJobStepForBilling(): number {
  return 4;
}

/** Job step when entering working from contract. */
export function targetJobStepForWorking(): number {
  return 1;
}
