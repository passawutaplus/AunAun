/**
 * Studio documents (shared.studio_documents): quotation → invoice per installment → receipt.
 * Free launch: the freelancer issues documents and records payments; money moves directly
 * between the two parties. Chat messages carry a small pointer card (`__SAMECOR_DOC__:`).
 */
import {
  offerInstallmentAmounts,
  type ChatOfferPayload,
  type InstallmentAmounts,
} from "@/lib/chatOffer";
import type { BusinessDocument } from "@/lib/documents/documentPayload";
import { satangToThb } from "@/lib/payments/fees";

export { satangToThb };

export type StudioDocKind = "quotation" | "invoice" | "receipt";
export type StudioDocStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "paid"
  | "void";

export type StudioDocumentRow = {
  id: string;
  owner_id: string;
  conversation_id: string | null;
  client_user_id: string | null;
  kind: StudioDocKind;
  doc_number: string;
  status: StudioDocStatus;
  quote_id: string | null;
  invoice_id: string | null;
  installment_no: number | null;
  installment_total: number | null;
  title: string;
  client_name: string | null;
  amount_satang: number;
  wht_satang: number;
  net_satang: number;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  client_marked_paid_at: string | null;
  client_payment_note: string | null;
  responded_at: string | null;
  offer: ChatOfferPayload | null;
  snapshot: BusinessDocument | null;
  created_at: string;
  updated_at: string;
};

export const STUDIO_DOC_KIND_LABEL: Record<StudioDocKind, string> = {
  quotation: "ใบเสนอราคา",
  invoice: "ใบแจ้งหนี้",
  receipt: "ใบเสร็จรับเงิน",
};

export const PAYMENT_METHODS = [
  { id: "bank_transfer", label: "โอนเงินผ่านธนาคาร" },
  { id: "promptpay", label: "พร้อมเพย์" },
  { id: "cash", label: "เงินสด" },
  { id: "cheque", label: "เช็ค" },
  { id: "other", label: "อื่น ๆ" },
] as const;

