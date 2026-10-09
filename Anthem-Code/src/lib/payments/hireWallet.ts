import { emptyParty, type OfferPartyInfo } from "@/lib/chatOffer";
import type { BusinessDocument } from "@/lib/documents/documentPayload";
import {
  buildPlatformFeeReceiptSnapshot,
  buildReceiptSnapshot,
  type HireOrderDocContext,
} from "@/lib/documents/issueHireDocuments";
import { snapshotFees, satangToThb, thbToSatang } from "@/lib/payments/fees";
import { evaluateManualPayout, PAYOUT_MIN_SATANG, bangkokMonthKey } from "@/lib/payments/payoutPolicy";
import type { HireOrderStatus } from "@/lib/payments/types";
import { bangkokYmd } from "@/lib/format";

export type HireWalletReceipt = {
  kind: "receipt" | "platform_fee_receipt";
  docNumber: string;
  snapshot: BusinessDocument;
};

export type HireIncomeItem = {
  id: string;
  title: string;
  buyerName: string;
  status: HireOrderStatus;
  jobPriceSatang: number;
  platformFeeSatang: number;
  platformFeePercent: number;
  whtSatang: number;
  sellerNetSatang: number;
  occurredAt: string | null;
  /** Where this net amount sits for the seller. */
  walletBucket: "pending" | "available" | "transferring" | "paid_out";
  isPreview: boolean;
  receipts: HireWalletReceipt[];
};

export type HirePayoutItem = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  amountSatang: number;
  feeSatang: number;
  transferSatang: number;
  bankName: string;
  accountLast4: string;
  createdAt: string;
  completedAt: string | null;
  isPreview: boolean;
};

export type HireWalletView = {
  pendingSatang: number;
  availableSatang: number;
  payoutReservedSatang: number;
  paidOutSatang: number;
  income: HireIncomeItem[];
  payouts: HirePayoutItem[];
  isPreview: boolean;
  freeWithdrawalsUsedThisMonth: number;
  bankName: string;
  accountLast4: string;
  accountName: string;
};

export const HIRE_WALLET_PREVIEW_STORAGE_KEY = "aplus1:hire-wallet-preview-v2";

export type HireIncomeFilter = "all" | "pending" | "available" | "transferring" | "paid_out";

export const HIRE_INCOME_FILTERS: { id: HireIncomeFilter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "pending", label: "รอตรวจสอบ" },
  { id: "available", label: "อยู่ในกระเป๋า" },
  { id: "transferring", label: "กำลังโอน" },
  { id: "paid_out", label: "โอนแล้ว" },
];

export function incomeBucketLabelTh(bucket: HireIncomeItem["walletBucket"]): string {
  switch (bucket) {
    case "pending":
      return "รอตรวจสอบ";
    case "available":
      return "อยู่ในกระเป๋า";
    case "transferring":
      return "กำลังโอน";
    case "paid_out":
      return "โอนแล้ว";
    default:
      return bucket;
  }
}

export function filterHireIncome(
  items: HireIncomeItem[],
  filter: HireIncomeFilter,
): HireIncomeItem[] {
  if (filter === "all") return items;
  return items.filter((row) => row.walletBucket === filter);
}

export function countHireIncomeByFilter(
  items: HireIncomeItem[],
): Record<HireIncomeFilter, number> {
  return {
    all: items.length,
    pending: items.filter((row) => row.walletBucket === "pending").length,
    available: items.filter((row) => row.walletBucket === "available").length,
    transferring: items.filter((row) => row.walletBucket === "transferring").length,
    paid_out: items.filter((row) => row.walletBucket === "paid_out").length,
  };
}

export function hireIncomeEmptyCopy(filter: HireIncomeFilter): string {
  switch (filter) {
    case "pending":
      return "ยังไม่มีงานรอตรวจสอบ";
    case "available":
      return "ยังไม่มีงานที่อยู่ในกระเป๋า";
    case "transferring":
      return "ยังไม่มีงานที่กำลังโอน";
    case "paid_out":
      return "ยังไม่มีงานที่โอนเข้าบัญชีแล้ว";
    default:
      return "ยังไม่มีรายได้จากงานจ้าง";
  }
}

