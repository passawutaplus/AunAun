/**
 * Mock accounting pack for hire order detail — used when hire_orders / docs
 * are not persisted yet (demo / race) so the UI still shows a complete Thai
 * document set: quotation → invoice → deposit receipt.
 */
import {
  emptyParty,
  offerDepositAmount,
  offerWhtAmount,
  type ChatOfferPayload,
  type OfferPartyInfo,
} from "@/lib/chatOffer";
import type { BusinessDocument, DocumentLineItem } from "@/lib/documents/documentPayload";
import {
  buildInvoiceSnapshot,
  buildReceiptSnapshot,
  type HireOrderDocContext,
} from "@/lib/documents/issueHireDocuments";
import { makeProvisionalDocNumber } from "@/lib/documents/numbering";
import { thbToSatang } from "@/lib/payments/fees";
import type { HireDocumentKind } from "@/lib/payments/types";

export type HireMockDocumentRow = {
  id: string;
  hire_order_id: string;
  quote_id: string | null;
  kind: HireDocumentKind;
  doc_number: string;
  snapshot: BusinessDocument;
  file_url: string | null;
  issued_at: string;
};

export type HireAccountingPaymentMock = {
  statusLabel: string;
  statusClassName: string;
  orderStatusLabel: string;
  jobPriceThb: number;
  depositPercent: number;
  paidThb: number;
  balanceThb: number;
  methodLabel: string;
  paidAtLabel: string;
  isDeposit: boolean;
  quoteNumber: string;
  orderCode: string;
};

export type HireAccountingMockup = {
  payment: HireAccountingPaymentMock;
  documents: HireMockDocumentRow[];
  isMock: true;
};

function partyFromOffer(
  side: "issuer" | "client",
  offer: ChatOfferPayload,
  fallbackName?: string | null,
): OfferPartyInfo & { email?: string | null } {
  const structured = offer.party?.[side];
  if (structured) return { ...structured, email: structured.email };
  if (side === "client") {
    return {
      ...emptyParty("individual"),
      name: offer.clientName || fallbackName || "ผู้จ้าง",
      email: offer.clientEmail ?? null,
      phone: offer.clientPhone ?? null,
      address: offer.clientAddress ?? null,
      taxId: offer.clientTaxId ?? null,
    };
  }
  return {
    ...emptyParty("individual"),
    name: offer.issuerName || fallbackName || "ผู้รับงาน",
    email: offer.issuerEmail ?? null,
  };
}

function lineItemsFromOffer(offer: ChatOfferPayload): DocumentLineItem[] {
  if (offer.items?.length) {
    return offer.items
      .filter((it) => it.name?.trim())
      .map((it, i) => {
        const qty = Math.max(1, Number(it.quantity) || 1);
        const unit = Math.max(0, Number(it.unitPrice) || 0);
        return {
          id: it.id || `item-${i}`,
          name: it.name.trim(),
          description: it.description?.trim() || undefined,
          quantity: qty,
          unitPrice: unit,
          amount: qty * unit,
        };
      });
  }
  return [
    {
      id: "job",
      name: offer.title || "งานจ้าง",
      quantity: 1,
      unitPrice: offer.amount || 0,
      amount: offer.amount || 0,
    },
  ];
}

function mockDocRow(
  kind: HireMockDocumentRow["kind"],
  doc: BusinessDocument,
  orderId: string,
  quoteId: string | null,
): HireMockDocumentRow {
  return {
    id: `mock-${kind}-${orderId.slice(0, 8)}`,
    hire_order_id: orderId,
    quote_id: quoteId,
    kind,
    doc_number: doc.docNumber,
    snapshot: doc,
    file_url: null,
    issued_at: doc.issuedAt,
  };
}

const METHOD_TH: Record<string, string> = {
  promptpay: "พร้อมเพย์ (QR)",
  card: "บัตรเครดิต / เดบิต",
  bank_transfer: "โอนผ่านบัญชีธนาคาร",
};

/**
 * Build a complete mock accounting pack from the latest chat offer + paid amount.
 * Intended for UI preview until live hire_orders / hire_documents exist.
 */