export function paymentMethodLabel(
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  return PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export function todayBangkok(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isOverdue(
  row: Pick<StudioDocumentRow, "kind" | "status" | "due_date">,
): boolean {
  return (
    row.kind === "invoice" &&
    row.status === "sent" &&
    !!row.due_date &&
    row.due_date < todayBangkok()
  );
}

// ---------------------------------------------------------------------------
// Display status (one vocabulary for chat, side panel and My Studio)
// ---------------------------------------------------------------------------

export type DocDisplayStatus = {
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
};

export function docDisplayStatus(row: StudioDocumentRow): DocDisplayStatus {
  if (row.status === "void") return { label: "ยกเลิกแล้ว", tone: "neutral" };
  if (row.status === "draft") return { label: "ร่าง", tone: "neutral" };
  if (row.kind === "quotation") {
    if (row.status === "accepted")
      return { label: "ลูกค้าตกลงแล้ว", tone: "success" };
    if (row.status === "declined")
      return { label: "ลูกค้าปฏิเสธ", tone: "danger" };
    return { label: "รอลูกค้าตอบ", tone: "info" };
  }
  if (row.kind === "receipt") return { label: "รับเงินแล้ว", tone: "success" };
  if (row.status === "paid") return { label: "ชำระแล้ว", tone: "success" };
  if (row.client_marked_paid_at)
    return { label: "ลูกค้าแจ้งโอนแล้ว", tone: "warning" };
  if (isOverdue(row)) return { label: "เกินกำหนด", tone: "danger" };
  return { label: "รอชำระ", tone: "info" };
}

export const STATUS_TONE_CLASS: Record<DocDisplayStatus["tone"], string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  danger: "bg-red-500/10 text-red-700 dark:text-red-300",
};

// ---------------------------------------------------------------------------
// Installment tracker
// ---------------------------------------------------------------------------

export type InstallmentState =
  | "pending"
  | "invoiced"
  | "client_marked"
  | "overdue"
  | "paid";

export type InstallmentTrack = InstallmentAmounts & {
  state: InstallmentState;
  invoice: StudioDocumentRow | null;
  receipt: StudioDocumentRow | null;
};

/** Per-installment status for a quotation, from the invoices / receipts linked to it. */
export function installmentTracks(
  quote: StudioDocumentRow,
  docs: StudioDocumentRow[],
): InstallmentTrack[] {
  if (!quote.offer) return [];
  const linked = docs.filter(
    (d) => d.quote_id === quote.id && d.status !== "void",
  );
  return offerInstallmentAmounts(quote.offer).map((row) => {
    const invoice =
      linked
        .filter((d) => d.kind === "invoice" && d.installment_no === row.no)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
    const receipt =
      linked.find((d) => d.kind === "receipt" && d.installment_no === row.no) ??
      null;
    let state: InstallmentState = "pending";
    if (receipt || invoice?.status === "paid") state = "paid";
    else if (invoice && invoice.client_marked_paid_at) state = "client_marked";
    else if (invoice && isOverdue(invoice)) state = "overdue";
    else if (invoice) state = "invoiced";
    return { ...row, state, invoice, receipt };
  });
}

export const INSTALLMENT_STATE_LABEL: Record<
  InstallmentState,
  DocDisplayStatus
> = {
  pending: { label: "ยังไม่แจ้งหนี้", tone: "neutral" },
  invoiced: { label: "รอชำระ", tone: "info" },
  client_marked: { label: "ลูกค้าแจ้งโอนแล้ว", tone: "warning" },
  overdue: { label: "เกินกำหนด", tone: "danger" },
  paid: { label: "รับเงินแล้ว", tone: "success" },
};

// ---------------------------------------------------------------------------
// Chat pointer card
// ---------------------------------------------------------------------------

export const STUDIO_DOC_PREFIX = "__SAMECOR_DOC__:";

export type StudioDocChatCard = {
  id: string;
  kind: StudioDocKind;
  number: string;
  title: string;
  /** Amount the client pays / paid (THB). */
  net: number;
  installmentNo?: number | null;
  installmentTotal?: number | null;
  installmentLabel?: string | null;
  dueDate?: string | null;
};

export function encodeStudioDocCard(card: StudioDocChatCard): string {
  const human =
    card.kind === "receipt"
      ? `ออกใบเสร็จ ${card.number} แล้ว`
      : `ส่ง${STUDIO_DOC_KIND_LABEL[card.kind]} ${card.number}`;
  return `${STUDIO_DOC_PREFIX}${JSON.stringify(card)}\n${human}`;
}

export function parseStudioDocCard(
  content: string | null | undefined,
): StudioDocChatCard | null {
  if (!content?.startsWith(STUDIO_DOC_PREFIX)) return null;
  const firstLine = content.slice(STUDIO_DOC_PREFIX.length).split("\n")[0];
  try {
    const raw = JSON.parse(firstLine) as Partial<StudioDocChatCard>;
    if (!raw?.id || !raw.kind || !raw.number) return null;
    if (!["quotation", "invoice", "receipt"].includes(raw.kind)) return null;
    return {
      id: String(raw.id).slice(0, 40),
      kind: raw.kind,
      number: String(raw.number).slice(0, 40),
      title: String(raw.title ?? "").slice(0, 200),
      net: Number(raw.net) || 0,
      installmentNo: raw.installmentNo ?? null,
      installmentTotal: raw.installmentTotal ?? null,
      installmentLabel: raw.installmentLabel
        ? String(raw.installmentLabel).slice(0, 80)
        : null,
      dueDate: raw.dueDate ?? null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Reporting helpers (My Studio)
// ---------------------------------------------------------------------------


export type StudioMoneySummary = {
  outstandingSatang: number;
  overdueSatang: number;
  overdueCount: number;
  receivedThisMonthSatang: number;
  receivedThisYearSatang: number;
  quotesAwaiting: number;
  quotesAwaitingSatang: number;
  clientMarkedCount: number;
};

export function summarizeStudioDocs(
  docs: StudioDocumentRow[],
): StudioMoneySummary {
  const today = todayBangkok();
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const s: StudioMoneySummary = {
    outstandingSatang: 0,
    overdueSatang: 0,
    overdueCount: 0,
    receivedThisMonthSatang: 0,
    receivedThisYearSatang: 0,
    quotesAwaiting: 0,
    quotesAwaitingSatang: 0,
    clientMarkedCount: 0,
  };
  // A receipt settles its invoice even if the follow-up invoice update never landed.
  const receipted = new Set(
    docs
      .filter((d) => d.kind === "receipt" && d.status !== "void" && d.invoice_id)
      .map((d) => d.invoice_id),
  );
  for (const d of docs) {
    if (d.status === "void") continue;
    if (d.kind === "invoice" && d.status === "sent" && !receipted.has(d.id)) {
      s.outstandingSatang += d.net_satang;
      if (isOverdue(d) && !d.client_marked_paid_at) {
        s.overdueSatang += d.net_satang;
        s.overdueCount += 1;
      }
      if (d.client_marked_paid_at) s.clientMarkedCount += 1;
    }
    if (d.kind === "receipt") {
      const paid = (d.paid_at || d.issue_date).slice(0, 10);
      if (paid.slice(0, 7) === month) s.receivedThisMonthSatang += d.net_satang;
      if (paid.slice(0, 4) === year) s.receivedThisYearSatang += d.net_satang;
    }
    if (d.kind === "quotation" && d.status === "sent") {
      s.quotesAwaiting += 1;
      s.quotesAwaitingSatang += d.net_satang;
    }
  }
  return s;
}

function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  // Free text (client name, title) must never run as a spreadsheet formula.
  if (/^[-=+@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV for tax season — UTF-8 BOM so Excel opens Thai correctly. */
export function studioDocsToCsv(docs: StudioDocumentRow[]): string {
  const header = [
    "ประเภท",
    "เลขที่",
    "วันที่",
    "ครบกำหนด",
    "ลูกค้า",
    "งาน",
    "งวด",
    "ยอดก่อนหัก (บาท)",
    "หัก ณ ที่จ่าย (บาท)",
    "ยอดสุทธิ (บาท)",
    "สถานะ",
    "วันที่รับเงิน",
    "วิธีรับเงิน",
  ];
  const rows = docs.map((d) => [
    STUDIO_DOC_KIND_LABEL[d.kind],
    d.doc_number,
    d.issue_date,
    d.due_date ?? "",
    d.client_name ?? "",
    d.title,
    d.installment_no ? `${d.installment_no}/${d.installment_total ?? ""}` : "",
    satangToThb(d.amount_satang).toFixed(2),
    satangToThb(d.wht_satang).toFixed(2),
    satangToThb(d.net_satang).toFixed(2),
    docDisplayStatus(d).label,
    d.paid_at ? d.paid_at.slice(0, 10) : "",
    paymentMethodLabel(d.payment_method) ?? "",
  ]);
  return (
    "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")
  );
}
