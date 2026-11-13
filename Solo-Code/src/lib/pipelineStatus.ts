import type { Quotation, QuotationStatus } from "@/store/quotations";

export const PIPELINE_COLUMNS = ["lead", "proposal", "contract", "working", "done"] as const;

export type PipelineColumn = (typeof PIPELINE_COLUMNS)[number];

export const PIPELINE_LABELS: Record<PipelineColumn, string> = {
  lead: "คุย/ร่าง",
  proposal: "ส่งใบเสนอราคา",
  contract: "รอเซ็น/มัดจำ",
  working: "กำลังทำงาน/เก็บเงิน",
  done: "ปิดงาน",
};

export const PIPELINE_COLORS: Record<PipelineColumn, string> = {
  lead: "bg-slate-100 text-slate-700 border-slate-200",
  proposal: "bg-blue-50 text-blue-700 border-blue-200",
  contract: "bg-amber-50 text-amber-800 border-amber-200",
  working: "bg-[#FF5F05]/10 text-[#FF5F05] border-[#FF5F05]/30",
  done: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export interface PipelineIncomeContext {
  id: string;
  gross: number;
}

export function isPipelineExcluded(status: QuotationStatus): boolean {
  return status === "rejected" || status === "expired";
}

/** Derive kanban column from quotation + linked income. */
export function derivePipelineColumn(
  q: Quotation,
  income?: PipelineIncomeContext | null,
): PipelineColumn {
  if (q.status === "completed" || income) return "done";
  if (q.status === "draft") return "lead";
  if (q.status === "pending_approval") return "proposal";
  if (q.status === "pending_payment") return "contract";

  if (q.status === "pending_receipt") return "working";

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
  if (to === "done" && from !== "working") {
    return "ปิดงานได้จากคอลัมน์กำลังทำงานเท่านั้น";
  }
  return null;
}
