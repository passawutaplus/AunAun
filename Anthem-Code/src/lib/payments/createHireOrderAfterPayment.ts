/**
 * Persist hire_orders + business documents after a successful (mock or live) payment.
 * Chat cards alone are not enough for order-detail tracking.
 */
import { sharedDb, supabase } from "@/integrations/supabase/client";
import {
  emptyParty,
  offerWhtAmount,
  type ChatOfferPayload,
  type OfferPartyInfo,
} from "@/lib/chatOffer";
import type { BusinessDocument, DocumentLineItem } from "@/lib/documents/documentPayload";
import {
  buildInvoiceSnapshot,
  buildReceiptSnapshot,
  insertHireDocument,
  type HireOrderDocContext,
} from "@/lib/documents/issueHireDocuments";
import { makeProvisionalDocNumber } from "@/lib/documents/numbering";
import {
  DEFAULT_FEE_CONFIG,
  planInstallmentSatang,
  satangToThb,
  snapshotFees,
  thbToSatang,
} from "@/lib/payments/fees";
import { canClientConfirmHireCharge } from "@/lib/payments/chargeIds";
import type { PaymentMethod } from "@/lib/payments/types";

export type CreateHireOrderAfterPaymentInput = {
  offer: ChatOfferPayload;
  conversationId: string;
  hiringRequestId: string | null | undefined;
  method: PaymentMethod;
  paidAmountSatang: number;
  buyerId: string;
  /** Provider charge id when live; mock id when demo. */
  chargeId?: string | null;
};

export type CreateHireOrderAfterPaymentResult = {
  orderId: string;
  created: boolean;
  isDeposit: boolean;
  depositPercent: number;
  paidAmountSatang: number;
  receiptDocumentId?: string | null;
  receiptDocNumber?: string | null;
};

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

function partyFromOffer(
  side: "issuer" | "client",
  offer: ChatOfferPayload,
): OfferPartyInfo & { email?: string | null } {
  const structured = offer.party?.[side];
  if (structured) return { ...structured, email: structured.email };
  if (side === "client") {
    return {
      ...emptyParty("individual"),
      name: offer.clientName ?? null,
      email: offer.clientEmail ?? null,
      phone: offer.clientPhone ?? null,
      address: offer.clientAddress ?? null,
      taxId: offer.clientTaxId ?? null,
    };
  }
  return {
    ...emptyParty("individual"),
    name: offer.issuerName ?? null,
    email: offer.issuerEmail ?? null,
  };
}

function buildQuotationSnapshot(input: {
  offer: ChatOfferPayload;
  lineItems: DocumentLineItem[];
  issuer: OfferPartyInfo;
  client: OfferPartyInfo;
  whtSatang: number;
}): BusinessDocument {
  const subtotal = input.lineItems.reduce((s, it) => s + Math.round(it.amount * 100), 0);
  return {
    kind: "quotation",
    docNumber: input.offer.number || makeProvisionalDocNumber("quotation"),
    issuedAt: new Date().toISOString(),
    title: input.offer.title || "งานจ้าง Aplus1",
    issuer: input.issuer,
    client: input.client,
    items: input.lineItems,
    currency: "THB",
    subtotalSatang: subtotal,
    whtSatang: input.whtSatang || undefined,
    whtRate: input.whtSatang > 0 ? (input.offer.whtRate ?? 3) : undefined,
    totalSatang: Math.max(0, subtotal - input.whtSatang),
    notes: input.offer.clientNotes?.trim() || undefined,
  };
}

/**
 * Idempotent: if a paid order already exists for this quote, returns it.
 * Best-effort — never throws to the payment UX path.
 */
