/**
 * Approximate Supabase plan cost from measured usage.
 * Rates from https://supabase.com/pricing (file storage / disk overage).
 * Not an official invoice — for admin monitoring only.
 */

export type CostPlanKey = "free" | "pro" | "team" | "enterprise" | string;

export type UsageCostEstimate = {
  planKey: CostPlanKey;
  planLabel: string;
  baseUsd: number;
  storageUsedGb: number;
  storageLimitGb: number;
  storageOverageGb: number;
  storageOverageUsd: number;
  dbUsedGb: number;
  dbLimitGb: number;
  dbOverageGb: number;
  dbOverageUsd: number;
  estimatedMonthlyUsd: number;
  estimatedMonthlyThb: number;
  usdToThb: number;
  storagePercent: number;
  dbPercent: number;
  status: "ok" | "watch" | "over";
  statusLabelTh: string;
  notesTh: string[];
};

const USD_TO_THB = 36;

/** Published overage rates (approx.) */
const RATES = {
  storageOveragePerGb: 0.0213,
  dbOveragePerGb: 0.125,
  proBase: 25,
  teamBase: 599,
  freeBase: 0,
};

function planKeyFromLabel(plan: string | undefined | null): CostPlanKey {
  const p = (plan ?? "free").toLowerCase();
  if (p.includes("team")) return "team";
  if (p.includes("enterprise")) return "enterprise";
  if (p.includes("pro")) return "pro";
  if (p.includes("free")) return "free";
  return p || "free";
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${Math.round(n)} B`;
}

export function estimateSupabaseMonthlyCost(input: {
  planLabel?: string | null;
  storageBytes: number;
  dbBytes: number;
  storageLimitGb?: number;
  dbLimitGb?: number;
}): UsageCostEstimate {
  const planKey = planKeyFromLabel(input.planLabel);
  const defaults =
    planKey === "free"
      ? { storage: 1, db: 0.5, base: RATES.freeBase, label: "Free" }
      : planKey === "team"
        ? { storage: 100, db: 8, base: RATES.teamBase, label: "Team" }
        : planKey === "enterprise"
          ? { storage: 100, db: 8, base: RATES.teamBase, label: "Enterprise" }
          : { storage: 100, db: 8, base: RATES.proBase, label: "Pro" };

  const storageLimitGb = input.storageLimitGb ?? defaults.storage;
  const dbLimitGb = input.dbLimitGb ?? defaults.db;
  const storageUsedGb = input.storageBytes / 1024 ** 3;
  const dbUsedGb = input.dbBytes / 1024 ** 3;

  const storageOverageGb = Math.max(0, storageUsedGb - storageLimitGb);
  const dbOverageGb = Math.max(0, dbUsedGb - dbLimitGb);

  // Free plan: no metered overage — usage over quota is blocked / grace, not billed
  const billOverage = planKey !== "free";
  const storageOverageUsd = billOverage ? storageOverageGb * RATES.storageOveragePerGb : 0;
  const dbOverageUsd = billOverage ? dbOverageGb * RATES.dbOveragePerGb : 0;
  const baseUsd = defaults.base;
  const estimatedMonthlyUsd = baseUsd + storageOverageUsd + dbOverageUsd;

  const storagePercent = storageLimitGb > 0 ? (storageUsedGb / storageLimitGb) * 100 : 0;
  const dbPercent = dbLimitGb > 0 ? (dbUsedGb / dbLimitGb) * 100 : 0;

  let status: UsageCostEstimate["status"] = "ok";
  if (storagePercent >= 100 || dbPercent >= 100) status = "over";
  else if (storagePercent >= 70 || dbPercent >= 70) status = "watch";

  const statusLabelTh =
    status === "over" ? "เกินลิมิตแล้ว" : status === "watch" ? "ใกล้ลิมิต — ระวัง" : "ยังอยู่ในลิมิต";

  const notesTh: string[] = [
    "ตัวเลขเป็นประมาณการจาก quota แผน + overage ประกาศบน supabase.com/pricing ไม่ใช่ใบแจ้งหนี้จริง",
    "ยังไม่รวม Compute / Egress / MAU / Edge Functions — ดูรายละเอียดใน Billing Usage",
  ];
  if (planKey === "free" && (storagePercent >= 100 || dbPercent >= 100)) {
    notesTh.unshift("แผน Free เกินโควต้าแล้ว — อัป Pro หรือลบไฟล์/ข้อมูลที่ไม่ใช้");
  }
  if (billOverage && (storageOverageGb > 0 || dbOverageGb > 0)) {
    notesTh.unshift(
      `Overage โดยประมาณ: Storage ${storageOverageGb.toFixed(2)} GB + DB ${dbOverageGb.toFixed(2)} GB`,
    );
  }

  return {
    planKey,
    planLabel: defaults.label,
    baseUsd,
    storageUsedGb,
    storageLimitGb,
    storageOverageGb,
    storageOverageUsd,
    dbUsedGb,
    dbLimitGb,
    dbOverageGb,
    dbOverageUsd,
    estimatedMonthlyUsd,
    estimatedMonthlyThb: estimatedMonthlyUsd * USD_TO_THB,
    usdToThb: USD_TO_THB,
    storagePercent,
    dbPercent,
    status,
    statusLabelTh,
    notesTh,
  };
}

export function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function formatThb(n: number): string {
  return `฿${Math.round(n).toLocaleString("th-TH")}`;
}