export function buildHireAccountingMockup(input: {
  offer: ChatOfferPayload;
  /** Amount already paid in THB (deposit or full). */
  paidAmountThb: number;
  orderCodeSeed?: string | null;
  partnerName?: string | null;
  clientName?: string | null;
  paymentMethod?: string | null;
  paidAt?: string | null;
}): HireAccountingMockup {
  const offer = input.offer;
  const jobThb = Math.max(0, Math.round(offer.amount || 0));
  const depositPct = Math.min(100, Math.max(1, Math.round(offer.depositPercent ?? 50)));
  const isDeposit = depositPct < 100;
  const expectedDeposit = isDeposit
    ? offerDepositAmount(jobThb, depositPct)
    : jobThb;
  const paidThb =
    input.paidAmountThb > 0
      ? Math.round(input.paidAmountThb)
      : Math.round(expectedDeposit);
  const balanceThb = Math.max(0, jobThb - paidThb);
  const now = input.paidAt || new Date().toISOString();
  const seed = (input.orderCodeSeed || "MOCKORD1").replace(/-/g, "").slice(0, 8).toUpperCase();
  const orderId = `00000000-0000-4000-8000-${seed.padEnd(12, "0").slice(0, 12).toLowerCase()}`;

  const quoteNumber = offer.number || makeProvisionalDocNumber("quotation");
  const issuer = partyFromOffer("issuer", offer, input.partnerName);
  const client = partyFromOffer("client", offer, input.clientName);
  const lineItems = lineItemsFromOffer(offer);
  const whtOn = offer.whtEnabled !== false && offer.whtApplicable !== false;
  const whtRate = offer.whtRate ?? 3;
  const whtSatang = whtOn ? thbToSatang(offerWhtAmount(jobThb, whtRate)) : 0;
  const jobSatang = thbToSatang(jobThb);
  const paidSatang = thbToSatang(paidThb);

  const ctx: HireOrderDocContext = {
    id: orderId,
    jobPriceSatang: jobSatang,
    platformFeeSatang: Math.round(jobSatang * 0.1),
    platformFeePercent: 10,
    sellerNetSatang: Math.max(0, jobSatang - Math.round(jobSatang * 0.1) - whtSatang),
    whtSatang,
    buyerPaysSatang: paidSatang,
    quoteId: offer.quoteId ?? null,
    paymentMethodLabel: input.paymentMethod ?? "promptpay",
  };

  const quotation: BusinessDocument = {
    kind: "quotation",
    docNumber: quoteNumber,
    issuedAt: now,
    title: offer.title || "งานจ้าง Aplus1",
    issuer,
    client,
    items: lineItems,
    currency: "THB",
    subtotalSatang: jobSatang,
    whtSatang: whtSatang || undefined,
    whtRate: whtSatang > 0 ? whtRate : undefined,
    totalSatang: Math.max(0, jobSatang - whtSatang),
    depositPercent: isDeposit ? depositPct : 100,
    paymentTerms: isDeposit
      ? `มัดจำ ${depositPct}% ก่อนเริ่มงาน · คงเหลือชำระตามเงื่อนไข`
      : "ชำระเต็มจำนวน",
    notes: "เอกสารตัวอย่าง (mock) — สำหรับตรวจสอบความครบของชุดเอกสารบัญชี",
  };

  const invoice = buildInvoiceSnapshot({
    order: ctx,
    projectTitle: offer.title || "งานจ้าง Aplus1",
    issuer,
    client,
    lineItems,
    whtRate,
    docNumber: makeProvisionalDocNumber("invoice"),
    issuedAt: now,
  });
  invoice.notes = isDeposit
    ? `ใบแจ้งหนี้ทั้งสัญญา · งวดนี้เรียกเก็บมัดจำ ${depositPct}%`
    : "ใบแจ้งหนี้ทั้งสัญญา";
  invoice.depositPercent = isDeposit ? depositPct : 100;
  invoice.referenceDocNumber = quoteNumber;

  const depositItems: DocumentLineItem[] = isDeposit
    ? [
        {
          id: "deposit",
          name: `มัดจำ ${depositPct}% — ${offer.title || "งานจ้าง"}`,
          description: "ใบเสร็จรับเงินมัดจำตามใบเสนอราคา",
          quantity: 1,
          unitPrice: paidThb,
          amount: paidThb,
        },
      ]
    : lineItems;

  const receipt = buildReceiptSnapshot({
    order: {
      ...ctx,
      jobPriceSatang: isDeposit ? paidSatang : jobSatang,
      buyerPaysSatang: paidSatang,
      whtSatang: isDeposit ? 0 : whtSatang,
    },
    projectTitle: isDeposit
      ? `มัดจำ — ${offer.title || "งานจ้าง"}`
      : offer.title || "งานจ้าง Aplus1",
    issuer,
    client,
    lineItems: depositItems,
    amountPaidSatang: paidSatang,
    docNumber: makeProvisionalDocNumber("receipt"),
    issuedAt: now,
    paymentMethodLabel: input.paymentMethod ?? "promptpay",
    providerChargeId: `mock_chrg_${seed.toLowerCase()}`,
  });
  receipt.referenceDocNumber = invoice.docNumber;
  receipt.notes = isDeposit
    ? `ใบเสร็จรับเงินมัดจำ ${depositPct}% · ยอดคงเหลือ ${balanceThb.toLocaleString("th-TH")} บาท ชำระตามเงื่อนไขในใบเสนอราคา (เอกสารตัวอย่าง)`
    : "ใบเสร็จรับเงินเต็มจำนวน (เอกสารตัวอย่าง)";

  const paidAtLabel = (() => {
    try {
      return new Date(now).toLocaleString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return now.slice(0, 16);
    }
  })();

  return {
    isMock: true,
    payment: {
      statusLabel: isDeposit
        ? `ชำระมัดจำแล้ว (${depositPct}%) · ${paidThb.toLocaleString("th-TH")} บาท`
        : `ชำระเงินแล้ว · ${paidThb.toLocaleString("th-TH")} บาท`,
      statusClassName: "text-emerald-600 dark:text-emerald-400",
      orderStatusLabel: isDeposit ? "ชำระมัดจำแล้ว" : "ชำระแล้ว รอส่งงาน",
      jobPriceThb: jobThb,
      depositPercent: depositPct,
      paidThb,
      balanceThb,
      methodLabel: METHOD_TH[input.paymentMethod || "promptpay"] || "พร้อมเพย์ (QR)",
      paidAtLabel,
      isDeposit,
      quoteNumber,
      orderCode: seed,
    },
    documents: [
      mockDocRow("quotation", quotation, orderId, offer.quoteId ?? null),
      mockDocRow("invoice", invoice, orderId, offer.quoteId ?? null),
      mockDocRow("receipt", receipt, orderId, offer.quoteId ?? null),
    ],
  };
}
