/** Compare Omise totals vs internal ledger — never auto-adjust balances. */

export type ReconciliationSide = {
  label: string;
  amountSatang: number;
};

export type ReconciliationDiff = {
  key: string;
  omiseSatang: number;
  ledgerSatang: number;
  deltaSatang: number;
};

export function diffReconciliation(
  omise: ReconciliationSide[],
  ledger: ReconciliationSide[],
): ReconciliationDiff[] {
  const map = new Map<string, ReconciliationDiff>();
  for (const row of omise) {
    map.set(row.label, {
      key: row.label,
      omiseSatang: row.amountSatang,
      ledgerSatang: 0,
      deltaSatang: row.amountSatang,
    });
  }
  for (const row of ledger) {
    const existing = map.get(row.label);
    if (existing) {
      existing.ledgerSatang = row.amountSatang;
      existing.deltaSatang = existing.omiseSatang - row.amountSatang;
    } else {
      map.set(row.label, {
        key: row.label,
        omiseSatang: 0,
        ledgerSatang: row.amountSatang,
        deltaSatang: -row.amountSatang,
      });
    }
  }
  return [...map.values()].filter((d) => d.deltaSatang !== 0);
}

export function formatReconciliationAlert(diffs: ReconciliationDiff[]): string {
  if (diffs.length === 0) return "ledger matches omise";
  return diffs
    .map(
      (d) =>
        `${d.key}: omise=${d.omiseSatang} ledger=${d.ledgerSatang} delta=${d.deltaSatang}`,
    )
    .join("; ");
}
