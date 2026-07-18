/** Structured “เริ่มทำงาน” card posted after hire payment succeeds. */

import type { ChatOfferLineItem, ChatOfferMilestone, ChatOfferPayload } from "@/lib/chatOffer";

export const HIRE_WORK_START_PREFIX = "__APLUS1_HIRE_WORK_START__:";

export type HireWorkStartItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type HireWorkStartChatPayload = {
  v: 1;
  kind: "hire_work_start";
  offerTitle: string;
  offerAmountThb: number;
  items: HireWorkStartItem[];
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  milestones: ChatOfferMilestone[];
  showFullTimeline: boolean;
  quoteId?: string | null;
  /** Persisted hire_orders.id when available — scopes order-detail popup. */
  orderId?: string | null;
};

function clampStr(v: unknown, max: number): string {
  return String(v ?? "").slice(0, max);
}

export function buildHireWorkStartPayload(
  offer: ChatOfferPayload,
  opts?: { orderId?: string | null },
): HireWorkStartChatPayload {
  const items: HireWorkStartItem[] = (offer.items ?? [])
    .filter((it) => it.name?.trim())
    .slice(0, 20)
    .map((it: ChatOfferLineItem) => ({
      name: clampStr(it.name, 120),
      quantity: Math.max(0, Number(it.quantity) || 0),
      unitPrice: Math.max(0, Math.round(Number(it.unitPrice) || 0)),
    }));

  const milestones = (offer.milestones ?? []).slice(0, 12).map((m) => ({
    id: clampStr(m.id, 40),
    label: clampStr(m.label, 80),
    date: m.date ? clampStr(m.date, 32) : null,
  }));

  return {
    v: 1,
    kind: "hire_work_start",
    offerTitle: clampStr(offer.title || "งานจ้าง", 120),
    offerAmountThb: Math.max(0, Math.round(offer.amount || 0)),
    items,
    startDate: offer.startDate ?? null,
    endDate: offer.endDate ?? null,
    dueDate: offer.dueDate ?? null,
    milestones,
    showFullTimeline: offer.showFullTimeline !== false,
    quoteId: offer.quoteId ?? null,
    orderId: opts?.orderId ?? null,
  };
}

export function encodeHireWorkStartMessage(payload: HireWorkStartChatPayload): string {
  return `${HIRE_WORK_START_PREFIX}${JSON.stringify(payload)}`;
}

export function parseHireWorkStartMessage(
  content: string | null | undefined,
): HireWorkStartChatPayload | null {
  if (!content?.includes(HIRE_WORK_START_PREFIX)) return null;
  const idx = content.indexOf(HIRE_WORK_START_PREFIX);
  const raw = content.slice(idx + HIRE_WORK_START_PREFIX.length).replace(/^[\s:\u200b\uFEFF]*/, "");
  try {
    const parsed = JSON.parse(raw) as HireWorkStartChatPayload;
    if (!parsed?.offerTitle) return null;
    return {
      v: 1,
      kind: "hire_work_start",
      offerTitle: clampStr(parsed.offerTitle, 120),
      offerAmountThb: Math.max(0, Math.round(Number(parsed.offerAmountThb) || 0)),
      items: Array.isArray(parsed.items)
        ? parsed.items.slice(0, 20).map((it) => ({
            name: clampStr(it?.name || "รายการ", 120),
            quantity: Math.max(0, Number(it?.quantity) || 0),
            unitPrice: Math.max(0, Math.round(Number(it?.unitPrice) || 0)),
          }))
        : [],
      startDate: parsed.startDate ? clampStr(parsed.startDate, 32) : null,
      endDate: parsed.endDate ? clampStr(parsed.endDate, 32) : null,
      dueDate: parsed.dueDate ? clampStr(parsed.dueDate, 32) : null,
      milestones: Array.isArray(parsed.milestones)
        ? parsed.milestones.slice(0, 12).map((m, i) => ({
            id: clampStr(m?.id || `m-${i}`, 40),
            label: clampStr(m?.label || "งวด", 80),
            date: m?.date ? clampStr(m.date, 32) : null,
          }))
        : [],
      showFullTimeline: parsed.showFullTimeline !== false,
      quoteId: parsed.quoteId ?? null,
      orderId: parsed.orderId ?? null,
    };
  } catch {
    return null;
  }
}

export function isHireWorkStartMessage(content: string | null | undefined): boolean {
  return !!content && content.includes(HIRE_WORK_START_PREFIX);
}

/** Plain accept-offer chat text from older flow — hide in favor of paid/work cards. */
export function isPlainOfferAcceptMessage(content: string | null | undefined): boolean {
  if (!content) return false;
  const t = content.trim();
  return /^ยอมรับข้อเสนอ\s*«/.test(t) && t.includes("ลุยต่อได้เลย");
}
