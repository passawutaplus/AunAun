import type { HireIncomeItem } from "@/lib/payments/hireWallet";
import { satangToThb } from "@/lib/payments/fees";
import { bangkokYmd } from "@/lib/format";

export type HireIncomeWeekPoint = {
  weekStart: string;
  label: string;
  revenueSatang: number;
  feeSatang: number;
  netSatang: number;
  count: number;
};

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function mondayOfYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const monOffset = utcDay === 0 ? 6 : utcDay - 1;
  return addDaysYmd(ymd, -monOffset);
}

function thaiShortRange(startYmd: string, endYmd: string): string {
  const fmt = new Intl.DateTimeFormat("th-TH", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
  const [ys, ms, ds] = startYmd.split("-").map(Number);
  const [ye, me, de] = endYmd.split("-").map(Number);
  const start = fmt.format(new Date(Date.UTC(ys, ms - 1, ds)));
  const end = fmt.format(new Date(Date.UTC(ye, me - 1, de)));
  return `${start}–${end}`;
}

/** Last N Bangkok weeks (Monday–Sunday), oldest first. Empty weeks included. */
export function buildHireIncomeWeekSeries(
  items: HireIncomeItem[],
  opts?: { now?: Date; weekCount?: number },
): HireIncomeWeekPoint[] {
  const now = opts?.now ?? new Date();
  const weekCount = opts?.weekCount ?? 8;
  const thisMonday = mondayOfYmd(bangkokYmd(now));
  const buckets = new Map<string, HireIncomeWeekPoint>();

  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = addDaysYmd(thisMonday, -7 * i);
    const weekEnd = addDaysYmd(weekStart, 6);
    buckets.set(weekStart, {
      weekStart,
      label: thaiShortRange(weekStart, weekEnd),
      revenueSatang: 0,
      feeSatang: 0,
      netSatang: 0,
      count: 0,
    });
  }

  for (const row of items) {
    if (!row.occurredAt) continue;
    const monday = mondayOfYmd(bangkokYmd(new Date(row.occurredAt)));
    const bucket = buckets.get(monday);
    if (!bucket) continue;
    bucket.revenueSatang += row.jobPriceSatang;
    bucket.feeSatang += row.platformFeeSatang;
    bucket.netSatang += row.sellerNetSatang;
    bucket.count += 1;
  }

  return [...buckets.values()];
}

export function hireIncomeYearSatang(
  items: HireIncomeItem[],
  year: number,
): { revenueSatang: number; feeSatang: number; whtSatang: number; netSatang: number; count: number } {
  const acc = { revenueSatang: 0, feeSatang: 0, whtSatang: 0, netSatang: 0, count: 0 };
  for (const row of items) {
    if (!row.occurredAt) continue;
    const y = Number(bangkokYmd(new Date(row.occurredAt)).slice(0, 4));
    if (y !== year) continue;
    acc.revenueSatang += row.jobPriceSatang;
    acc.feeSatang += row.platformFeeSatang;
    acc.whtSatang += row.whtSatang;
    acc.netSatang += row.sellerNetSatang;
    acc.count += 1;
  }
  return acc;
}

export function chartPointThb(point: HireIncomeWeekPoint) {
  return {
    label: point.label,
    revenue: satangToThb(point.revenueSatang),
    net: satangToThb(point.netSatang),
    fee: satangToThb(point.feeSatang),
  };
}
