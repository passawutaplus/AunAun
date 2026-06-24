import { INCOME_TYPE_META, type IncomeRecord, type IncomeType, calcThaiTax } from "@/data/mockData";

/** คำนวณค่าใช้จ่ายเหมา (lump-sum) แยกตามประเภทเงินได้ */
export function calcLumpSumExpense(incomes: IncomeRecord[]): number {
  // Group gross by type, then apply percent + cap
  const byType = new Map<IncomeType, number>();
  for (const i of incomes) {
    const t = (i.incomeType ?? "freelance") as IncomeType;
    byType.set(t, (byType.get(t) ?? 0) + i.gross);
  }
  let total = 0;
  for (const [type, gross] of byType) {
    const meta = INCOME_TYPE_META[type];
    let exp = gross * meta.lumpSumPct;
    if (meta.lumpSumCap !== undefined) exp = Math.min(exp, meta.lumpSumCap);
    total += exp;
  }
  return total;
}

export type TaxEstimate = {
  totalGross: number;
  totalWithheld: number;
  expenseDeduction: number;
  personalDeduction: number;
  activeDeductions: number;
  netIncome: number;
  estimatedTax: number;
  diff: number; // estimatedTax - totalWithheld
};

export function estimateTax(args: {
  incomes: IncomeRecord[];
  workExpensesTotal: number;
  expenseMethod: "lumpsum" | "actual";
  personalDeduction: number;
  activeDeductions: number;
}): TaxEstimate {
  const totalGross = args.incomes.reduce((s, i) => s + i.gross, 0);
  const totalWithheld = args.incomes.reduce((s, i) => s + (i.withholding ?? 0), 0);
  const expenseDeduction =
    args.expenseMethod === "lumpsum" ? calcLumpSumExpense(args.incomes) : args.workExpensesTotal;
  const netIncome = Math.max(
    0,
    totalGross - expenseDeduction - args.personalDeduction - args.activeDeductions,
  );
  const estimatedTax = calcThaiTax(netIncome);
  return {
    totalGross,
    totalWithheld,
    expenseDeduction,
    personalDeduction: args.personalDeduction,
    activeDeductions: args.activeDeductions,
    netIncome,
    estimatedTax,
    diff: estimatedTax - totalWithheld,
  };
}
