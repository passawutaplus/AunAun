import { toast } from "sonner";
import { downloadBlob } from "@/lib/docZip";
import { buildIncomeCsvContent, buildTaxSummaryText } from "./buildAccountantPack";
import type { IncomeRecord } from "@/data/mockData";
import type { TaxEstimate } from "./taxMath";

/** @deprecated Use AccountantPackDialog for full ZIP; kept for quick txt+csv export */
export function exportAccountantPackage(opts: {
  year: number;
  incomes: IncomeRecord[];
  est: TaxEstimate;
  expenseMethod: "lumpsum" | "actual";
  brandName?: string;
}) {
  const { year, incomes, est, expenseMethod, brandName } = opts;

  downloadBlob(
    new Blob([buildTaxSummaryText({ year, incomes, est, expenseMethod, brandName })], {
      type: "text/plain;charset=utf-8",
    }),
    `so1o-tax-summary-${year}.txt`,
  );

  downloadBlob(
    new Blob([`\uFEFF${buildIncomeCsvContent(incomes)}`], { type: "text/csv;charset=utf-8;" }),
    `so1o-income-detail-${year}.csv`,
  );

  toast.success("ดาวน์โหลดสรุปภาษี + CSV รายได้แล้ว — ส่งให้นักบัญชีได้เลย");
}