export type HireLedgerKind = "all" | "income" | "payout";
export type HireLedgerPeriod = "all" | "week" | "month";

export const HIRE_LEDGER_KINDS: { id: HireLedgerKind; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "income", label: "รายได้" },
  { id: "payout", label: "การถอน" },
];

export const HIRE_LEDGER_PERIODS: { id: HireLedgerPeriod; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "week", label: "7 วันล่าสุด" },
  { id: "month", label: "เดือนนี้" },
];

export type HireLedgerRow =
  | { kind: "income"; id: string; at: string; income: HireIncomeItem }
  | { kind: "payout"; id: string; at: string; payout: HirePayoutItem };

export type HireIncomeSummary = {
  revenueSatang: number;
  platformFeeSatang: number;
  whtSatang: number;
  netSatang: number;
  count: number;
};

export type HirePayoutSummary = {
  amountSatang: number;
  feeSatang: number;
  transferSatang: number;
  count: number;
};

export function summarizeHireIncome(items: HireIncomeItem[]): HireIncomeSummary {
  return items.reduce<HireIncomeSummary>(
    (acc, row) => ({
      revenueSatang: acc.revenueSatang + row.jobPriceSatang,
      platformFeeSatang: acc.platformFeeSatang + row.platformFeeSatang,
      whtSatang: acc.whtSatang + row.whtSatang,
      netSatang: acc.netSatang + row.sellerNetSatang,
      count: acc.count + 1,
    }),
    { revenueSatang: 0, platformFeeSatang: 0, whtSatang: 0, netSatang: 0, count: 0 },
  );
}

export function summarizeHirePayouts(items: HirePayoutItem[]): HirePayoutSummary {
  return items.reduce<HirePayoutSummary>(
    (acc, row) => ({
      amountSatang: acc.amountSatang + row.amountSatang,
      feeSatang: acc.feeSatang + row.feeSatang,
      transferSatang: acc.transferSatang + row.transferSatang,
      count: acc.count + 1,
    }),
    { amountSatang: 0, feeSatang: 0, transferSatang: 0, count: 0 },
  );
}

export function buildHireLedgerRows(
  income: HireIncomeItem[],
  payouts: HirePayoutItem[],
): HireLedgerRow[] {
  const rows: HireLedgerRow[] = [
    ...income.map((item) => ({
      kind: "income" as const,
      id: item.id,
      at: item.occurredAt ?? "",
      income: item,
    })),
    ...payouts.map((item) => ({
      kind: "payout" as const,
      id: item.id,
      at: item.createdAt,
      payout: item,
    })),
  ];
  rows.sort((a, b) => {
    const ta = a.at ? new Date(a.at).getTime() : 0;
    const tb = b.at ? new Date(b.at).getTime() : 0;
    return tb - ta;
  });
  return rows;
}

function addCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function isInLedgerPeriod(
  at: string,
  period: HireLedgerPeriod,
  now: Date = new Date(),
): boolean {
  if (period === "all") return true;
  if (!at) return false;
  const row = new Date(at);
  if (Number.isNaN(row.getTime())) return false;
  if (period === "month") return bangkokMonthKey(row) === bangkokMonthKey(now);
  const today = bangkokYmd(now);
  const start = addCalendarDays(today, -7);
  const day = bangkokYmd(row);
  return day >= start && day <= today;
}

export function rowMatchesStatus(row: HireLedgerRow, filter: HireIncomeFilter): boolean {
  if (filter === "all") return true;
  if (row.kind === "income") return row.income.walletBucket === filter;
  if (filter === "transferring") {
    return row.payout.status === "processing" || row.payout.status === "queued";
  }
  if (filter === "paid_out") return row.payout.status === "completed";
  return false;
}

