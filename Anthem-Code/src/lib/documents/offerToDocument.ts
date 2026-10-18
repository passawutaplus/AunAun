import { BRAND_NAME } from "@/lib/brandConfig";
import {
  emptyParty,
  offerDisplayMilestones,
  offerInstallmentAmounts,
  offerItemsSubtotal,
  offerWhtAmount,
  type ChatOfferPayload,
  type InstallmentAmounts,
  type OfferPartyInfo,
} from "@/lib/chatOffer";
import { thbToSatang } from "@/lib/payments/fees";
import type {
  BusinessDocument,
  DocumentLineItem,
} from "@/lib/documents/documentPayload";

function offerLineItems(offer: ChatOfferPayload): DocumentLineItem[] {
  if (offer.items && offer.items.length > 0) {
    return offer.items.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || 0,
      amount: Math.round((it.quantity || 0) * (it.unitPrice || 0) * 100) / 100,
    }));
  }
  const amount = offer.amount || 0;
  return [
    {
      id: "legacy",
      name: offer.title || "—",
      description: offer.deliverables || undefined,
      quantity: 1,
      unitPrice: amount,
      amount,
    },
  ];
}

function issuerParty(offer: ChatOfferPayload): OfferPartyInfo {
  const p = offer.party?.issuer;
  if (p) return p;
  return {
    ...emptyParty("individual"),
    name: offer.issuerName || BRAND_NAME,
    email: offer.issuerEmail || null,
  };
}

function clientParty(offer: ChatOfferPayload): OfferPartyInfo {
  const p = offer.party?.client;
  if (p) return p;
  return {
    ...emptyParty("individual"),
    name: offer.clientName || null,
    email: offer.clientEmail || null,
    phone: offer.clientPhone || null,
    address: offer.clientAddress || null,
    taxId: offer.clientTaxId || null,
  };
}

function scheduleRows(rows: InstallmentAmounts[], paidNos: number[] = []) {
  return rows.map((r) => ({
    label: r.installment.label,
    percent: r.installment.percent,
    amountSatang: thbToSatang(r.net),
    done: paidNos.includes(r.no),
  }));
}

/** Quotation paper data for an in-chat offer. */
export function offerToQuotationDocument(
  offer: ChatOfferPayload,
  opts: { draft?: boolean; issuedAt?: string } = {},
): BusinessDocument {
  const items = offerLineItems(offer);
  const itemsSubtotal =
    offer.items && offer.items.length > 0
      ? offerItemsSubtotal(offer.items)
      : offer.amount || 0;
  const amount = offer.amount || 0;
  const discount = Math.max(
    0,
    Math.round((itemsSubtotal - amount) * 100) / 100,
  );
  const whtOn = offer.whtApplicable ?? offer.whtEnabled === true;
  const whtRate = offer.whtRate ?? 3;
  const wht = whtOn ? offerWhtAmount(amount, whtRate) : 0;
  const rows = offerInstallmentAmounts(offer);
  const timeline = offerDisplayMilestones(offer).map((m) => ({
    label: m.label,
    date: m.date ?? null,
  }));
  const fxNote =
    offer.displayCurrency &&
    offer.displayCurrency !== "THB" &&
    offer.fxRateSnapshot?.rate
      ? `ราคาอ้างอิงสกุล ${offer.displayCurrency}${offer.fxRateSnapshot.asOf ? ` (อัตรา ${offer.fxRateSnapshot.asOf})` : ""} · ชำระจริงเป็นบาท`
      : null;

  return {
    kind: "quotation",
    docNumber: offer.number || "QT-····",
    issuedAt: opts.issuedAt || new Date().toISOString(),
    title: offer.title,
    issuer: issuerParty(offer),
    client: clientParty(offer),
    items,
    currency: "THB",
    discountSatang: discount > 0 ? thbToSatang(discount) : undefined,
    subtotalSatang: thbToSatang(amount),
    whtSatang: wht > 0 ? thbToSatang(wht) : undefined,
    whtRate,
    totalSatang: thbToSatang(Math.max(0, amount - wht)),
    dueDate: offer.validUntil || null,
    paymentSchedule: rows.length > 1 ? scheduleRows(rows) : null,
    paymentTerms: rows.length > 1 ? null : "ชำระเต็มจำนวน",
    timeline: timeline.length > 0 ? timeline : null,
    notes: offer.clientNotes || null,
    fxNote,
    draft: opts.draft,
  };
}

/** Invoice for one installment of an offer. */
export function offerToInvoiceDocument(
  offer: ChatOfferPayload,
  installmentNo: number,
  opts: {
    docNumber: string;
    issuedAt?: string;
    dueDate?: string | null;
    paidNos?: number[];
    notes?: string | null;
    promptPayId?: string | null;
  },
): BusinessDocument {
  const rows = offerInstallmentAmounts(offer);
  const row = rows[installmentNo - 1] ?? rows[0];
  const total = rows.length;
  const whtRate = offer.whtRate ?? 3;
  // One payment lists the quote's own lines, so it carries the quote's discount too.
  const discount =
    total === 1 && offer.items && offer.items.length > 0
      ? Math.max(0, Math.round((offerItemsSubtotal(offer.items) - row.gross) * 100) / 100)
      : 0;
  return {
    kind: "invoice",
    docNumber: opts.docNumber,
    issuedAt: opts.issuedAt || new Date().toISOString(),
    title: offer.title,
    issuer: issuerParty(offer),
    client: clientParty(offer),
    items:
      total > 1
        ? [
            {
              id: `inst-${row.no}`,
              name: `งวดที่ ${row.no}/${total} · ${row.installment.label}`,
              description: `${row.installment.percent}% ของมูลค่างาน${offer.number ? ` ตามใบเสนอราคา ${offer.number}` : ""}`,
              quantity: 1,
              unitPrice: row.gross,
              amount: row.gross,
            },
          ]
        : offerLineItems(offer),
    currency: "THB",
    discountSatang: discount > 0 ? thbToSatang(discount) : undefined,
    subtotalSatang: thbToSatang(row.gross),
    whtSatang: row.wht > 0 ? thbToSatang(row.wht) : undefined,
    whtRate,
    totalSatang: thbToSatang(row.net),
    dueDate: opts.dueDate || null,
    installment:
      total > 1
        ? {
            no: row.no,
            total,
            label: row.installment.label,
            percent: row.installment.percent,
          }
        : null,
    paymentSchedule: total > 1 ? scheduleRows(rows, opts.paidNos) : null,
    referenceDocNumber: offer.number || null,
    notes: opts.notes ?? null,
    promptPayId: opts.promptPayId || null,
  };
}

/** Receipt for a paid installment. */
export function offerToReceiptDocument(
  offer: ChatOfferPayload,
  installmentNo: number,
  opts: {
    docNumber: string;
    invoiceNumber?: string | null;
    paidAt?: string;
    paymentMethodLabel?: string | null;
    paidNos?: number[];
  },
): BusinessDocument {
  const invoice = offerToInvoiceDocument(offer, installmentNo, {
    docNumber: opts.docNumber,
    issuedAt: opts.paidAt,
    paidNos: opts.paidNos,
  });
  return {
    ...invoice,
    kind: "receipt",
    dueDate: null,
    amountPaidSatang: invoice.totalSatang,
    promptPayId: null,
    paymentMethodLabel: opts.paymentMethodLabel || null,
    referenceDocNumber: opts.invoiceNumber || offer.number || null,
  };
}
