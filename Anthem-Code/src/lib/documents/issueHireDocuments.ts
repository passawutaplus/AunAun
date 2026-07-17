import type { SupabaseClient } from "@supabase/supabase-js";
import type { OfferPartyInfo } from "@/lib/chatOffer";
import type { BusinessDocument, DocumentLineItem } from "@/lib/documents/documentPayload";
import { makeProvisionalDocNumber } from "@/lib/documents/numbering";
import { LEGAL_COMPANY_NAME } from "@/lib/legalConfig";
import type { HireDocumentKind } from "@/lib/payments/types";

export type HireOrderDocContext = {
  id: string;
  jobPriceSatang: number;
  platformFeeSatang: number;
  platformFeePercent: number;
  sellerNetSatang: number;
  whtSatang?: number;
  buyerPaysSatang?: number;
  quoteId?: string | null;
  paymentMethodLabel?: string | null;
};

function feeLineItems(feeSatang: number): DocumentLineItem[] {
  return [
    {
      id: "platform-fee",
      name: "ค่าธรรมเนียมแพลตฟอร์ม Aplus1",
      description: "บริการตัวกลางรับชำระและคุ้มครองธุรกรรม",
      quantity: 1,
      unitPrice: feeSatang / 100,
      amount: feeSatang / 100,
    },
  ];
}

export function buildPlatformFeeReceiptSnapshot(input: {
  order: HireOrderDocContext;
  projectTitle: string;
  buyer: OfferPartyInfo & { email?: string | null };
  docNumber?: string;
  issuedAt?: string;
  referenceDocNumber?: string | null;
}): BusinessDocument {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const docNumber = input.docNumber ?? makeProvisionalDocNumber("platform_fee_receipt");
  return {
    kind: "platform_fee_receipt",
    docNumber,
    issuedAt,
    title: input.projectTitle || "งานจ้าง Aplus1",
    issuer: {
      type: "corporate",
      name: LEGAL_COMPANY_NAME,
      companyName: LEGAL_COMPANY_NAME,
    },
    client: input.buyer,
    items: feeLineItems(input.order.platformFeeSatang),
    currency: "THB",
    subtotalSatang: input.order.platformFeeSatang,
    totalSatang: input.order.platformFeeSatang,
    platformFeePercent: input.order.platformFeePercent,
    paymentMethodLabel: input.order.paymentMethodLabel ?? null,
    referenceDocNumber: input.referenceDocNumber ?? null,
    notes: "ใบเสร็จค่าธรรมเนียมแพลตฟอร์ม — แยกจากค่าจ้างงานของผู้รับงาน",
  };
}

export function buildInvoiceSnapshot(input: {
  order: HireOrderDocContext;
  projectTitle: string;
  issuer: OfferPartyInfo & { email?: string | null };
  client: OfferPartyInfo & { email?: string | null };
  lineItems: DocumentLineItem[];
  docNumber?: string;
  issuedAt?: string;
  whtRate?: number;
}): BusinessDocument {
  const subtotal = input.lineItems.reduce((s, it) => s + Math.round(it.amount * 100), 0);
  const whtSatang = input.order.whtSatang ?? 0;
  const total = Math.max(0, subtotal - whtSatang);
  return {
    kind: "invoice",
    docNumber: input.docNumber ?? makeProvisionalDocNumber("invoice"),
    issuedAt: input.issuedAt ?? new Date().toISOString(),
    title: input.projectTitle || "งานจ้าง Aplus1",
    issuer: input.issuer,
    client: input.client,
    items: input.lineItems,
    currency: "THB",
    subtotalSatang: subtotal,
    whtSatang: whtSatang || undefined,
    whtRate: input.whtRate ?? (whtSatang > 0 ? 3 : undefined),
    totalSatang: total,
  };
}

export function buildReceiptSnapshot(input: {
  order: HireOrderDocContext;
  projectTitle: string;
  issuer: OfferPartyInfo & { email?: string | null };
  client: OfferPartyInfo & { email?: string | null };
  lineItems: DocumentLineItem[];
  amountPaidSatang: number;
  docNumber?: string;
  issuedAt?: string;
  paymentMethodLabel?: string | null;
  providerChargeId?: string | null;
}): BusinessDocument {
  const subtotal = input.lineItems.reduce((s, it) => s + Math.round(it.amount * 100), 0);
  const whtSatang = input.order.whtSatang ?? 0;
  return {
    kind: "receipt",
    docNumber: input.docNumber ?? makeProvisionalDocNumber("receipt"),
    issuedAt: input.issuedAt ?? new Date().toISOString(),
    title: input.projectTitle || "งานจ้าง Aplus1",
    issuer: input.issuer,
    client: input.client,
    items: input.lineItems,
    currency: "THB",
    subtotalSatang: subtotal,
    whtSatang: whtSatang || undefined,
    totalSatang: Math.max(0, subtotal - whtSatang),
    amountPaidSatang: input.amountPaidSatang,
    paymentMethodLabel: input.paymentMethodLabel ?? null,
    providerChargeId: input.providerChargeId ?? null,
  };
}

export async function insertHireDocument(
  db: SupabaseClient,
  input: {
    hireOrderId: string;
    quoteId?: string | null;
    kind: HireDocumentKind;
    doc: BusinessDocument;
    createdBy?: string | null;
    fileUrl?: string | null;
  },
): Promise<{ id: string; docNumber: string } | null> {
  const { data, error } = await db
    .from("hire_documents" as never)
    .insert({
      hire_order_id: input.hireOrderId,
      quote_id: input.quoteId ?? null,
      kind: input.kind,
      doc_number: input.doc.docNumber,
      snapshot: input.doc as unknown as Record<string, unknown>,
      file_url: input.fileUrl ?? null,
      issued_at: input.doc.issuedAt,
      created_by: input.createdBy ?? null,
    } as never)
    .select("id, doc_number")
    .single();

  if (error) throw error;
  const row = data as { id: string; doc_number: string };
  return { id: row.id, docNumber: row.doc_number };
}

/** Best-effort platform fee receipt after client approves work. */
export async function issuePlatformFeeReceiptForOrder(input: {
  db: SupabaseClient;
  order: HireOrderDocContext;
  projectTitle: string;
  buyer: OfferPartyInfo & { email?: string | null };
  createdBy?: string | null;
}): Promise<string | null> {
  const doc = buildPlatformFeeReceiptSnapshot({
    order: input.order,
    projectTitle: input.projectTitle,
    buyer: input.buyer,
  });
  const row = await insertHireDocument(input.db, {
    hireOrderId: input.order.id,
    quoteId: input.order.quoteId ?? null,
    kind: "platform_fee_receipt",
    doc,
    createdBy: input.createdBy ?? null,
  });
  return row?.docNumber ?? null;
}
