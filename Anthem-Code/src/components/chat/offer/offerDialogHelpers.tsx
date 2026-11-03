import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { BillingProfileFields } from "@/lib/billingProfile";
import {
  defaultOfferMilestones,
  type OfferInstallment,
  type ChatOfferLineItem,
  type ChatOfferMilestone,
  type OfferPartyType,
  type OfferPaymentMode,
} from "@/lib/chatOffer";
import { convertFxToThb, convertThbToFx, type PortfolioFxCurrency } from "@/lib/payments/fxDaily";
import { cn } from "@/lib/utils";

/** Draft types, amount formatting and small field components for the chat offer dialog. */
/** YYYY-MM-DD in Asia/Bangkok (quotation “created today”). */
export function todayOfferDateYmd() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}


export function newMilestoneId() {
  return `ms-${Math.random().toString(36).slice(2, 9)}`;
}

export type OfferFieldError =
  | "title"
  | "items"
  | "endDate"
  | "companyName"
  | "taxId"
  | "endBeforeStart"
  | "plan";

/** Scroll order matches form sections top → bottom. */
export const OFFER_FIELD_ORDER: OfferFieldError[] = [
  "companyName",
  "taxId",
  "title",
  "items",
  "endDate",
  "endBeforeStart",
  "plan",
];

export type OfferSectionId = "client" | "items" | "timeline" | "payment" | "notes";

export const DEFAULT_OPEN_SECTIONS: OfferSectionId[] = ["client", "items", "timeline", "payment"];

export const SECTION_FOR_FIELD: Record<OfferFieldError, OfferSectionId> = {
  companyName: "client",
  taxId: "client",
  title: "items",
  items: "items",
  endDate: "timeline",
  endBeforeStart: "timeline",
  plan: "payment",
};

/** One-tap terms for the client-facing notes. Free launch: parties pay each other directly. */
export const OFFER_NOTE_CHIPS_FREE = [
  "แก้ไขได้ 2 รอบ",
  "รวมไฟล์ต้นฉบับ",
  "โอนตามบัญชีที่แจ้งในแชท",
  "ราคานี้ยืนยันได้ 30 วัน",
];
export const OFFER_NOTE_CHIPS_PAID = [
  "แก้ไขได้ 2 รอบ",
  "รวมไฟล์ต้นฉบับ",
  "ราคานี้ยืนยันได้ 30 วัน",
];

/** Unsent form, kept per conversation so closing the popup never loses work. */
export type OfferDraft = {
  title: string;
  items: ChatOfferLineItem[];
  startDate: string;
  endDate: string;
  clientType: OfferPartyType;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  companyName: string;
  taxId: string;
  corpAddress: string;
  contactPerson: string;
  contactRole: string;
  corpPhone: string;
  corpEmail: string;
  paymentMode: OfferPaymentMode;
  depositPercent: number;
  customDeposit: string;
  whtEnabled: boolean;
  discountMode: "thb" | "percent";
  discount: number;
  discountPercent: number;
  discountInput: string;
  clientNotes: string;
  internalNotes: string;
  milestones: ChatOfferMilestone[];
  showFullTimeline: boolean;
  paymentPlan: OfferInstallment[];
  validUntil: string;
};

export function offerDraftKey(conversationId: string) {
  return `samecor:offer-draft:${conversationId}`;
}

export function initialOfferMilestones(paid: boolean): ChatOfferMilestone[] {
  const ms = defaultOfferMilestones();
  return paid ? ms : ms.map((m) => (m.id === "ms-start" ? { ...m, label: "เริ่มงาน" } : m));
}

export const fieldErrorClass =
  "border-destructive focus-visible:ring-destructive focus-visible:ring-offset-0";

export function profileToBillingFields(
  profile: Record<string, unknown> | null | undefined,
  fallbackEmail?: string | null,
): BillingProfileFields | null {
  if (!profile) {
    return fallbackEmail ? { email: fallbackEmail } : null;
  }
  return {
    billing_type: profile.billing_type as string | null | undefined,
    legal_name: profile.legal_name as string | null | undefined,
    company_name: profile.company_name as string | null | undefined,
    tax_id: profile.tax_id as string | null | undefined,
    billing_address: profile.billing_address as string | null | undefined,
    branch: profile.branch as string | null | undefined,
    contact_person: profile.contact_person as string | null | undefined,
    contact_role: profile.contact_role as string | null | undefined,
    vat_registered: profile.vat_registered as boolean | null | undefined,
    display_name: profile.display_name as string | null | undefined,
    email: (profile.email as string | null | undefined) || fallbackEmail || null,
    phone: profile.phone as string | null | undefined,
  };
}

export function IssuerField({ label, value }: { label: string; value?: string | null }) {
  const text = value?.trim() || "";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm whitespace-pre-line",
          text ? "text-foreground" : "text-muted-foreground/70",
        )}
      >
        {text || "—"}
      </p>
    </div>
  );
}

export function sanitizeAmountInput(raw: string, allowDecimal: boolean): string {
  const s = raw.replace(/[^\d.]/g, "");
  if (!allowDecimal) return s.replace(/\./g, "");
  const dot = s.indexOf(".");
  if (dot === -1) return s;
  return s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
}

export function thbUnitToDisplay(
  thb: number,
  currency: PortfolioFxCurrency,
  rates: Parameters<typeof convertThbToFx>[2],
): string {
  if (!Number.isFinite(thb) || thb <= 0) return thb === 0 ? "0" : "";
  if (currency === "THB") return String(Math.round(thb));
  const converted = convertThbToFx(thb, currency, rates);
  if (currency === "JPY") return String(Math.round(converted));
  return String(Math.round(converted * 100) / 100);
}

/** Unit price cell — type in selected FX; store THB on blur. */
export function OfferUnitPriceInput({
  unitPriceThb,
  currency,
  rates,
  onCommitThb,
}: {
  unitPriceThb: number;
  currency: PortfolioFxCurrency;
  rates: Parameters<typeof convertThbToFx>[2];
  onCommitThb: (thb: number) => void;
}) {
  const focusedRef = useRef(false);
  const [display, setDisplay] = useState(() => thbUnitToDisplay(unitPriceThb, currency, rates));

  useEffect(() => {
    if (focusedRef.current) return;
    setDisplay(thbUnitToDisplay(unitPriceThb, currency, rates));
  }, [unitPriceThb, currency, rates]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={display}
      placeholder="0"
      aria-label="ราคาต่อหน่วย"
      className="h-10 text-right tabular-nums sm:h-8 sm:text-sm"
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        setDisplay(sanitizeAmountInput(e.target.value, currency !== "THB" && currency !== "JPY"));
      }}
      onBlur={() => {
        focusedRef.current = false;
        const trimmed = display.trim();
        if (!trimmed || trimmed === ".") {
          onCommitThb(0);
          setDisplay("0");
          return;
        }
        const n = Number(trimmed);
        if (!Number.isFinite(n) || n < 0) {
          onCommitThb(0);
          setDisplay("0");
          return;
        }
        const thb = Math.max(0, Math.round(convertFxToThb(n, currency, rates)));
        onCommitThb(thb);
        setDisplay(thbUnitToDisplay(thb, currency, rates));
      }}
    />
  );
}
