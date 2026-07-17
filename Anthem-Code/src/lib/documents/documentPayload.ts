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
};

export function lineItemsFromOffer(items: {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}[]): DocumentLineItem[] {
  return items.map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    amount: Math.round((it.quantity || 0) * (it.unitPrice || 0)),
  }));
}
