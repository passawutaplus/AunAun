import type { Json } from "@/integrations/supabase/types";
import { iconKey, iconFromKey } from "@/lib/iconRegistry";
import type {
  Subscription,
  SubCategory,
  SubStatus,
  SubPriceMode,
  PaymentMethod,
  PaymentKind,
  IncomeRecord,
  ExpenseRecord,
  IncomeType,
} from "@/data/mockData";

// ──────────────────────────── Row types ────────────────────────────
export type IncomeRow = {
  id: string;
  user_id: string;
  source_quotation_id: string | null;
  month: string;
  source: string;
  category: string;
  gross: number;
  wht: number;
  vat: number;
  net: number;
  has_certificate: boolean;
  receive_date: string | null;
  meta: Record<string, unknown>;
};

export type SubRow = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  price: number;
  cycle: string;
  next_renewal: string | null;
  is_active: boolean;
  payment_method_id: string | null;
  meta: Record<string, unknown>;
};

export type PmRow = {
  id: string;
  user_id: string;
  label: string;
  kind: string;
  last4: string | null;
  meta: Record<string, unknown>;
};

export type ExpRow = {
  id: string;
  user_id: string;
  scope: string;
  label: string;
  amount: number;
  category: string | null;
  spent_date: string | null;
  month: string;
  is_deductible: boolean;
  meta: Record<string, unknown>;
};

// ──────────────────────────── INCOME mappers ────────────────────────────
export function rowToIncome(r: IncomeRow): IncomeRecord {
  const meta = (r.meta ?? {}) as {
    whtRate?: number;
    certificateNo?: string;
    certificateStoragePath?: string;
    note?: string;
    incomeType?: IncomeType;
  };
  return {
    id: r.id,
    month: r.month,
    client: r.source,
    gross: Number(r.gross),
    withholding: Number(r.wht),
    incomeType: meta.incomeType,
    whtRate: meta.whtRate,
    certificateNo: meta.certificateNo,
    certificateReceived: r.has_certificate,
    certificateStoragePath: meta.certificateStoragePath,
    note: meta.note,
    sourceQuotationId: r.source_quotation_id ?? undefined,
  };
}

export function incomeToRow(rec: IncomeRecord, userId: string) {
  const meta: Record<string, Json> = {};
  if (rec.whtRate !== undefined) meta.whtRate = rec.whtRate;
  if (rec.certificateNo) meta.certificateNo = rec.certificateNo;
  if (rec.certificateStoragePath) meta.certificateStoragePath = rec.certificateStoragePath;
  if (rec.note) meta.note = rec.note;
  if (rec.incomeType) meta.incomeType = rec.incomeType;
  return {
    user_id: userId,
    source_quotation_id: rec.sourceQuotationId ?? null,
    month: rec.month,
    source: rec.client,
    category: rec.incomeType ?? "freelance",
    gross: rec.gross,
    wht: rec.withholding,
    vat: 0,
    net: rec.gross - rec.withholding,
    has_certificate: rec.certificateReceived ?? false,
    receive_date: null as string | null,
    meta: meta as Json,
  };
}

// ──────────────────────────── SUB mappers ────────────────────────────
export function rowToSub(r: SubRow): Subscription {
  const meta = (r.meta ?? {}) as {
    icon?: string;
    billingDay?: number;
    status?: SubStatus;
    priceMode?: SubPriceMode;
    fullPrice?: number;
    installmentMonths?: number;
    installmentsPaid?: number;
  };
  return {
    id: r.id,
    name: r.name,
    category: (r.category as SubCategory) ?? "Productivity",
    amount: Number(r.price),
    billingDay: meta.billingDay ?? 1,
    paymentMethodId: r.payment_method_id ?? "",
    icon: iconFromKey(meta.icon),
    status: meta.status ?? (r.is_active ? "active" : "paused"),
    priceMode: meta.priceMode,
    fullPrice: meta.fullPrice,
    installmentMonths: meta.installmentMonths,
    installmentsPaid: meta.installmentsPaid,
  };
}

export function subToRow(s: Subscription, userId: string) {
  const meta: Record<string, Json> = {
    icon: iconKey(s.icon),
    billingDay: s.billingDay,
  };
  if (s.status) meta.status = s.status;
  if (s.priceMode) meta.priceMode = s.priceMode;
  if (s.fullPrice !== undefined) meta.fullPrice = s.fullPrice;
  if (s.installmentMonths !== undefined) meta.installmentMonths = s.installmentMonths;
  if (s.installmentsPaid !== undefined) meta.installmentsPaid = s.installmentsPaid;
  return {
    id: s.id,
    user_id: userId,
    name: s.name,
    category: s.category,
    price: s.amount,
    cycle: "monthly",
    payment_method_id: s.paymentMethodId || null,
    is_active: (s.status ?? "active") !== "cancelled",
    meta: meta as Json,
  };
}

// ──────────────────────────── PaymentMethod mappers ────────────────────────────
export function rowToPm(r: PmRow): PaymentMethod {
  const meta = (r.meta ?? {}) as { icon?: string; statementDay?: number; dueDay?: number };
  return {
    id: r.id,
    label: r.label,
    type: (r.kind as PaymentKind) ?? "credit",
    last4: r.last4 ?? "",
    icon: iconFromKey(meta.icon),
    statementDay: meta.statementDay,
    dueDay: meta.dueDay,
  };
}

export function pmToRow(p: PaymentMethod, userId: string) {
  const meta: Record<string, Json> = { icon: iconKey(p.icon) };
  if (p.statementDay) meta.statementDay = p.statementDay;
  if (p.dueDay) meta.dueDay = p.dueDay;
  return {
    id: p.id,
    user_id: userId,
    label: p.label,
    kind: p.type,
    last4: p.last4 || null,
    meta: meta as Json,
  };
}

// ──────────────────────────── Expense mappers ────────────────────────────
export function rowToExp(r: ExpRow): ExpenseRecord {
  const meta = (r.meta ?? {}) as { receiptUrl?: string; receiptPath?: string };
  return {
    id: r.id,
    description: r.label,
    amount: Number(r.amount),
    date: r.spent_date ?? r.month + "-01",
    category: (r.scope as "work" | "personal") ?? "personal",
    subCategory: r.category ?? undefined,
    receiptUrl: meta.receiptUrl,
    receiptPath: meta.receiptPath,
  };
}

export function expToRow(e: ExpenseRecord, userId: string, scope: "work" | "personal") {
  const month = (e.date || new Date().toISOString().slice(0, 10)).slice(0, 7);
  const meta: Record<string, Json> = {};
  if (e.receiptUrl) meta.receiptUrl = e.receiptUrl;
  if (e.receiptPath) meta.receiptPath = e.receiptPath;
  return {
    id: e.id,
    user_id: userId,
    scope,
    label: e.description,
    amount: e.amount,
    category: e.subCategory ?? null,
    spent_date: e.date || null,
    month,
    is_deductible: scope === "work",
    meta: meta as Json,
  };
}
