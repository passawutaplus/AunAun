import * as React from "react";
import { useAuth } from "@/auth/AuthProvider";
import {
  type Subscription,
  type PaymentMethod,
  type Client,
  type IncomeRecord,
  type ExpenseRecord,
} from "@/data/mockData";
import { useFinanceSubs } from "@/hooks/finance/useFinanceSubs";
import { useFinancePaymentMethods } from "@/hooks/finance/useFinancePaymentMethods";
import { useFinanceExpenses } from "@/hooks/finance/useFinanceExpenses";
import { useFinanceIncomes } from "@/hooks/finance/useFinanceIncomes";
import { useFinanceDeductions } from "@/hooks/finance/useFinanceDeductions";
import { useFinanceSettings } from "@/hooks/finance/useFinanceSettings";

type State = {
  subs: Subscription[];
  setSubs: React.Dispatch<React.SetStateAction<Subscription[]>>;
  paymentMethods: PaymentMethod[];
  setPaymentMethods: React.Dispatch<React.SetStateAction<PaymentMethod[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  incomes: IncomeRecord[];
  addIncome: (rec: Omit<IncomeRecord, "id">) => void;
  workExpenses: ExpenseRecord[];
  setWorkExpenses: React.Dispatch<React.SetStateAction<ExpenseRecord[]>>;
  personalExpenses: ExpenseRecord[];
  setPersonalExpenses: React.Dispatch<React.SetStateAction<ExpenseRecord[]>>;
  deductions: Record<string, boolean>;
  toggleDeduction: (key: string) => void;
  deductionAmounts: Record<string, number>;
  setDeductionAmount: (key: string, amount: number) => void;
  deductionNotes: Record<string, string>;
  setDeductionNote: (key: string, note: string) => void;
  expenseMethod: "lumpsum" | "actual";
  setExpenseMethod: React.Dispatch<React.SetStateAction<"lumpsum" | "actual">>;
  monthlyGoal: number;
  setMonthlyGoal: (goal: number) => void;
  updateIncome: (id: string, patch: Partial<IncomeRecord>) => void;
  upsertIncomeFromQuotation: (
    rec: Omit<IncomeRecord, "id"> & { sourceQuotationId: string },
  ) => void;
  removeIncomeBySource: (sourceQuotationId: string) => void;
  isLoading: boolean;
};

const Ctx = React.createContext<State | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [clients, setClients] = React.useState<Client[]>([]);

  const subsHook = useFinanceSubs(userId);
  const pmHook = useFinancePaymentMethods(userId);
  const expensesHook = useFinanceExpenses(userId);
  const incomesHook = useFinanceIncomes(userId);
  const deductionsHook = useFinanceDeductions(userId);
  const settingsHook = useFinanceSettings(userId);

  const isLoading = subsHook.isLoading || pmHook.isLoading || expensesHook.isLoading;

  const value = React.useMemo<State>(
    () => ({
      subs: subsHook.subs,
      setSubs: subsHook.setSubs,
      paymentMethods: pmHook.paymentMethods,
      setPaymentMethods: pmHook.setPaymentMethods,
      clients,
      setClients,
      incomes: incomesHook.incomes,
      addIncome: incomesHook.addIncome,
      workExpenses: expensesHook.workExpenses,
      setWorkExpenses: expensesHook.setWorkExpenses,
      personalExpenses: expensesHook.personalExpenses,
      setPersonalExpenses: expensesHook.setPersonalExpenses,
      deductions: deductionsHook.deductions,
      toggleDeduction: deductionsHook.toggleDeduction,
      deductionAmounts: deductionsHook.deductionAmounts,
      setDeductionAmount: deductionsHook.setDeductionAmount,
      deductionNotes: deductionsHook.deductionNotes,
      setDeductionNote: deductionsHook.setDeductionNote,
      expenseMethod: settingsHook.expenseMethod,
      setExpenseMethod: settingsHook.setExpenseMethod,
      monthlyGoal: settingsHook.monthlyGoal,
      setMonthlyGoal: settingsHook.setMonthlyGoal,
      updateIncome: incomesHook.updateIncome,
      upsertIncomeFromQuotation: incomesHook.upsertIncomeFromQuotation,
      removeIncomeBySource: incomesHook.removeIncomeBySource,
      isLoading,
    }),
    [subsHook, pmHook, expensesHook, incomesHook, deductionsHook, settingsHook, clients, isLoading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinance() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useFinance must be inside FinanceProvider");
  return v;
}
