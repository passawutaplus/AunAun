import * as React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { type Client, type IncomeRecord } from "@/data/mockData";
import { useFinanceIncomes } from "@/hooks/finance/useFinanceIncomes";
import { useFinanceSettings } from "@/hooks/finance/useFinanceSettings";

type State = {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  incomes: IncomeRecord[];
  addIncome: (rec: Omit<IncomeRecord, "id">) => void;
  monthlyGoal: number;
  setMonthlyGoal: (goal: number) => void;
  updateIncome: (id: string, patch: Partial<IncomeRecord>) => void;
  upsertIncomeFromQuotation: (
    rec: Omit<IncomeRecord, "id"> & { sourceQuotationId: string },
  ) => void;
  removeIncomeBySource: (sourceQuotationId: string) => void;
};

const Ctx = React.createContext<State | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [clients, setClients] = React.useState<Client[]>([]);

  const incomesHook = useFinanceIncomes(userId);
  const settingsHook = useFinanceSettings(userId);

  const value = React.useMemo<State>(
    () => ({
      clients,
      setClients,
      incomes: incomesHook.incomes,
      addIncome: incomesHook.addIncome,
      monthlyGoal: settingsHook.monthlyGoal,
      setMonthlyGoal: settingsHook.setMonthlyGoal,
      updateIncome: incomesHook.updateIncome,
      upsertIncomeFromQuotation: incomesHook.upsertIncomeFromQuotation,
      removeIncomeBySource: incomesHook.removeIncomeBySource,
    }),
    [incomesHook, settingsHook, clients],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinance() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useFinance must be inside FinanceProvider");
  return v;
}
