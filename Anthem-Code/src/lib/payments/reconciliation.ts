/** Compare provider (Payso) totals vs internal ledger — never auto-adjust balances. */

export type ReconciliationSide = {
  label: string;
  amountSatang: number;
};

export type ReconciliationDiff = {
  key: string;
  providerSatang: number;
  ledgerSatang: number;
  deltaSatang: number;
};

export function diffReconciliation(
  provider: ReconciliationSide[],
  ledger: ReconciliationSide[],
): ReconciliationDiff[] {
  const map = new Map<string, ReconciliationDiff>();
  for (const row of provider) {
    map.set(row.label, {
      key: row.label,
      providerSatang: row.amountSatang,
      ledgerSatang: 0,
      deltaSatang: row.amountSatang,
    });
  }
  for (const row of ledger) {
    const existing = map.get(row.label);
    if (existing) {
      existing.ledgerSatang = row.amountSatang;
      existing.deltaSatang = existing.providerSatang - row.amountSatang;
    } else {
      map.set(row.label, {
        key: row.label,
        providerSatang: 0,
        ledgerSatang: row.amountSatang,
        deltaSatang: -row.amountSatang,
      });
    }
  }
  return [...map.values()].filter((d) => d.deltaSatang !== 0);
}

export function formatReconciliationAlert(diffs: ReconciliationDiff[]): string {
  if (diffs.length === 0) return "ledger matches provider";
  return diffs
    .map(
      (d) =>
        `${d.key}: provider=${d.providerSatang} ledger=${d.ledgerSatang} delta=${d.deltaSatang}`,
    )
    .join("; ");
}
