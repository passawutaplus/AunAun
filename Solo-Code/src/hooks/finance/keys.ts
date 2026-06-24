export const incomesKey = (uid?: string) => ["finance_incomes", uid ?? "anon"] as const;
export const deductionsKey = (uid?: string) => ["finance_deductions", uid ?? "anon"] as const;
export const settingsKey = (uid?: string) => ["finance_settings", uid ?? "anon"] as const;
export const subsKey = (uid?: string) => ["finance_subs", uid ?? "anon"] as const;
export const pmKey = (uid?: string) => ["finance_pm", uid ?? "anon"] as const;
export const expKey = (uid?: string) => ["finance_expenses", uid ?? "anon"] as const;

export function diffById<T extends { id: string }>(prev: T[], next: T[]) {
  const prevMap = new Map(prev.map((x) => [x.id, x]));
  const nextMap = new Map(next.map((x) => [x.id, x]));
  const added: T[] = [];
  const updated: T[] = [];
  const removed: T[] = [];
  for (const [id, item] of nextMap) {
    const old = prevMap.get(id);
    if (!old) added.push(item);
    else if (JSON.stringify(old) !== JSON.stringify(item)) updated.push(item);
  }
  for (const [id, item] of prevMap) {
    if (!nextMap.has(id)) removed.push(item);
  }
  return { added, updated, removed };
}