export async function createHireOrderAfterPayment(
  input: CreateHireOrderAfterPaymentInput,
): Promise<CreateHireOrderAfterPaymentResult | null> {
  try {
    const quoteId = input.offer.quoteId ?? null;

    if (quoteId) {
      const { data: existing } = await sharedDb
        .from("hire_orders" as never)
        .select("id, status, deposit_percent, amount_paid_satang")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const existingRow = existing as {
        id?: string;
        status?: string;
        deposit_percent?: number | null;
        amount_paid_satang?: number | null;
      } | null;
      const existingId = existingRow?.id;
      if (existingId) {
        const { data: receipt } = await sharedDb
          .from("hire_documents" as never)
          .select("id, doc_number")
          .eq("hire_order_id", existingId)
          .eq("kind", "receipt")
          .order("issued_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const rcp = receipt as { id?: string; doc_number?: string } | null;
        const depPct = Math.min(100, Math.max(1, Math.round(Number(existingRow?.deposit_percent) || 100)));
        return {
          orderId: existingId,
          created: false,
          isDeposit: existingRow?.status === "deposit_paid" || depPct < 100,
          depositPercent: depPct,
          paidAmountSatang:
            Number(existingRow?.amount_paid_satang) || input.paidAmountSatang,
          receiptDocumentId: rcp?.id ?? null,
          receiptDocNumber: rcp?.doc_number ?? null,
        };
      }
    }

    let buyerId = input.buyerId;
    let sellerId: string | null = null;
    let hiringRequestId = input.hiringRequestId ?? null;

    if (hiringRequestId) {
      const { data: hr } = await supabase
        .from("hiring_requests")
        .select("id, client_id, freelancer_id")
        .eq("id", hiringRequestId)
        .maybeSingle();
      if (hr) {
        buyerId = (hr.client_id as string) || buyerId;
        sellerId = (hr.freelancer_id as string) || null;
      }
    }

    if (!sellerId) {
      // Fall back: seller is the quote creator
      if (quoteId) {
        const { data: q } = await sharedDb
          .from("hire_quotes" as never)
          .select("created_by, hiring_request_id")
          .eq("id", quoteId)
          .maybeSingle();
        const qr = q as { created_by?: string; hiring_request_id?: string } | null;
        sellerId = qr?.created_by ?? null;
        if (!hiringRequestId && qr?.hiring_request_id) {
          hiringRequestId = qr.hiring_request_id;
        }
      }
    }

    if (!sellerId || !buyerId) return null;

    const jobPriceSatang = thbToSatang(input.offer.amount || 0);
    const whtOn = input.offer.whtEnabled !== false;
    const whtRate = input.offer.whtRate ?? 3;
    const whtSatang = whtOn ? thbToSatang(offerWhtAmount(input.offer.amount || 0, whtRate)) : 0;
    const depositPct = Math.min(100, Math.max(1, Math.round(input.offer.depositPercent ?? 100)));
    const installment = planInstallmentSatang(jobPriceSatang, depositPct, whtSatang);
    const money = snapshotFees(jobPriceSatang, input.method, DEFAULT_FEE_CONFIG, {
      whtSatang,
      chargePercent: depositPct < 100 ? depositPct : 100,
    });

    const isDeposit = depositPct < 100;
    // Client may only create awaiting/draft — paid status is webhook/RPC only.
    const status = "awaiting_payment";
    const now = new Date().toISOString();

    const orderPayload = {
      hiring_request_id: hiringRequestId,
      conversation_id: input.conversationId,
      buyer_id: buyerId,
      seller_id: sellerId,
      status,
      job_price_satang: money.jobPriceSatang,
      buyer_pays_satang: money.buyerPaysSatang,
      seller_net_satang: money.sellerNetSatang,
      platform_fee_percent: money.fee.platformFeePercent,
      platform_fee_satang: money.fee.platformFeeSatang,
      card_surcharge_satang: money.fee.cardSurchargeSatang,
      fee_version: money.fee.feeVersion,
      payment_method: input.method,
      display_currency: input.offer.displayCurrency ?? "THB",
      currency: "THB",
      quote_id: quoteId,
      amount_paid_satang: 0,
      balance_due_satang: isDeposit ? installment.balanceSatang : 0,
      wht_satang: whtSatang,
      deposit_percent: depositPct,
      wht_status: whtSatang > 0 ? "none" : "none",
      paid_at: null as string | null,
      metadata: {
        charge_id: input.chargeId ?? null,
        offer_title: input.offer.title,
        offer_number: input.offer.number ?? null,
      },
    };

    let { data: orderRow, error: orderErr } = await sharedDb
      .from("hire_orders" as never)
      .insert(orderPayload as never)
      .select("id")
      .single();

    // Stale/missing quote row must not block order persistence (detail popup depends on it).
    if ((orderErr || !orderRow) && quoteId) {
      const msg = String(orderErr?.message ?? "");
      if (msg.includes("quote_id") || msg.includes("foreign key") || msg.includes("hire_quotes")) {
        ({ data: orderRow, error: orderErr } = await sharedDb
          .from("hire_orders" as never)
          .insert({ ...orderPayload, quote_id: null } as never)
          .select("id")
          .single());
      }
    }

    if (orderErr || !orderRow) {
      console.warn("[createHireOrderAfterPayment] insert failed", orderErr);
      return null;
    }

    const orderId = (orderRow as { id: string }).id;

    const chargeId = String(input.chargeId ?? "");
    if (canClientConfirmHireCharge(chargeId)) {
      const paidStatus = isDeposit ? "deposit_paid" : "paid_pending";
      const { error: confirmErr } = await sharedDb.rpc(
        "confirm_hire_order_payment" as never,
        {
          _order_id: orderId,
          _charge_id: chargeId,
          _paid_status: paidStatus,
        } as never,
      );
      if (confirmErr) {
        console.warn("[createHireOrderAfterPayment] confirm failed", confirmErr);
      }
    }

    if (quoteId) {
      try {
        await sharedDb
          .from("hire_quotes" as never)
          .update({
            status: "accepted",
            accepted_at: now,
            updated_at: now,
          } as never)
          .eq("id", quoteId);
      } catch {
        /* best-effort */
      }
    }

    const lineItems = lineItemsFromOffer(input.offer);
    const issuer = partyFromOffer("issuer", input.offer);
    const client = partyFromOffer("client", input.offer);
    const ctx: HireOrderDocContext = {
      id: orderId,
      jobPriceSatang: money.jobPriceSatang,
      platformFeeSatang: money.fee.platformFeeSatang,
      platformFeePercent: money.fee.platformFeePercent,
      sellerNetSatang: money.sellerNetSatang,
      whtSatang,
      buyerPaysSatang: money.buyerPaysSatang,
      quoteId,
      paymentMethodLabel: input.method,
    };

    try {
      const qt = buildQuotationSnapshot({
        offer: input.offer,
        lineItems,
        issuer,
        client,
        whtSatang,
      });
      await insertHireDocument(sharedDb, {
        hireOrderId: orderId,
        quoteId,
        kind: "quotation",
        doc: qt,
        createdBy: sellerId,
      });
    } catch {
      /* optional */
    }

    try {
      const inv = buildInvoiceSnapshot({
        order: ctx,
        projectTitle: input.offer.title,
        issuer,
        client,
        lineItems,
        whtRate,
      });
      await insertHireDocument(sharedDb, {
        hireOrderId: orderId,
        quoteId,
        kind: "invoice",
        doc: inv,
        createdBy: sellerId,
      });
    } catch {
      /* optional */
    }

    let receiptDocumentId: string | null = null;
    let receiptDocNumber: string | null = null;
    try {
      const receiptItems: DocumentLineItem[] = isDeposit
        ? [
            {
              id: "deposit",
              name: `มัดจำ ${depositPct}% — ${input.offer.title || "งานจ้าง"}`,
              quantity: 1,
              unitPrice: satangToThb(input.paidAmountSatang),
              amount: satangToThb(input.paidAmountSatang),
            },
          ]
        : lineItems;
      const rcp = buildReceiptSnapshot({
        order: {
          ...ctx,
          // Deposit receipt totals should match the paid installment, not full job.
          jobPriceSatang: isDeposit ? input.paidAmountSatang : ctx.jobPriceSatang,
          buyerPaysSatang: isDeposit ? input.paidAmountSatang : ctx.buyerPaysSatang,
          whtSatang: isDeposit ? 0 : whtSatang,
        },
        projectTitle: isDeposit
          ? `มัดจำ — ${input.offer.title || "งานจ้าง"}`
          : input.offer.title,
        issuer,
        client,
        lineItems: receiptItems,
        amountPaidSatang: input.paidAmountSatang,
        paymentMethodLabel: input.method,
        providerChargeId: input.chargeId ?? null,
      });
      if (isDeposit) {
        rcp.notes = `ใบเสร็จรับเงินมัดจำ ${depositPct}% — ยอดคงเหลือชำระตามเงื่อนไขในใบเสนอราคา`;
      }
      const inserted = await insertHireDocument(sharedDb, {
        hireOrderId: orderId,
        quoteId,
        kind: "receipt",
        doc: rcp,
        createdBy: buyerId,
      });
      receiptDocumentId = inserted?.id ?? null;
      receiptDocNumber = inserted?.docNumber ?? rcp.docNumber ?? null;
    } catch {
      /* optional */
    }

    return {
      orderId,
      created: true,
      isDeposit,
      depositPercent: depositPct,
      paidAmountSatang: input.paidAmountSatang,
      receiptDocumentId,
      receiptDocNumber,
    };
  } catch (e) {
    console.warn("[createHireOrderAfterPayment]", e);
    return null;
  }
}
