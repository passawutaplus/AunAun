/** Lightweight chat offer — Solo-inspired quotation payload in message content. */

export const CHAT_OFFER_PREFIX = "__APLUS1_OFFER__:";

export type ChatOfferMilestone = {
  id: string;
  label: string;
  date?: string | null;
};

/** FlowAccount-style line item on the quotation. */
export type ChatOfferLineItem = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
};

export type ChatOfferPayload = {
  v: 1 | 2 | 3;
  title: string;
  amount: number;
  currency: "THB";
  /** Summary of line items (backward compat / chat card). */
  deliverables: string;
  items?: ChatOfferLineItem[];
  /** @deprecated use endDate — kept for older messages */
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  number?: string;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  clientTaxId?: string | null;
  issuerName?: string | null;
  issuerEmail?: string | null;
  /** Deposit % — presets 50 | 100, or custom 1–100 */
  depositPercent?: number;
  depositDueDate?: string | null;
  paymentTerms?: string | null;
  whtEnabled?: boolean;
  whtRate?: number;
  milestones?: ChatOfferMilestone[];
  /** Shown on the quotation for the client. */
  clientNotes?: string | null;
  /** Freelancer-only note — do not render on the paper preview. */
  internalNotes?: string | null;
};

export type ChatOfferTimelineEvent = {
  date: string;
  label: string;
  type: "deposit" | "start" | "milestone" | "end";
};

export const DEPOSIT_PRESETS = [50, 100] as const;

export function isChatOfferContent(content: string | null | undefined): boolean {
  return !!content?.startsWith(CHAT_OFFER_PREFIX);
}

export function encodeChatOffer(payload: ChatOfferPayload): string {
  return `${CHAT_OFFER_PREFIX}${JSON.stringify(payload)}`;
}

function clampStr(v: unknown, max: number): string {
  return String(v ?? "").slice(0, max);
}

function clampDate(v: unknown): string | null {
  if (!v) return null;
  return String(v).slice(0, 32);
}

