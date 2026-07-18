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

export type OfferPartyType = "individual" | "corporate";

export type OfferPartyInfo = {
  type: OfferPartyType;
  name?: string | null;
  companyName?: string | null;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  branch?: string | null;
  contactPerson?: string | null;
  contactRole?: string | null;
  vatRegistered?: boolean;
};

export type OfferPaymentMode = "full" | "deposit";

export type ChatOfferPayload = {
  v: 1 | 2 | 3 | 4;
  title: string;
  amount: number;
  /** Settlement currency for the offer amount (ledger settle is always THB satang). */
  currency: "THB" | "USD";
  /** Display preference at offer create time (FX label only — not settlement). */
  displayCurrency?: string;
  fxRateSnapshot?: {
    quoteCurrency: string;
    rate: number;
    source: string;
    asOf: string;
  } | null;
  /** Summary of line items (backward compat / chat card). */
  deliverables: string;
  items?: ChatOfferLineItem[];
  /** Discount in THB (same unit as amount / line items). Always the resolved baht amount. */
  discount?: number;
  /** How the seller entered the discount. */
  discountMode?: "thb" | "percent";
  /** Percent value when discountMode is percent (1–100). */
  discountPercent?: number;
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
  /** Structured parties (v4+). Flat client* kept for backward compat. */
  party?: { issuer: OfferPartyInfo; client: OfferPartyInfo };
  paymentMode?: OfferPaymentMode;
  /** Deposit % — presets 50 | 100, or custom 1–100 */
  depositPercent?: number;
  depositDueDate?: string | null;
  paymentTerms?: string | null;
  whtEnabled?: boolean;
  whtRate?: number;
  /** True when client is corporate and WHT checkbox applies. */
  whtApplicable?: boolean;
  milestones?: ChatOfferMilestone[];
  /**
   * When true, quotation shows full milestone timeline.
   * When false, only the final delivery date.
   * Undefined (legacy messages) keeps full timeline.
   */
  showFullTimeline?: boolean;
  /** Shown on the quotation for the client. */
  clientNotes?: string | null;
  /** Freelancer-only note — do not render on the paper preview. */
  internalNotes?: string | null;
  /** DB quote id when persisted. */
  quoteId?: string | null;
};

export function emptyParty(type: OfferPartyType = "individual"): OfferPartyInfo {
  return {
    type,
    name: null,
    companyName: null,
    taxId: null,
    address: null,
    phone: null,
    email: null,
    branch: null,
    contactPerson: null,
    contactRole: null,
    vatRegistered: false,
  };
}

export function partyDisplayName(p: OfferPartyInfo | null | undefined): string {
  if (!p) return "";
  if (p.type === "corporate") return (p.companyName || p.name || "").trim();
  return (p.name || "").trim();
}

export type ChatOfferTimelineEvent = {
  date: string;
  label: string;
  type: "deposit" | "start" | "milestone" | "end";
};

export const DEPOSIT_PRESETS = [50, 100] as const;

