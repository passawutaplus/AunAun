import type { HireDocumentKind } from "@/lib/payments/types";
import type { OfferPartyInfo } from "@/lib/chatOffer";

export type DocumentLineItem = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type BusinessDocument = {
  kind: HireDocumentKind;
  docNumber: string;
  issuedAt: string;
  title: string;
  issuer: OfferPartyInfo & { email?: string | null };
  client: OfferPartyInfo & { email?: string | null };
  items: DocumentLineItem[];
  currency: "THB";
  subtotalSatang: number;
  whtSatang?: number;
  whtRate?: number;
  vatSatang?: number;
  vatRate?: number;
  totalSatang: number;
  /** Amount paid on this document (receipt installment). */
  amountPaidSatang?: number;
  paymentMethodLabel?: string | null;
  providerChargeId?: string | null;
  paymentTerms?: string | null;
  depositPercent?: number | null;
  referenceDocNumber?: string | null;
  notes?: string | null;
  /** Platform fee receipt: fee amount only. */
  platformFeePercent?: number | null;
  vatRegisteredIssuer?: boolean;
  /** Discount taken off the item subtotal (shown between subtotal and WHT). */
  discountSatang?: number;
  /** YYYY-MM-DD — invoice due date / quotation valid-until. */
  dueDate?: string | null;
  /** This document covers one installment of a payment plan. */
  installment?: {
    no: number;
    total: number;
    label: string;
    percent: number;
  } | null;
  /** Full payment plan printed under the totals (quotation / invoice). */
  paymentSchedule?:
    | { label: string; percent: number; amountSatang: number; done?: boolean }[]
    | null;
  /** Unsent draft — paper shows a "ร่าง" watermark. */
  draft?: boolean;
  /** Work steps printed on quotations. */
  timeline?: { label: string; date: string | null }[] | null;
  /** e.g. "แสดง USD อัตราอ้างอิง — ชำระจริงเป็นบาท". */
  fxNote?: string | null;
  /** Issuer's own PromptPay (phone / national id) — invoice shows a pay-by-QR block. */
  promptPayId?: string | null;
};

export function lineItemsFromOffer(
  items: {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }[],
): DocumentLineItem[] {
  return items.map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    amount: Math.round((it.quantity || 0) * (it.unitPrice || 0)),
  }));
}