export function rowMatchesQuery(row: HireLedgerRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (row.kind === "income") {
    const hay = [
      row.income.title,
      row.income.buyerName,
      row.income.id,
      ...row.income.receipts.map((doc) => doc.docNumber),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  }
  const hay = [
    row.payout.bankName,
    row.payout.accountLast4,
    row.payout.id,
    "ถอน",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export function filterHireLedger(input: {
  income: HireIncomeItem[];
  payouts: HirePayoutItem[];
  kind?: HireLedgerKind;
  status?: HireIncomeFilter;
  period?: HireLedgerPeriod;
  query?: string;
  now?: Date;
}): HireLedgerRow[] {
  const kind = input.kind ?? "all";
  const status = input.status ?? "all";
  const period = input.period ?? "all";
  const query = input.query ?? "";
  const now = input.now ?? new Date();
  return buildHireLedgerRows(input.income, input.payouts).filter((row) => {
    if (kind !== "all" && row.kind !== kind) return false;
    if (!isInLedgerPeriod(row.at, period, now)) return false;
    if (!rowMatchesStatus(row, status)) return false;
    return rowMatchesQuery(row, query);
  });
}

export function countLedgerByKind(
  income: HireIncomeItem[],
  payouts: HirePayoutItem[],
): Record<HireLedgerKind, number> {
  return {
    all: income.length + payouts.length,
    income: income.length,
    payout: payouts.length,
  };
}

export function countLedgerByStatus(rows: HireLedgerRow[]): Record<HireIncomeFilter, number> {
  return {
    all: rows.length,
    pending: rows.filter((row) => rowMatchesStatus(row, "pending")).length,
    available: rows.filter((row) => rowMatchesStatus(row, "available")).length,
    transferring: rows.filter((row) => rowMatchesStatus(row, "transferring")).length,
    paid_out: rows.filter((row) => rowMatchesStatus(row, "paid_out")).length,
  };
}

export function hireLedgerEmptyCopy(input: {
  kind: HireLedgerKind;
  status: HireIncomeFilter;
  period: HireLedgerPeriod;
  hasQuery: boolean;
}): string {
  if (input.hasQuery) return "ไม่พบรายการที่ค้นหา";
  if (input.period !== "all") return "ไม่มีรายการในช่วงเวลานี้";
  if (input.kind === "payout") {
    if (input.status === "pending" || input.status === "available") {
      return "การถอนไม่มีหมวดนี้ — สลับไปแท็บรายได้";
    }
    if (input.status === "transferring") return "ยังไม่มีรายการที่กำลังโอน";
    if (input.status === "paid_out") return "ยังไม่มีรายการที่โอนแล้ว";
    return "ยังไม่เคยถอน";
  }
  return hireIncomeEmptyCopy(input.status);
}

function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function hireLedgerToCsv(rows: HireLedgerRow[]): string {
  const header = [
    "ประเภท",
    "รายการ",
    "คู่ค้า",
    "วันที่",
    "รายได้",
    "ค่าธรรมเนียม",
    "หัก ณ ที่จ่าย",
    "สุทธิ",
    "สถานะ",
    "เลขเอกสาร",
  ];
  const lines = rows.map((row) => {
    if (row.kind === "income") {
      return [
        "รายได้",
        row.income.title,
        row.income.buyerName,
        row.at ? bangkokYmd(new Date(row.at)) : "",
        satangToThb(row.income.jobPriceSatang),
        satangToThb(row.income.platformFeeSatang),
        satangToThb(row.income.whtSatang),
        satangToThb(row.income.sellerNetSatang),
        incomeBucketLabelTh(row.income.walletBucket),
        row.income.receipts.map((doc) => doc.docNumber).join(" "),
      ].map(csvCell).join(",");
    }
    return [
      "การถอน",
      `ถอนเข้า ${row.payout.bankName} ****${row.payout.accountLast4}`,
      row.payout.bankName,
      row.at ? bangkokYmd(new Date(row.at)) : "",
      satangToThb(row.payout.amountSatang),
      satangToThb(row.payout.feeSatang),
      0,
      satangToThb(row.payout.transferSatang),
      payoutStatusLabelTh(row.payout.status),
      row.payout.id,
    ].map(csvCell).join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

export function payoutStatusLabelTh(status: HirePayoutItem["status"]): string {
  switch (status) {
    case "queued":
      return "รอคิว";
    case "processing":
      return "กำลังโอน";
    case "completed":
      return "โอนแล้ว";
    case "failed":
      return "ไม่สำเร็จ";
    default:
      return status;
  }
}

export function payoutEligibilityReasonTh(reason?: string): string {
  switch (reason) {
    case "bank_not_verified":
      return "ยืนยันบัญชีธนาคารก่อนถอน";
    case "kyc_required":
      return "ยืนยันตัวตนก่อนถอน";
    case "below_minimum":
      return "ขั้นต่ำถอน 1,000 บาท";
    case "fee_exceeds_balance":
      return "ยอดไม่พอหลังหักค่าธรรมเนียมโอน";
    case "invalid_amount":
      return "ระบุจำนวนเงินให้ถูกต้อง";
    case "exceeds_balance":
      return "ถอนได้ไม่เกินยอดในกระเป๋า";
    default:
      return "ยังถอนไม่ได้";
  }
}

export function countFreeWithdrawalsUsed(
  payouts: HirePayoutItem[],
  now: Date = new Date(),
): number {
  const month = bangkokMonthKey(now);
  return payouts.filter((p) => {
    if (p.status === "failed") return false;
    return bangkokMonthKey(new Date(p.createdAt)) === month;
  }).length;
}

const SELLER: OfferPartyInfo & { email?: string | null } = {
  ...emptyParty("individual"),
  name: "ผู้รับงาน (ตัวอย่าง)",
  email: "creator@demo.pixel100.com",
};

function buyerParty(name: string, company?: boolean): OfferPartyInfo & { email?: string | null } {
  if (company) {
    return {
      ...emptyParty("corporate"),
      name,
      companyName: name,
      taxId: "0105560000000",
    };
  }
  return {
    ...emptyParty("individual"),
    name,
  };
}

function jobReceipts(input: {
  orderId: string;
  title: string;
  buyer: OfferPartyInfo & { email?: string | null };
  jobPriceSatang: number;
  issuedAt: string;
  receiptNo: string;
  feeNo: string;
  paymentMethodLabel: string;
  whtSatang?: number;
}): HireWalletReceipt[] {
  const money = snapshotFees(input.jobPriceSatang, "promptpay", undefined, {
    whtSatang: input.whtSatang ?? 0,
  });
  const ctx: HireOrderDocContext = {
    id: input.orderId,
    jobPriceSatang: input.jobPriceSatang,
    platformFeeSatang: money.fee.platformFeeSatang,
    platformFeePercent: money.fee.platformFeePercent,
    sellerNetSatang: money.sellerNetSatang,
    whtSatang: money.whtSatang,
    buyerPaysSatang: money.buyerPaysSatang,
    paymentMethodLabel: input.paymentMethodLabel,
  };
  const lineItems = [
    {
      id: "job",
      name: input.title,
      quantity: 1,
      unitPrice: input.jobPriceSatang / 100,
      amount: input.jobPriceSatang / 100,
    },
  ];
  const receipt = buildReceiptSnapshot({
    order: ctx,
    projectTitle: input.title,
    issuer: SELLER,
    client: input.buyer,
    lineItems,
    amountPaidSatang: money.buyerPaysSatang,
    docNumber: input.receiptNo,
    issuedAt: input.issuedAt,
    paymentMethodLabel: input.paymentMethodLabel,
  });
  receipt.notes = "ใบเสร็จรับเงินค่าจ้างงาน — เอกสารตัวอย่างสำหรับทดลองหน้ากระเป๋า";
  const fee = buildPlatformFeeReceiptSnapshot({
    order: ctx,
    projectTitle: input.title,
    buyer: SELLER,
    docNumber: input.feeNo,
    issuedAt: input.issuedAt,
    referenceDocNumber: input.receiptNo,
  });
  fee.notes = "ใบเสร็จค่าธรรมเนียมแพลตฟอร์ม 10% — เอกสารตัวอย่าง แยกจากค่าจ้าง";
  return [
    { kind: "receipt", docNumber: receipt.docNumber, snapshot: receipt },
    { kind: "platform_fee_receipt", docNumber: fee.docNumber, snapshot: fee },
  ];
}

function incomeFromJob(input: {
  id: string;
  title: string;
  buyerName: string;
  buyer: OfferPartyInfo & { email?: string | null };
  jobThb: number;
  status: HireOrderStatus;
  walletBucket: HireIncomeItem["walletBucket"];
  occurredAt: string;
  receiptNo: string;
  feeNo: string;
  whtRate?: number;
}): HireIncomeItem {
  const jobPriceSatang = thbToSatang(input.jobThb);
  const whtSatang = input.whtRate
    ? Math.round((jobPriceSatang * input.whtRate) / 100)
    : 0;
  const money = snapshotFees(jobPriceSatang, "promptpay", undefined, { whtSatang });
  return {
    id: input.id,
    title: input.title,
    buyerName: input.buyerName,
    status: input.status,
    jobPriceSatang,
    platformFeeSatang: money.fee.platformFeeSatang,
    platformFeePercent: money.fee.platformFeePercent,
    whtSatang: money.whtSatang,
    sellerNetSatang: money.sellerNetSatang,
    occurredAt: input.occurredAt,
    walletBucket: input.walletBucket,
    isPreview: true,
    receipts: jobReceipts({
      orderId: input.id,
      title: input.title,
      buyer: input.buyer,
      jobPriceSatang,
      issuedAt: input.occurredAt,
      receiptNo: input.receiptNo,
      feeNo: input.feeNo,
      paymentMethodLabel: "พร้อมเพย์ (QR)",
      whtSatang,
    }),
  };
}

/** Deterministic preview wallet — labeled ตัวอย่าง, not live money. */
export function seedHireWalletPreview(): HireWalletView {
  const cafeBuyer = buyerParty("นภา ศรีสุข");
  const motionBuyer = buyerParty("บริษัท โมชั่นแล็บ จำกัด", true);
  const podBuyer = buyerParty("พีรพล จันทร์ทอง");
  const eventBuyer = buyerParty("อีเวนต์ พลัส จำกัด", true);
  const videoBuyer = buyerParty("คุณมานี รักดี");

  const income: HireIncomeItem[] = [
    incomeFromJob({
      id: "preview-income-logo",
      title: "ออกแบบโลโก้ร้านกาแฟ",
      buyerName: "นภา ศรีสุข",
      buyer: cafeBuyer,
      jobThb: 8_000,
      status: "available",
      walletBucket: "available",
      occurredAt: "2026-08-20T10:00:00+07:00",
      receiptNo: "RCP-2026-1842",
      feeNo: "FEE-2026-1842",
    }),
    incomeFromJob({
      id: "preview-income-motion",
      title: "Motion graphic โฆษณาสั้น",
      buyerName: "บริษัท โมชั่นแล็บ จำกัด",
      buyer: motionBuyer,
      jobThb: 12_500,
      status: "available",
      walletBucket: "available",
      occurredAt: "2026-08-22T14:30:00+07:00",
      receiptNo: "RCP-2026-1901",
      feeNo: "FEE-2026-1901",
    }),
    incomeFromJob({
      id: "preview-income-podcast",
      title: "ปกพอดแคสต์ 4 ตอน",
      buyerName: "พีรพล จันทร์ทอง",
      buyer: podBuyer,
      jobThb: 5_000,
      status: "awaiting_approval",
      walletBucket: "pending",
      occurredAt: "2026-08-25T09:15:00+07:00",
      receiptNo: "RCP-2026-2011",
      feeNo: "FEE-2026-2011",
    }),
    incomeFromJob({
      id: "preview-income-video",
      title: "ตัดต่อวิดีโอรีวิวสินค้า",
      buyerName: "มานี รักดี",
      buyer: videoBuyer,
      jobThb: 4_000,
      status: "available",
      walletBucket: "transferring",
      occurredAt: "2026-08-18T11:00:00+07:00",
      receiptNo: "RCP-2026-1766",
      feeNo: "FEE-2026-1766",
    }),
    incomeFromJob({
      id: "preview-income-banner",
      title: "แบนเนอร์งานอีเวนต์",
      buyerName: "อีเวนต์ พลัส จำกัด",
      buyer: eventBuyer,
      jobThb: 13_500,
      status: "available",
      walletBucket: "paid_out",
      occurredAt: "2026-08-05T16:00:00+07:00",
      receiptNo: "RCP-2026-1620",
      feeNo: "FEE-2026-1620",
      whtRate: 3,
    }),
  ];

  const availableSatang = income
    .filter((i) => i.walletBucket === "available")
    .reduce((s, i) => s + i.sellerNetSatang, 0);
  const pendingSatang = income
    .filter((i) => i.walletBucket === "pending")
    .reduce((s, i) => s + i.sellerNetSatang, 0);
  const paidOutSatang = income
    .filter((i) => i.walletBucket === "paid_out")
    .reduce((s, i) => s + i.sellerNetSatang, 0);
  const transferringSatang = income
    .filter((i) => i.walletBucket === "transferring")
    .reduce((s, i) => s + i.sellerNetSatang, 0);

  const payouts: HirePayoutItem[] = [
    {
      id: "preview-payout-processing",
      status: "processing",
      amountSatang: transferringSatang,
      feeSatang: 0,
      transferSatang: transferringSatang,
      bankName: "กสิกรไทย",
      accountLast4: "4521",
      createdAt: "2026-08-26T16:10:00+07:00",
      completedAt: null,
      isPreview: true,
    },
    {
      id: "preview-payout-aug",
      status: "completed",
      amountSatang: paidOutSatang,
      feeSatang: 0,
      transferSatang: paidOutSatang,
      bankName: "กสิกรไทย",
      accountLast4: "4521",
      createdAt: "2026-08-08T11:20:00+07:00",
      completedAt: "2026-08-11T09:40:00+07:00",
      isPreview: true,
    },
  ];

  return {
    pendingSatang,
    availableSatang,
    payoutReservedSatang: transferringSatang,
    paidOutSatang,
    income,
    payouts,
    isPreview: true,
    freeWithdrawalsUsedThisMonth: countFreeWithdrawalsUsed(payouts, new Date("2026-08-27T12:00:00+07:00")),
    bankName: "กสิกรไทย",
    accountLast4: "4521",
    accountName: "สมชาย ใจดี",
  };
}

export type ApplyPreviewWithdrawResult =
  | { ok: true; next: HireWalletView }
  | { ok: false; reason: string };

/** Preview-only: queue a manual payout without calling the PSP. */
export function applyPreviewWithdraw(
  view: HireWalletView,
  amountSatang: number,
  now: Date = new Date(),
): ApplyPreviewWithdrawResult {
  if (!Number.isInteger(amountSatang) || amountSatang <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }
  if (amountSatang > view.availableSatang) {
    return { ok: false, reason: "exceeds_balance" };
  }
  const eligibility = evaluateManualPayout({
    availableSatang: amountSatang,
    freeWithdrawalsUsedThisMonth: view.freeWithdrawalsUsedThisMonth,
    bankVerified: true,
    kycVerified: true,
    isManual: true,
  });
  if (!eligibility.ok) {
    return { ok: false, reason: eligibility.reason ?? "payout_not_eligible" };
  }

  const payout: HirePayoutItem = {
    id: `preview-payout-${now.getTime()}`,
    status: "processing",
    amountSatang,
    feeSatang: eligibility.feeSatang,
    transferSatang: eligibility.transferSatang,
    bankName: view.bankName,
    accountLast4: view.accountLast4,
    createdAt: now.toISOString(),
    completedAt: null,
    isPreview: true,
  };

  const nextPayouts = [payout, ...view.payouts];
  return {
    ok: true,
    next: {
      ...view,
      availableSatang: view.availableSatang - amountSatang,
      payoutReservedSatang: view.payoutReservedSatang + eligibility.transferSatang,
      income:
        amountSatang >= view.availableSatang
          ? view.income.map((row) =>
              row.walletBucket === "available"
                ? { ...row, walletBucket: "transferring" as const }
                : row,
            )
          : view.income,
      payouts: nextPayouts,
      freeWithdrawalsUsedThisMonth: countFreeWithdrawalsUsed(nextPayouts, now),
    },
  };
}

export function parseHireWalletPreview(raw: string | null): HireWalletView | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as HireWalletView;
    if (!parsed || !Array.isArray(parsed.income) || !Array.isArray(parsed.payouts)) return null;
    if (typeof parsed.availableSatang !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export const PAYOUT_MIN_THB = PAYOUT_MIN_SATANG / 100;

/** Preview mock only when forced, or when the wallet is empty and the build allows it. */
export function shouldUseHireWalletPreview(opts: {
  hasRealIncome: boolean;
  forcePreview: boolean;
  allowEmptyPreview: boolean;
}): boolean {
  if (opts.forcePreview) return true;
  if (opts.hasRealIncome) return false;
  return opts.allowEmptyPreview;
}