export function isChatOfferContent(content: string | null | undefined): boolean {
  return !!content?.includes(CHAT_OFFER_PREFIX);
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
  if (!content?.includes(CHAT_OFFER_PREFIX)) return null;
  const idx = content.indexOf(CHAT_OFFER_PREFIX);
  try {
    const raw = JSON.parse(content.slice(idx + CHAT_OFFER_PREFIX.length)) as ChatOfferPayload;
    if (!raw?.title) return null;
    const items = parseOfferItems(raw);
    const fromItems = items ? Math.round(offerItemsSubtotal(items)) : 0;
    const discountMode: "thb" | "percent" =
      raw.discountMode === "percent" ? "percent" : "thb";
    const discountPercent =
      typeof raw.discountPercent === "number" && Number.isFinite(raw.discountPercent)
        ? Math.min(100, Math.max(0, Math.round(raw.discountPercent)))
        : undefined;
    let discount =
      typeof raw.discount === "number" && Number.isFinite(raw.discount)
        ? Math.max(0, Math.round(raw.discount))
        : 0;
    if (items && items.length > 0 && discountMode === "percent" && discountPercent != null) {
      discount = Math.round((fromItems * discountPercent) / 100);
    }
    if (items && items.length > 0) {
      discount = Math.min(discount, fromItems);
    }
    const amount =
      items && items.length > 0
        ? Math.max(0, fromItems - discount)
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
    const v = raw.v === 4 ? 4 : raw.v === 3 ? 3 : raw.v === 2 ? 2 : 1;
    const deliverables = items?.length
      ? summarizeOfferItems(items)
      : clampStr(raw.deliverables, 500);
    const clientType: OfferPartyType =
      raw.party?.client?.type === "corporate" ? "corporate" : "individual";
    const issuerType: OfferPartyType =
      raw.party?.issuer?.type === "corporate" ? "corporate" : "individual";
    const party = {
      issuer: {
        type: issuerType,
        name: clampStr(raw.party?.issuer?.name || raw.issuerName, 120) || null,
        companyName: raw.party?.issuer?.companyName
          ? clampStr(raw.party.issuer.companyName, 160)
          : null,
        taxId: raw.party?.issuer?.taxId ? clampStr(raw.party.issuer.taxId, 13) : null,
        address: raw.party?.issuer?.address ? clampStr(raw.party.issuer.address, 300) : null,
        phone: raw.party?.issuer?.phone ? clampStr(raw.party.issuer.phone, 40) : null,
        email: clampStr(raw.party?.issuer?.email || raw.issuerEmail, 120) || null,
        branch: raw.party?.issuer?.branch ? clampStr(raw.party.issuer.branch, 80) : null,
        contactPerson: raw.party?.issuer?.contactPerson
          ? clampStr(raw.party.issuer.contactPerson, 80)
          : null,
        contactRole: raw.party?.issuer?.contactRole
          ? clampStr(raw.party.issuer.contactRole, 80)
          : null,
        vatRegistered: !!raw.party?.issuer?.vatRegistered,
      },
      client: {
        type: clientType,
        name: clampStr(raw.party?.client?.name || raw.clientName, 120) || null,
        companyName: raw.party?.client?.companyName
          ? clampStr(raw.party.client.companyName, 160)
          : null,
        taxId: clampStr(raw.party?.client?.taxId || raw.clientTaxId, 13) || null,
        address: clampStr(raw.party?.client?.address || raw.clientAddress, 300) || null,
        phone: clampStr(raw.party?.client?.phone || raw.clientPhone, 40) || null,
        email: clampStr(raw.party?.client?.email || raw.clientEmail, 120) || null,
        branch: raw.party?.client?.branch ? clampStr(raw.party.client.branch, 80) : null,
        contactPerson: raw.party?.client?.contactPerson
          ? clampStr(raw.party.client.contactPerson, 80)
          : null,
        contactRole: raw.party?.client?.contactRole
          ? clampStr(raw.party.client.contactRole, 80)
          : null,
        vatRegistered: !!raw.party?.client?.vatRegistered,
      },
    };
    const paymentMode: OfferPaymentMode =
      raw.paymentMode === "deposit" || (depositPercent < 100 && raw.paymentMode !== "full")
        ? "deposit"
        : "full";
    const whtApplicable = clientType === "corporate" && raw.whtEnabled !== false;
    return {
      v,
      title: clampStr(raw.title, 120),
      amount,
      currency: "THB",
      displayCurrency:
        typeof raw.displayCurrency === "string" && raw.displayCurrency.trim()
          ? clampStr(raw.displayCurrency, 8)
          : undefined,
      fxRateSnapshot:
        raw.fxRateSnapshot &&
        typeof raw.fxRateSnapshot.rate === "number" &&
        raw.fxRateSnapshot.rate > 0
          ? {
              quoteCurrency: clampStr(raw.fxRateSnapshot.quoteCurrency || "USD", 8),
              rate: raw.fxRateSnapshot.rate,
              source: clampStr(raw.fxRateSnapshot.source || "fx", 40),
              asOf: clampStr(raw.fxRateSnapshot.asOf || "", 40),
            }
          : null,
      deliverables,
      items,
      discount: discount > 0 ? discount : undefined,
      discountMode: discount > 0 || discountPercent ? discountMode : undefined,
      discountPercent:
        discountMode === "percent" && discountPercent != null && discountPercent > 0
          ? discountPercent
          : undefined,
      dueDate: endDate,
      startDate,
      endDate,
      number: raw.number ? clampStr(raw.number, 32) : undefined,
      clientName: raw.clientName ? clampStr(raw.clientName, 80) : party.client.name,
      clientEmail: raw.clientEmail ? clampStr(raw.clientEmail, 120) : party.client.email,
      clientPhone: raw.clientPhone ? clampStr(raw.clientPhone, 40) : party.client.phone,
      clientAddress: raw.clientAddress ? clampStr(raw.clientAddress, 300) : party.client.address,
      clientTaxId: raw.clientTaxId ? clampStr(raw.clientTaxId, 40) : party.client.taxId,
      issuerName: raw.issuerName ? clampStr(raw.issuerName, 80) : party.issuer.name,
      issuerEmail: raw.issuerEmail ? clampStr(raw.issuerEmail, 120) : party.issuer.email,
      party,
      paymentMode,
      depositPercent: paymentMode === "full" ? 100 : depositPercent,
      depositDueDate: clampDate(raw.depositDueDate),
      paymentTerms: raw.paymentTerms ? clampStr(raw.paymentTerms, 120) : null,
      whtEnabled: whtApplicable,
      whtApplicable,
      whtRate: typeof raw.whtRate === "number" ? raw.whtRate : 3,
      milestones,
      showFullTimeline: typeof raw.showFullTimeline === "boolean" ? raw.showFullTimeline : undefined,
      clientNotes: raw.clientNotes ? clampStr(raw.clientNotes, 800) : null,
      internalNotes: raw.internalNotes ? clampStr(raw.internalNotes, 800) : null,
      quoteId: raw.quoteId ? clampStr(raw.quoteId, 40) : null,
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

/** Milestones shown on the quotation paper / chat card (respects showFullTimeline). */
export function offerDisplayMilestones(
  offer: Pick<
    ChatOfferPayload,
    "milestones" | "startDate" | "endDate" | "dueDate" | "showFullTimeline"
  >,
): ChatOfferMilestone[] {
  const end = offer.endDate || offer.dueDate || null;
  if (offer.showFullTimeline === false) {
    return end ? [{ id: "end", label: "ส่งมอบสุดท้าย", date: end }] : [];
  }
  if (offer.milestones && offer.milestones.length > 0) {
    return offer.milestones;
  }
  return [
    ...(offer.startDate
      ? [{ id: "a", label: "มัดจำ / เริ่มงาน", date: offer.startDate }]
      : []),
    ...(end ? [{ id: "b", label: "ส่งมอบสุดท้าย", date: end }] : []),
  ];
}

export function offerTimelineEvents(
  offer: Pick<
    ChatOfferPayload,
    | "startDate"
    | "endDate"
    | "dueDate"
    | "depositDueDate"
    | "milestones"
    | "depositPercent"
    | "showFullTimeline"
  >,
): ChatOfferTimelineEvent[] {
  const display = offerDisplayMilestones(offer);
  if (display.length > 0) {
    return display
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

export const QUOTE_DECLINE_REASONS = [
  { id: "revise_details", label: "ขอแก้ไขรายละเอียด / ราคา" },
  { id: "scope_change", label: "ขอปรับเปลี่ยนสโคปงาน" },
  { id: "timeline", label: "ระยะเวลาไม่ตรงกัน" },
  { id: "budget", label: "งบไม่ตรงกัน" },
  { id: "not_ready", label: "ยังไม่สะดวกจ้างตอนนี้" },
  { id: "other", label: "อื่น ๆ" },
] as const;

export type QuoteDeclineReasonId = (typeof QUOTE_DECLINE_REASONS)[number]["id"];

export function quoteDeclineReasonLabel(id: string | null | undefined): string {
  return QUOTE_DECLINE_REASONS.find((r) => r.id === id)?.label || "ปฏิเสธใบเสนอราคา";
}

export function offerDeclineWithReasonMessage(
  offer: ChatOfferPayload,
  reasonId: QuoteDeclineReasonId,
  note?: string | null,
): string {
  const label = quoteDeclineReasonLabel(reasonId);
  const extra = note?.trim() ? ` — ${note.trim()}` : "";
  return `ปฏิเสธใบเสนอราคา «${offer.title}» · ${formatOfferAmount(offer.amount)} — ${label}${extra}`;
}

/** Thai tax ID checksum (13 digits). */
export function isValidThaiTaxId(raw: string | null | undefined): boolean {
  const s = String(raw || "").replace(/\D/g, "");
  if (s.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(s[i]) * (13 - i);
  const check = (11 - (sum % 11)) % 10;
  return check === Number(s[12]);
}
