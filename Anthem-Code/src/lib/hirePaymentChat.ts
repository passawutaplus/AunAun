/** Structured hire payment-success card in chat (accept + escrow notice). */

export const HIRE_PAID_PREFIX = "__APLUS1_HIRE_PAID__:";

export type HirePaidChatPayload = {
  v: 1;
  kind: "hire_paid";
  offerTitle: string;
  /** Full quote / job amount in THB */
  offerAmountThb: number;
  /** Amount paid this installment (deposit or full) in THB */
  paidAmountThb: number;
  quoteId?: string | null;
  /** Persisted hire_orders.id when available — scopes order-detail popup. */
  orderId?: string | null;
};

export function encodeHirePaidMessage(payload: HirePaidChatPayload): string {
  return `${HIRE_PAID_PREFIX}${JSON.stringify({
    v: 1,
    kind: "hire_paid",
    offerTitle: String(payload.offerTitle || "ข้อเสนอ").slice(0, 120),
    offerAmountThb: Math.max(0, Math.round(payload.offerAmountThb || 0)),
    paidAmountThb: Math.max(0, Math.round(payload.paidAmountThb || 0)),
    quoteId: payload.quoteId ?? null,
    orderId: payload.orderId ?? null,
  })}`;
}

export function parseHirePaidMessage(content: string | null | undefined): HirePaidChatPayload | null {
  if (!content?.includes(HIRE_PAID_PREFIX)) return null;
  const idx = content.indexOf(HIRE_PAID_PREFIX);
  const raw = content.slice(idx + HIRE_PAID_PREFIX.length).replace(/^[\s:\u200b\uFEFF]*/, "");
  try {
    const parsed = JSON.parse(raw) as HirePaidChatPayload;
    if (!parsed?.offerTitle) return null;
    return {
      v: 1,
      kind: "hire_paid",
      offerTitle: String(parsed.offerTitle).slice(0, 120),
      offerAmountThb: Math.max(0, Math.round(Number(parsed.offerAmountThb) || 0)),
      paidAmountThb: Math.max(0, Math.round(Number(parsed.paidAmountThb) || 0)),
      quoteId: parsed.quoteId ?? null,
      orderId: parsed.orderId ?? null,
    };
  } catch {
    return null;
  }
}

export function isHirePaidMessage(content: string | null | undefined): boolean {
  return !!content && content.includes(HIRE_PAID_PREFIX);
}

/** Legacy plain-text payment success (pre-card). */
export function parseLegacyHirePaidText(content: string | null | undefined): HirePaidChatPayload | null {
  if (!content) return null;
  const m = content.match(
    /^ชำระเงิน\s*฿?([\d,]+(?:\.\d+)?)\s*สำเร็จแล้ว\s*—\s*Aplus1\s*พักเงิน/,
  );
  if (!m) return null;
  const paid = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(paid)) return null;
  return {
    v: 1,
    kind: "hire_paid",
    offerTitle: "ข้อเสนอ",
    offerAmountThb: paid,
    paidAmountThb: paid,
    quoteId: null,
  };
}
