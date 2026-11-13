export const incomesKey = (uid?: string) => ["finance_incomes", uid ?? "anon"] as const;
export const settingsKey = (uid?: string) => ["finance_settings", uid ?? "anon"] as const;