export function emptyOfferItem(): ChatOfferLineItem {
  return {
    id: `li-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
  };
}

export function offerItemSubtotal(item: Pick<ChatOfferLineItem, "quantity" | "unitPrice">): number {
  return Math.max(0, (item.quantity || 0) * (item.unitPrice || 0));
}

export function offerItemsSubtotal(items: ChatOfferLineItem[] | undefined | null): number {
  if (!items?.length) return 0;
  return items.reduce((sum, it) => sum + offerItemSubtotal(it), 0);
}

export function summarizeOfferItems(items: ChatOfferLineItem[]): string {
  return items
    .map((it) => it.name.trim())
    .filter(Boolean)
    .join(" · ")
    .slice(0, 500);
}

function parseOfferItems(raw: ChatOfferPayload): ChatOfferLineItem[] | undefined {
  if (!Array.isArray(raw.items) || raw.items.length === 0) return undefined;
  return raw.items.slice(0, 20).map((it, i) => ({
    id: clampStr(it?.id || `li-${i}`, 24),
    name: clampStr(it?.name || "รายการ", 120),
    description: it?.description ? clampStr(it.description, 300) : "",
    quantity: Math.max(0, Number(it?.quantity) || 0),
    unitPrice: Math.max(0, Math.round(Number(it?.unitPrice) || 0)),
  }));
}

export function parseChatOffer(content: string | null | undefined): ChatOfferPayload | null {
  if (!content?.startsWith(CHAT_OFFER_PREFIX)) return null;
  try {
    const raw = JSON.parse(content.slice(CHAT_OFFER_PREFIX.length)) as ChatOfferPayload;
    if (!raw?.title) return null;
    const items = parseOfferItems(raw);
    const fromItems = items ? Math.round(offerItemsSubtotal(items)) : 0;
    const amount =
      items && items.length > 0
        ? fromItems
        : typeof raw.amount === "number"
          ? Math.max(0, Math.round(raw.amount))
          : 0;
    if (!Number.isFinite(amount)) return null;
    const startDate = clampDate(raw.startDate);
    const endDate = clampDate(raw.endDate) || clampDate(raw.dueDate);
    const depositPercent =
      typeof raw.depositPercent === "number" && raw.depositPercent > 0
        ? Math.min(100, Math.round(raw.depositPercent))
        : 50;
    const milestones = Array.isArray(raw.milestones)
      ? raw.milestones.slice(0, 6).map((m, i) => ({
          id: clampStr(m?.id || `ms-${i}`, 24),
          label: clampStr(m?.label || "งวด", 80),
          date: clampDate(m?.date),
        }))
      : undefined;
    const v = raw.v === 3 ? 3 : raw.v === 2 ? 2 : 1;
    const deliverables = items?.length
      ? summarizeOfferItems(items)
      : clampStr(raw.deliverables, 500);
    return {
      v,
      title: clampStr(raw.title, 120),
      amount,
      currency: "THB",
      deliverables,
      items,
      dueDate: endDate,
      startDate,
      endDate,
      number: raw.number ? clampStr(raw.number, 32) : undefined,
      clientName: raw.clientName ? clampStr(raw.clientName, 80) : null,
      clientEmail: raw.clientEmail ? clampStr(raw.clientEmail, 120) : null,
      clientPhone: raw.clientPhone ? clampStr(raw.clientPhone, 40) : null,
      clientAddress: raw.clientAddress ? clampStr(raw.clientAddress, 300) : null,
      clientTaxId: raw.clientTaxId ? clampStr(raw.clientTaxId, 40) : null,
      issuerName: raw.issuerName ? clampStr(raw.issuerName, 80) : null,
      issuerEmail: raw.issuerEmail ? clampStr(raw.issuerEmail, 120) : null,
      depositPercent,
      depositDueDate: clampDate(raw.depositDueDate),
      paymentTerms: raw.paymentTerms ? clampStr(raw.paymentTerms, 120) : null,
      whtEnabled: raw.whtEnabled !== false,
      whtRate: typeof raw.whtRate === "number" ? raw.whtRate : 3,
      milestones,
      clientNotes: raw.clientNotes ? clampStr(raw.clientNotes, 800) : null,
      internalNotes: raw.internalNotes ? clampStr(raw.internalNotes, 800) : null,
    };
  } catch {
    return null;
  }
}

export function formatOfferBaht(amount: number): string {
  return amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatOfferAmount(amount: number): string {
  return `฿${formatOfferBaht(amount)}`;
}

/** Thai Buddhist calendar short: 10 ก.ค. 69 */
export function formatOfferDateShort(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

/** Thai Buddhist calendar long: 10 กรกฎาคม 2569 */
export function formatOfferDateLong(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function makeOfferNumber(): string {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 900) + 100);
  return `QT-${y}-${n}`;
}

export function paymentTermsLabel(depositPercent: number): string {
  if (depositPercent >= 100) return "จ่ายเต็มจำนวน";
  return "ชำระมัดจำก่อนเริ่มงาน";
}

export function offerDepositAmount(amount: number, percent = 50): number {
  return Math.round(amount * (percent / 100) * 100) / 100;
}

export function offerWhtAmount(amount: number, rate = 3): number {
  return Math.round(amount * (rate / 100) * 100) / 100;
}

export function defaultOfferMilestones(
  start?: string | null,
  end?: string | null,
): ChatOfferMilestone[] {
  return [
    { id: "ms-start", label: "มัดจำ / เริ่มงาน", date: start || null },
    { id: "ms-draft", label: "ส่งร่างเบื้องต้น", date: null },
    { id: "ms-end", label: "ส่งมอบสุดท้าย", date: end || null },
  ];
}

export function offerTimelineEvents(
  offer: Pick<
    ChatOfferPayload,
    "startDate" | "endDate" | "dueDate" | "depositDueDate" | "milestones" | "depositPercent"
  >,
): ChatOfferTimelineEvent[] {
  if (offer.milestones && offer.milestones.length > 0) {
    return offer.milestones
      .filter((m) => m.date)
      .map((m, i, arr) => ({
        date: m.date!,
        label: m.label,
        type: (i === 0
          ? "deposit"
          : i === arr.length - 1
            ? "end"
            : "milestone") as ChatOfferTimelineEvent["type"],
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  const events: ChatOfferTimelineEvent[] = [];
  if (offer.depositDueDate && (offer.depositPercent ?? 50) < 100) {
    events.push({ date: offer.depositDueDate, label: "ชำระมัดจำ", type: "deposit" });
  }
  if (offer.startDate) events.push({ date: offer.startDate, label: "เริ่มงาน", type: "start" });
  const end = offer.endDate || offer.dueDate;
  if (end) events.push({ date: end, label: "ส่งมอบ / จบงาน", type: "end" });
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function offerDurationDays(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const a = new Date(`${start}T12:00:00`).getTime();
  const b = new Date(`${end}T12:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return Math.round((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

export function offerAcceptMessage(offer: ChatOfferPayload): string {
  return `ยอมรับข้อเสนอ «${offer.title}» · ${formatOfferAmount(offer.amount)} — ลุยต่อได้เลย`;
}

export function offerDeclineMessage(offer: ChatOfferPayload): string {
  return `ยังไม่รับข้อเสนอ «${offer.title}» · ${formatOfferAmount(offer.amount)} — คุยรายละเอียดเพิ่มก่อนนะ`;
}
