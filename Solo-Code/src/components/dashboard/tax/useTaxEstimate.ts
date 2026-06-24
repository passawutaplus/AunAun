import * as React from "react";
import { useFinance } from "@/store/finance";
import { VAT_THRESHOLD } from "@/data/mockData";
import { estimateTax, calcLumpSumExpense } from "./taxMath";
import { computeActiveDeductions } from "./DeductionsPanel";

const PERSONAL_DEDUCTION = 60000;

export function useTaxEstimate() {
  const { incomes, workExpenses, deductions, deductionAmounts, expenseMethod } = useFinance();

  const totalWorkExp = workExpenses.reduce((s, i) => s + i.amount, 0);

  const activeDeductions = React.useMemo(
    () => computeActiveDeductions(deductions, deductionAmounts),
    [deductions, deductionAmounts],
  );

  const est = React.useMemo(
    () =>
      estimateTax({
        incomes,
        workExpensesTotal: totalWorkExp,
        expenseMethod,
        personalDeduction: PERSONAL_DEDUCTION,
        activeDeductions,
      }),
    [incomes, totalWorkExp, expenseMethod, activeDeductions],
  );

  const lumpSumPreview = React.useMemo(() => calcLumpSumExpense(incomes), [incomes]);
  const taxOwed = Math.max(0, est.diff);
  const refund = Math.max(0, -est.diff);
  const vatPct = Math.min(100, (est.totalGross / VAT_THRESHOLD) * 100);

  return {
    incomes,
    deductions,
    deductionAmounts,
    expenseMethod,
    workExpenses,
    totalWorkExp,
    activeDeductions,
    est,
    lumpSumPreview,
    taxOwed,
    refund,
    vatPct,
    personalDeduction: PERSONAL_DEDUCTION,
  };
}
