/** Structured hire receipt card in chat (deposit / payment receipt). */

export const HIRE_RECEIPT_PREFIX = "__APLUS1_HIRE_RECEIPT__:";

export type HireReceiptChatPayload = {
  v: 1;
  kind: "hire_receipt";
  offerTitle: string;
  /** Full job amount in THB */
  offerAmountThb: number;
  /** Amount covered by this receipt (deposit or full) in THB */
  paidAmountThb: number;
  isDeposit: boolean;
  depositPercent?: number | null;
  docNumber?: string | null;
  documentId?: string | null;
  orderId?: string | null;
  quoteId?: string | null;
  paymentMethod?: string | null;
};

function clampStr(v: unknown, max: number): string {
  return String(v ?? "").slice(0, max);
}

export function encodeHireReceiptMessage(payload: HireReceiptChatPayload): string {
  return `${HIRE_RECEIPT_PREFIX}${JSON.stringify({
    v: 1,
    kind: "hire_receipt",
    offerTitle: clampStr(payload.offerTitle || "งานจ้าง", 120),
    offerAmountThb: Math.max(0, Math.round(payload.offerAmountThb || 0)),
    paidAmountThb: Math.max(0, Math.round(payload.paidAmountThb || 0)),
    isDeposit: !!payload.isDeposit,
    depositPercent:
      payload.depositPercent != null
        ? Math.min(100, Math.max(1, Math.round(payload.depositPercent)))
        : null,
    docNumber: payload.docNumber ? clampStr(payload.docNumber, 40) : null,
    documentId: payload.documentId ?? null,
    orderId: payload.orderId ?? null,
    quoteId: payload.quoteId ?? null,
    paymentMethod: payload.paymentMethod ? clampStr(payload.paymentMethod, 40) : null,
  })}`;
}

export function parseHireReceiptMessage(
  content: string | null | undefined,
): HireReceiptChatPayload | null {
  if (!content?.includes(HIRE_RECEIPT_PREFIX)) return null;
  const idx = content.indexOf(HIRE_RECEIPT_PREFIX);
  const raw = content.slice(idx + HIRE_RECEIPT_PREFIX.length).replace(/^[\s:\u200b\uFEFF]*/, "");
  try {
    const parsed = JSON.parse(raw) as HireReceiptChatPayload;
    if (!parsed?.offerTitle) return null;
    return {
      v: 1,
      kind: "hire_receipt",
      offerTitle: clampStr(parsed.offerTitle, 120),
      offerAmountThb: Math.max(0, Math.round(Number(parsed.offerAmountThb) || 0)),
      paidAmountThb: Math.max(0, Math.round(Number(parsed.paidAmountThb) || 0)),
      isDeposit: !!parsed.isDeposit,
      depositPercent:
        parsed.depositPercent != null
          ? Math.min(100, Math.max(1, Math.round(Number(parsed.depositPercent) || 0)))
          : null,
      docNumber: parsed.docNumber ? clampStr(parsed.docNumber, 40) : null,
      documentId: parsed.documentId ?? null,
      orderId: parsed.orderId ?? null,
      quoteId: parsed.quoteId ?? null,
      paymentMethod: parsed.paymentMethod ? clampStr(parsed.paymentMethod, 40) : null,
    };
  } catch {
    return null;
  }
}

export function isHireReceiptMessage(content: string | null | undefined): boolean {
  return !!content && content.includes(HIRE_RECEIPT_PREFIX);
}
