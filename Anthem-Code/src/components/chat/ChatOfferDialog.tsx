import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useSendMessage } from "@/hooks/useChat";
import { useIssueQuotation } from "@/hooks/useStudioDocuments";
import { addDaysYmd } from "@/lib/documents/studioDocuments";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyKycRequests } from "@/hooks/useKyc";
import { sharedDb } from "@/integrations/supabase/db";
import type { Json } from "@/integrations/supabase/types";
import { billingToParty, type BillingProfileFields } from "@/lib/billingProfile";
import { mergeBillingWithKyc } from "@/lib/billingFromKyc";
import { isKycExpired, resolveKycExpiresAt } from "@/lib/kycIdentity";
import { allocateDocNumber } from "@/lib/documents/numbering";
import {
  DEPOSIT_PRESETS,
  defaultOfferMilestones,
  emptyOfferItem,
  emptyParty,
  encodeChatOffer,
  formatOfferAmount,
  isValidThaiTaxId,
  offerDepositAmount,
  offerItemSubtotal,
  offerItemsSubtotal,
  offerWhtAmount,
  partyDisplayName,
  paymentTermsLabel,
  summarizeOfferItems,
  PAYMENT_PLAN_PRESETS,
  newInstallmentId,
  offerInstallmentAmounts,
  planFromPreset,
  planPercentTotal,
  planPresetId,
  type OfferInstallment,
  type ChatOfferLineItem,
  type ChatOfferMilestone,
  type ChatOfferPayload,
  type OfferPartyInfo,
  type OfferPartyType,
  type OfferPaymentMode,
} from "@/lib/chatOffer";
import { ChatOfferPreview } from "@/components/chat/ChatOfferPreview";
import { PrintButton } from "@/components/documents/PrintButton";
import { CurrencyMenu } from "@/components/payments/PriceCurrencySelect";
import { useFxRates } from "@/hooks/useFxRates";
import {
  convertFxToThb,
  convertThbToFx,
  currencySymbol,
  formatPortfolioMoney,
  readPortfolioFxCurrency,
  writePortfolioFxCurrency,
  type PortfolioFxCurrency,
} from "@/lib/payments/fxDaily";
import { cn } from "@/lib/utils";
import { isCommerceEnabled } from "@/lib/aplus1Launch";
import { trackProductEvent } from "@/lib/productEvents";

/** YYYY-MM-DD in Asia/Bangkok (quotation “created today”). */
function todayOfferDateYmd() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  hiringRequestId?: string | null;
  defaultTitle?: string;
  defaultClientName?: string;
  defaultClientEmail?: string;
  defaultClientPhone?: string;
  defaultClientAddress?: string;
  defaultClientTaxId?: string;
  /** Auto-fill the client section from the hiring user's profile (editable after). */
  defaultClientParty?: OfferPartyInfo | null;
};

function newMilestoneId() {
  return `ms-${Math.random().toString(36).slice(2, 9)}`;
}

type OfferFieldError =
  | "title"
  | "items"
  | "endDate"
  | "companyName"
  | "taxId"
  | "endBeforeStart"
  | "plan";

/** Scroll order matches form sections top → bottom. */
const OFFER_FIELD_ORDER: OfferFieldError[] = [
  "companyName",
  "taxId",
  "title",
  "items",
  "endDate",
  "endBeforeStart",
  "plan",
];

type OfferSectionId = "client" | "items" | "timeline" | "payment" | "notes";

const DEFAULT_OPEN_SECTIONS: OfferSectionId[] = ["client", "items", "timeline", "payment"];

const SECTION_FOR_FIELD: Record<OfferFieldError, OfferSectionId> = {
  companyName: "client",
  taxId: "client",
  title: "items",
  items: "items",
  endDate: "timeline",
  endBeforeStart: "timeline",
  plan: "payment",
};

/** One-tap terms for the client-facing notes. Free launch: parties pay each other directly. */
const OFFER_NOTE_CHIPS_FREE = [
  "แก้ไขได้ 2 รอบ",
  "รวมไฟล์ต้นฉบับ",
  "โอนตามบัญชีที่แจ้งในแชท",
  "ราคานี้ยืนยันได้ 30 วัน",
];
const OFFER_NOTE_CHIPS_PAID = [
  "แก้ไขได้ 2 รอบ",
  "รวมไฟล์ต้นฉบับ",
  "ราคานี้ยืนยันได้ 30 วัน",
];

/** Unsent form, kept per conversation so closing the popup never loses work. */
type OfferDraft = {
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

function offerDraftKey(conversationId: string) {
  return `samecor:offer-draft:${conversationId}`;
}

function initialOfferMilestones(paid: boolean): ChatOfferMilestone[] {
  const ms = defaultOfferMilestones();
  return paid ? ms : ms.map((m) => (m.id === "ms-start" ? { ...m, label: "เริ่มงาน" } : m));
}

const fieldErrorClass =
  "border-destructive focus-visible:ring-destructive focus-visible:ring-offset-0";

function profileToBillingFields(
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

function IssuerField({ label, value }: { label: string; value?: string | null }) {
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

function sanitizeAmountInput(raw: string, allowDecimal: boolean): string {
  const s = raw.replace(/[^\d.]/g, "");
  if (!allowDecimal) return s.replace(/\./g, "");
  const dot = s.indexOf(".");
  if (dot === -1) return s;
  return s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
}

function thbUnitToDisplay(
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
function OfferUnitPriceInput({
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

export function ChatOfferDialog({
  open,
  onOpenChange,
  conversationId,
  hiringRequestId,
  defaultTitle,
  defaultClientName,
  defaultClientEmail,
  defaultClientPhone,
  defaultClientAddress,
  defaultClientTaxId,
  defaultClientParty,
}: Props) {
  const send = useSendMessage();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: kycRequests = [] } = useMyKycRequests();
  const approvedKyc = useMemo(
    () =>
      kycRequests.find((r) => {
        if (r.status !== "approved") return false;
        return !isKycExpired(
          resolveKycExpiresAt({ kyc_expires_at: r.kyc_expires_at, reviewed_at: r.reviewed_at }),
        );
      }) ?? null,
    [kycRequests],
  );
  const { data: fx } = useFxRates();
  const [displayCurrency, setDisplayCurrency] = useState<PortfolioFxCurrency>(() =>
    readPortfolioFxCurrency("THB"),
  );

  const [title, setTitle] = useState(defaultTitle?.trim() || "");
  const [items, setItems] = useState<ChatOfferLineItem[]>(() => [emptyOfferItem()]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [clientType, setClientType] = useState<OfferPartyType>("individual");
  const [clientName, setClientName] = useState(defaultClientName?.trim() || "");
  const [clientEmail, setClientEmail] = useState(defaultClientEmail?.trim() || "");
  const [clientPhone, setClientPhone] = useState(defaultClientPhone?.trim() || "");
  const [clientAddress, setClientAddress] = useState(defaultClientAddress?.trim() || "");
  const [companyName, setCompanyName] = useState(defaultClientName?.trim() || "");
  const [taxId, setTaxId] = useState(defaultClientTaxId?.trim() || "");
  const [corpAddress, setCorpAddress] = useState(defaultClientAddress?.trim() || "");
  const [contactPerson, setContactPerson] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [corpPhone, setCorpPhone] = useState(defaultClientPhone?.trim() || "");
  const [corpEmail, setCorpEmail] = useState(defaultClientEmail?.trim() || "");
  const paid = isCommerceEnabled();
  const [paymentMode, setPaymentMode] = useState<OfferPaymentMode>(paid ? "deposit" : "full");
  const [depositPercent, setDepositPercent] = useState(isCommerceEnabled() ? 50 : 100);
  const [customDeposit, setCustomDeposit] = useState("50");
  const [whtEnabled, setWhtEnabled] = useState(true);
  const [discountMode, setDiscountMode] = useState<"thb" | "percent">("thb");
  const [discount, setDiscount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountInput, setDiscountInput] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [allocatingNumber, setAllocatingNumber] = useState(false);
  const [milestones, setMilestones] = useState<ChatOfferMilestone[]>(() =>
    initialOfferMilestones(paid),
  );
  const [openSections, setOpenSections] = useState<OfferSectionId[]>(DEFAULT_OPEN_SECTIONS);
  const [issuerOpen, setIssuerOpen] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  /** Unchecked = quotation shows only final delivery date. */
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<OfferInstallment[]>(() => planFromPreset("50-50"));
  const [validUntil, setValidUntil] = useState(() => addDaysYmd(todayOfferDateYmd(), 30));
  const issueQuotation = useIssueQuotation();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"view" | "confirm">("view");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OfferFieldError, string>>>({});
  const fieldRefs = useRef<Partial<Record<OfferFieldError, HTMLElement | null>>>({});
  const previewPaperRef = useRef<HTMLDivElement>(null);

  const setFieldRef = (key: OfferFieldError) => (el: HTMLElement | null) => {
    fieldRefs.current[key] = el;
  };

  const clearFieldError = (key: OfferFieldError) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const focusFirstError = (errors: Partial<Record<OfferFieldError, string>>) => {
    const first = OFFER_FIELD_ORDER.find((k) => errors[k]);
    if (!first) return;
    // Wait for a just-expanded accordion section to mount its fields.
    window.setTimeout(() => {
      const el = fieldRefs.current[first];
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
          ? el
          : el.querySelector<HTMLElement>("input, textarea");
      focusable?.focus?.();
    }, 80);
  };

  const issuerParty = useMemo(
    () =>
      billingToParty(
        mergeBillingWithKyc(profileToBillingFields(profile, user?.email), approvedKyc),
      ),
    [profile, user?.email, approvedKyc],
  );

  const buildClientParty = (): OfferPartyInfo => {
    if (clientType === "corporate") {
      return {
        ...emptyParty("corporate"),
        companyName: companyName.trim() || null,
        taxId: taxId.replace(/\D/g, "").slice(0, 13) || null,
        address: corpAddress.trim() || null,
        contactPerson: contactPerson.trim() || null,
        contactRole: contactRole.trim() || null,
        phone: corpPhone.trim() || null,
        email: corpEmail.trim() || null,
        name: contactPerson.trim() || companyName.trim() || null,
      };
    }
    return {
      ...emptyParty("individual"),
      name: clientName.trim() || null,
      email: clientEmail.trim() || null,
      phone: clientPhone.trim() || null,
      address: clientAddress.trim() || null,
    };
  };

  const clientParty = useMemo(
    () => buildClientParty(),
    [
      clientType,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      companyName,
      taxId,
      corpAddress,
      contactPerson,
      contactRole,
      corpPhone,
      corpEmail,
    ],
  );

  const effectiveDepositPercent = paymentMode === "full" ? 100 : depositPercent;
  const whtApplicable = clientType === "corporate" && whtEnabled;

  useEffect(() => {
    if (clientType !== "corporate") setWhtEnabled(false);
    else setWhtEnabled(true);
  }, [clientType]);

  // Auto-fill client details from the hiring user's profile when the dialog opens.
  // Only fills when the client section is still empty, so manual edits are preserved.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!justOpened || !defaultClientParty) return;

    const clientSectionEmpty =
      !clientName.trim() &&
      !clientEmail.trim() &&
      !clientPhone.trim() &&
      !clientAddress.trim() &&
      !companyName.trim() &&
      !taxId.trim() &&
      !corpAddress.trim() &&
      !corpPhone.trim() &&
      !corpEmail.trim() &&
      !contactPerson.trim() &&
      !contactRole.trim();
    if (!clientSectionEmpty) return;

    const p = defaultClientParty;
    if (p.type === "corporate") {
      setClientType("corporate");
      setCompanyName((p.companyName || p.name || "").trim());
      setTaxId((p.taxId || "").trim());
      setCorpAddress((p.address || "").trim());
      setCorpPhone((p.phone || "").trim());
      setCorpEmail((p.email || "").trim());
      setContactPerson((p.contactPerson || "").trim());
      setContactRole((p.contactRole || "").trim());
    } else {
      setClientType("individual");
      setClientName((p.name || "").trim());
      setClientEmail((p.email || "").trim());
      setClientPhone((p.phone || "").trim());
      setClientAddress((p.address || "").trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autofill once per open
  }, [open, defaultClientParty]);

  const itemsTotal = useMemo(() => Math.round(offerItemsSubtotal(items)), [items]);
  const clampedDiscount = useMemo(() => {
    if (discountMode === "percent") {
      const pct = Math.min(100, Math.max(0, Math.round(discountPercent)));
      return Math.min(itemsTotal, Math.round((itemsTotal * pct) / 100));
    }
    return Math.min(itemsTotal, Math.max(0, Math.round(discount)));
  }, [discountMode, discount, discountPercent, itemsTotal]);
  const netTotal = Math.max(0, itemsTotal - clampedDiscount);

  useEffect(() => {
    if (discountMode !== "thb") return;
    if (discount > itemsTotal) {
      setDiscount(itemsTotal);
      setDiscountInput(itemsTotal > 0 ? String(itemsTotal) : "");
    }
  }, [itemsTotal, discount, discountMode]);

  const updateItem = (id: string, patch: Partial<ChatOfferLineItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    clearFieldError("items");
  };

  const applyDiscountInput = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    const n = Math.max(0, Number(digits) || 0);
    if (discountMode === "percent") {
      const pct = Math.min(100, n);
      setDiscountPercent(pct);
      setDiscountInput(digits ? String(pct) : "");
    } else {
      setDiscount(n);
      setDiscountInput(digits);
    }
  };

  const toggleDiscountMode = () => {
    if (discountMode === "thb") {
      const pct =
        itemsTotal > 0
          ? Math.min(100, Math.round((clampedDiscount / itemsTotal) * 100))
          : 0;
      setDiscountMode("percent");
      setDiscountPercent(pct);
      setDiscountInput(pct > 0 ? String(pct) : "");
    } else {
      setDiscountMode("thb");
      setDiscount(clampedDiscount);
      setDiscountInput(clampedDiscount > 0 ? String(clampedDiscount) : "");
    }
  };

  const applyDeposit = (pct: number) => {
    const next = Math.min(100, Math.max(1, Math.round(pct)));
    setDepositPercent(next);
    setCustomDeposit(String(next));
  };

  const removeMilestone = (id: string) => {
    setMilestones((prev) => {
      const next = prev.filter((x) => x.id !== id);
      return next.length >= 2 ? next : prev;
    });
  };

  /** New steps go before the delivery step, so the last one stays the delivery date. */
  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev.slice(0, -1),
      { id: newMilestoneId(), label: paid ? "งวดใหม่" : "ขั้นตอนใหม่", date: null },
      ...prev.slice(-1),
    ]);
  };

  const toggleNoteChip = (chip: string) => {
    setClientNotes((prev) => {
      const lines = prev.split("\n");
      const isChip = (line: string) => line.replace(/^•\s*/, "").trim() === chip;
      if (lines.some(isChip)) return lines.filter((line) => !isChip(line)).join("\n").trim();
      const line = `• ${chip}`;
      return prev.trim() ? `${prev.trimEnd()}\n${line}` : line;
    });
  };

  const fxRate =
    displayCurrency !== "THB" && fx?.rates?.[displayCurrency]
      ? fx.rates[displayCurrency]!
      : null;

  const moneyLabel = (thb: number) => {
    if (displayCurrency === "THB" || !fxRate) return formatOfferAmount(thb);
    return formatPortfolioMoney(convertThbToFx(thb, displayCurrency, fx?.rates), displayCurrency);
  };

  const pickDisplayCurrency = (c: PortfolioFxCurrency) => {
    writePortfolioFxCurrency(c);
    setDisplayCurrency(c);
  };

  const effectiveStartDate = startDate || todayOfferDateYmd();

  const previewOffer: ChatOfferPayload = useMemo(() => {
    const named = items.filter((it) => it.name.trim());
    const flatClientName =
      clientType === "corporate"
        ? clientParty.companyName || clientParty.name
        : clientParty.name;
    return {
      v: 4,
      title: title.trim() || "ชื่องาน",
      amount: netTotal,
      currency: "THB",
      displayCurrency,
      fxRateSnapshot:
        displayCurrency !== "THB" && fxRate
          ? {
              quoteCurrency: displayCurrency,
              rate: fxRate,
              source: fx?.source || "frankfurter.app",
              asOf: fx?.asOf || "",
            }
          : null,
      deliverables: summarizeOfferItems(named),
      items: named.length ? named : items,
      discount: clampedDiscount > 0 ? clampedDiscount : undefined,
      discountMode: clampedDiscount > 0 ? discountMode : undefined,
      discountPercent:
        discountMode === "percent" && discountPercent > 0
          ? Math.min(100, Math.round(discountPercent))
          : undefined,
      startDate: effectiveStartDate,
      endDate: endDate || null,
      dueDate: endDate || null,
      clientName: flatClientName || null,
      clientEmail: clientParty.email || null,
      clientPhone: clientParty.phone || null,
      clientAddress: clientParty.address || null,
      clientTaxId: clientParty.taxId || null,
      issuerName: partyDisplayName(issuerParty) || null,
      issuerEmail: issuerParty.email || null,
      party: { issuer: issuerParty, client: clientParty },
      paymentMode: paid ? paymentMode : paymentPlan.length > 1 ? "deposit" : "full",
      depositPercent: paid
        ? effectiveDepositPercent
        : paymentPlan.length > 1
          ? paymentPlan[0].percent
          : 100,
      depositDueDate: null,
      paymentTerms: paid ? paymentTermsLabel(effectiveDepositPercent) : null,
      paymentPlan: paid ? undefined : paymentPlan,
      validUntil: validUntil || null,
      whtEnabled: whtApplicable,
      whtApplicable,
      whtRate: 3,
      milestones,
      showFullTimeline,
      clientNotes: clientNotes.trim() || null,
      internalNotes: internalNotes.trim() || null,
    };
  }, [
    title,
    items,
    netTotal,
    clampedDiscount,
    discountMode,
    discountPercent,
    effectiveStartDate,
    endDate,
    clientType,
    clientParty,
    issuerParty,
    paymentMode,
    effectiveDepositPercent,
    whtApplicable,
    milestones,
    showFullTimeline,
    clientNotes,
    internalNotes,
    paymentPlan,
    validUntil,
    paid,
    displayCurrency,
    fxRate,
    fx?.source,
    fx?.asOf,
  ]);

  const reset = () => {
    setTitle(defaultTitle?.trim() || "");
    setItems([emptyOfferItem()]);
    setStartDate("");
    setEndDate("");
    setClientType("individual");
    setClientName(defaultClientName?.trim() || "");
    setClientEmail(defaultClientEmail?.trim() || "");
    setClientPhone(defaultClientPhone?.trim() || "");
    setClientAddress(defaultClientAddress?.trim() || "");
    setCompanyName(defaultClientName?.trim() || "");
    setTaxId(defaultClientTaxId?.trim() || "");
    setCorpAddress(defaultClientAddress?.trim() || "");
    setContactPerson("");
    setContactRole("");
    setCorpPhone(defaultClientPhone?.trim() || "");
    setCorpEmail(defaultClientEmail?.trim() || "");
    setPaymentMode(paid ? "deposit" : "full");
    setDepositPercent(50);
    setCustomDeposit("50");
    setWhtEnabled(true);
    setDiscountMode("thb");
    setDiscount(0);
    setDiscountPercent(0);
    setDiscountInput("");
    setClientNotes("");
    setInternalNotes("");
    setMilestones(initialOfferMilestones(paid));
    setShowFullTimeline(false);
    setPaymentPlan(planFromPreset("50-50"));
    setValidUntil(addDaysYmd(todayOfferDateYmd(), 30));
    setFieldErrors({});
  };

  const draftKey = offerDraftKey(conversationId);
  const draftSnapshot: OfferDraft = {
    title,
    items,
    startDate,
    endDate,
    clientType,
    clientName,
    clientEmail,
    clientPhone,
    clientAddress,
    companyName,
    taxId,
    corpAddress,
    contactPerson,
    contactRole,
    corpPhone,
    corpEmail,
    paymentMode,
    depositPercent,
    customDeposit,
    whtEnabled,
    discountMode,
    discount,
    discountPercent,
    discountInput,
    clientNotes,
    internalNotes,
    milestones,
    showFullTimeline,
    paymentPlan,
    validUntil,
  };
  const hasDraftContent =
    (!!title.trim() && title.trim() !== (defaultTitle?.trim() || "")) ||
    items.some((it) => it.name.trim() || (it.unitPrice || 0) > 0) ||
    !!clientNotes.trim() ||
    !!internalNotes.trim() ||
    !!endDate;
  const draftJson = JSON.stringify(draftSnapshot);

  const writeDraft = () => {
    try {
      if (hasDraftContent) localStorage.setItem(draftKey, draftJson);
    } catch {
      // Storage blocked (private mode) — the form still works, just without a draft.
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  };

  // Autosave while editing.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(writeDraft, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draftJson captures every field
  }, [open, draftKey, draftJson, hasDraftContent]);

  // Restore the unsent draft when the popup opens (runs after the client autofill above).
  const draftOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !draftOpenRef.current;
    draftOpenRef.current = open;
    if (!justOpened) return;
    setOpenSections(DEFAULT_OPEN_SECTIONS);
    setIssuerOpen(false);
    let d: Partial<OfferDraft> | null = null;
    try {
      const raw = localStorage.getItem(draftKey);
      d = raw ? (JSON.parse(raw) as Partial<OfferDraft>) : null;
    } catch {
      d = null;
    }
    if (!d) {
      setRestoredDraft(false);
      return;
    }
    if (typeof d.title === "string") setTitle(d.title);
    if (Array.isArray(d.items) && d.items.length) setItems(d.items);
    if (typeof d.startDate === "string") setStartDate(d.startDate);
    if (typeof d.endDate === "string") setEndDate(d.endDate);
    if (d.clientType === "individual" || d.clientType === "corporate") setClientType(d.clientType);
    if (typeof d.clientName === "string") setClientName(d.clientName);
    if (typeof d.clientEmail === "string") setClientEmail(d.clientEmail);
    if (typeof d.clientPhone === "string") setClientPhone(d.clientPhone);
    if (typeof d.clientAddress === "string") setClientAddress(d.clientAddress);
    if (typeof d.companyName === "string") setCompanyName(d.companyName);
    if (typeof d.taxId === "string") setTaxId(d.taxId);
    if (typeof d.corpAddress === "string") setCorpAddress(d.corpAddress);
    if (typeof d.contactPerson === "string") setContactPerson(d.contactPerson);
    if (typeof d.contactRole === "string") setContactRole(d.contactRole);
    if (typeof d.corpPhone === "string") setCorpPhone(d.corpPhone);
    if (typeof d.corpEmail === "string") setCorpEmail(d.corpEmail);
    if (d.paymentMode === "full" || d.paymentMode === "deposit") setPaymentMode(d.paymentMode);
    if (typeof d.depositPercent === "number") setDepositPercent(d.depositPercent);
    if (typeof d.customDeposit === "string") setCustomDeposit(d.customDeposit);
    if (d.discountMode === "thb" || d.discountMode === "percent") setDiscountMode(d.discountMode);
    if (typeof d.discount === "number") setDiscount(d.discount);
    if (typeof d.discountPercent === "number") setDiscountPercent(d.discountPercent);
    if (typeof d.discountInput === "string") setDiscountInput(d.discountInput);
    if (typeof d.clientNotes === "string") setClientNotes(d.clientNotes);
    if (typeof d.internalNotes === "string") setInternalNotes(d.internalNotes);
    if (Array.isArray(d.milestones) && d.milestones.length >= 2) setMilestones(d.milestones);
    if (typeof d.showFullTimeline === "boolean") setShowFullTimeline(d.showFullTimeline);
    if (Array.isArray(d.paymentPlan) && d.paymentPlan.length > 0) setPaymentPlan(d.paymentPlan);
    if (typeof d.validUntil === "string") setValidUntil(d.validUntil);
    setRestoredDraft(true);
  }, [open, draftKey]);

  const discardDraft = () => {
    clearDraft();
    reset();
    setRestoredDraft(false);
  };

  const handleOpen = (next: boolean) => {
    if (next) {
      setTitle(defaultTitle?.trim() || "");
      setClientName(defaultClientName?.trim() || "");
      setClientEmail(defaultClientEmail?.trim() || "");
      setClientPhone(defaultClientPhone?.trim() || "");
      setClientAddress(defaultClientAddress?.trim() || "");
      setCompanyName(defaultClientName?.trim() || "");
      setTaxId(defaultClientTaxId?.trim() || "");
      setCorpAddress(defaultClientAddress?.trim() || "");
      setCorpPhone(defaultClientPhone?.trim() || "");
      setCorpEmail(defaultClientEmail?.trim() || "");
      setFieldErrors({});
    } else {
      if (hasDraftContent) {
        writeDraft();
        toast("เก็บร่างไว้ให้แล้ว", { description: "เปิดใบเสนอราคาในแชทนี้อีกครั้งเพื่อทำต่อ" });
      }
      setPreviewOpen(false);
      setPreviewMode("view");
      reset();
      setRestoredDraft(false);
    }
    onOpenChange(next);
  };

  const validateOffer = (): { title: string; named: typeof items } | null => {
    const trimmedTitle = title.trim();
    const named = items.filter((it) => it.name.trim());
    const errors: Partial<Record<OfferFieldError, string>> = {};

    if (!trimmedTitle) {
      errors.title = "ใส่ชื่องานด้วย";
    }
    if (named.length === 0) {
      errors.items = "เพิ่มอย่างน้อย 1 รายการ";
    } else if (itemsTotal <= 0) {
      errors.items = "ใส่ราคาในรายการให้มียอดรวมมากกว่า 0";
    } else if (netTotal <= 0) {
      errors.items = "ส่วนลดต้องน้อยกว่ายอดรวมรายการ";
    }
    if (!endDate) {
      errors.endDate = "ใส่วันส่งมอบด้วย";
    } else if (endDate < effectiveStartDate) {
      errors.endBeforeStart = "วันส่งมอบต้องไม่อยู่ก่อนวันเริ่มงาน";
    }
    if (!paid) {
      const sum = planPercentTotal(paymentPlan);
      if (sum !== 100) errors.plan = `รวมทุกงวดต้องได้ 100% (ตอนนี้ ${sum}%)`;
      else if (paymentPlan.some((p) => p.percent <= 0)) errors.plan = "แต่ละงวดต้องมากกว่า 0%";
    }
    if (clientType === "corporate") {
      if (!companyName.trim()) {
        errors.companyName = "ใส่ชื่อบริษัท/นิติบุคคล";
      }
      if (taxId.trim() && !isValidThaiTaxId(taxId)) {
        errors.taxId = "เลขผู้เสียภาษีไม่ถูกต้อง (13 หลัก)";
      }
    }

    setFieldErrors(errors);
    const errorSections = (Object.keys(errors) as OfferFieldError[]).map((k) => SECTION_FOR_FIELD[k]);
    if (errorSections.length) {
      setOpenSections((prev) => Array.from(new Set([...prev, ...errorSections])));
    }
    const firstKey = OFFER_FIELD_ORDER.find((k) => errors[k]);
    if (firstKey) {
      toast.error(errors[firstKey]);
      focusFirstError(errors);
      return null;
    }
    return { title: trimmedTitle, named };
  };

  const openPreview = (mode: "view" | "confirm") => {
    if (mode === "confirm" && !validateOffer()) return;
    setPreviewMode(mode);
    setPreviewOpen(true);
  };

  const confirmSend = async () => {
    const ok = validateOffer();
    if (!ok) return;

    const syncedMilestones = milestones.map((m, i, arr) => {
      if (i === 0 && !m.date) return { ...m, date: effectiveStartDate };
      if (i === arr.length - 1 && !m.date && endDate) return { ...m, date: endDate };
      return m;
    });

    const payload: ChatOfferPayload = {
      ...previewOffer,
      title: ok.title,
      amount: netTotal,
      startDate: effectiveStartDate,
      endDate,
      dueDate: endDate,
      discount: clampedDiscount > 0 ? clampedDiscount : undefined,
      discountMode: clampedDiscount > 0 ? discountMode : undefined,
      discountPercent:
        discountMode === "percent" && discountPercent > 0
          ? Math.min(100, Math.round(discountPercent))
          : undefined,
      items: ok.named,
      deliverables: summarizeOfferItems(ok.named),
      milestones: syncedMilestones,
    };

    setAllocatingNumber(true);
    let issuedNumber: string;
    try {
      issuedNumber = await allocateDocNumber("quotation");
    } finally {
      setAllocatingNumber(false);
    }
    payload.number = issuedNumber;

    // Free launch: record the quotation so invoices / receipts / My Studio can follow it.
    if (!paid) {
      try {
        const doc = await issueQuotation.mutateAsync({ offer: payload, conversationId });
        payload.docId = doc.id;
      } catch {
        toast.warning("ส่งใบเสนอราคาได้ แต่ยังบันทึกลงหลังบ้านไม่สำเร็จ", {
          description: "กด “เริ่มติดตามงวด” ในแผงงานนี้ภายหลังได้",
        });
      }
    }

    let quoteId: string | null = null;

    if (hiringRequestId && user?.id) {
      try {
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        const { data, error } = await sharedDb
          .from("hire_quotes" as never)
          .insert({
            hiring_request_id: hiringRequestId,
            conversation_id: conversationId,
            version: 4,
            status: "sent",
            payload: payload as unknown as Json,
            deposit_percent: effectiveDepositPercent,
            wht_enabled: whtApplicable,
            amount_satang: netTotal * 100,
            currency: "THB",
            doc_number: issuedNumber,
            expires_at: expiresAt,
            created_by: user.id,
          } as never)
          .select("id")
          .single();

        if (!error && data && typeof (data as { id?: string }).id === "string") {
          quoteId = (data as { id: string }).id;
        }
      } catch {
        // Table may not exist yet — still send chat message.
      }
    }

    try {
      await send.mutateAsync({
        conversationId,
        content: encodeChatOffer({ ...payload, quoteId }),
        messageType: "text",
      });
      toast.success("ส่งใบเสนอราคาในแชทแล้ว");
      void trackProductEvent("proposal_send", { conversation_id: conversationId }, { debounceMs: 0 });
      clearDraft();
      setPreviewOpen(false);
      setPreviewMode("view");
      reset();
      setRestoredDraft(false);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    }
  };

  const totalLabel = moneyLabel(netTotal);
  const whtAmount = whtApplicable ? offerWhtAmount(netTotal, 3) : 0;
  const afterWht = Math.max(0, netTotal - whtAmount);
  const depositAmount =
    paymentMode === "deposit" && effectiveDepositPercent < 100
      ? offerDepositAmount(afterWht, effectiveDepositPercent)
      : 0;

  const grandTotal = afterWht;
  const namedItemCount = items.filter((it) => it.name.trim()).length;
  const clientDone = clientType === "corporate" ? !!companyName.trim() : !!clientName.trim();
  const itemsDone = !!title.trim() && namedItemCount > 0 && netTotal > 0;
  const timelineDone = !!endDate && endDate >= effectiveStartDate;
  const issuerName = partyDisplayName(issuerParty);
  const issuerMissing = !issuerName || !issuerParty.email;
  const issuerSettingsHref = paid ? "/settings#billing" : "/settings#profile";
  const clientSummary = clientDone
    ? clientType === "corporate"
      ? `${companyName.trim()} · นิติบุคคล`
      : clientName.trim()
    : "ชื่อลูกค้าที่จะแสดงบนเอกสาร";
  const itemsSummary = itemsDone
    ? `${title.trim()} · ${namedItemCount} รายการ`
    : "ชื่องาน รายการ และราคา";
  const timelineSummary = timelineDone
    ? `ส่งมอบ ${formatOfferShortDate(endDate)}`
    : "ใส่วันส่งมอบงาน";
  const noteLines = clientNotes
    .split("\n")
    .map((line) => line.replace(/^•\s*/, "").trim())
    .filter(Boolean);
  const notesSummary = noteLines.length
    ? `${noteLines[0]}${noteLines.length > 1 ? ` +${noteLines.length - 1}` : ""}`
    : "เงื่อนไขที่ลูกค้าเห็น และโน้ตส่วนตัว";
  const noteChips = paid ? OFFER_NOTE_CHIPS_PAID : OFFER_NOTE_CHIPS_FREE;
  const lastMilestoneIdx = milestones.length - 1;
  const planRows = offerInstallmentAmounts({
    amount: netTotal,
    paymentPlan,
    whtApplicable,
    whtRate: 3,
  });
  const planTotal = planPercentTotal(paymentPlan);
  const planPreset = planPresetId(paymentPlan);
  const paymentDone = planTotal === 100 && paymentPlan.every((p) => p.percent > 0);
  const paymentSummary = !paymentDone
    ? `รวม ${planTotal}% · ยังไม่ครบ 100%`
    : paymentPlan.length === 1
      ? "จ่ายครั้งเดียว"
      : `${paymentPlan.length} งวด · ${paymentPlan.map((p) => `${p.percent}%`).join(" / ")}`;
  const updateInstallment = (id: string, patch: Partial<OfferInstallment>) => {
    setPaymentPlan((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    clearFieldError("plan");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-6xl">
          <DialogHeader className="border-b border-border px-4 py-3 pr-12 text-left sm:px-6 sm:py-4">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-5 w-5 text-primary" aria-hidden />
              สร้างใบเสนอราคา
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {paid
                ? "กรอกข้อมูล เช็กพรีวิว แล้วส่งให้ลูกค้าในแชท"
                : "ทำใบเสนอราคาส่งลูกค้าในแชทได้ในไม่กี่นาที · เลขที่เอกสารออกให้อัตโนมัติ"}
              {restoredDraft ? (
                <>
                  {" · "}
                  <span className="text-foreground">ทำต่อจากร่างล่าสุด</span>{" "}
                  <button
                    type="button"
                    onClick={discardDraft}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    เริ่มใหม่
                  </button>
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
            <div className="relative min-h-0 overflow-y-auto overscroll-contain bg-muted px-4 py-4 dark:bg-background sm:px-6">
              {/* Issuer — read-only, so it stays a compact strip */}
              <Collapsible
                open={issuerOpen}
                onOpenChange={setIssuerOpen}
                className="mb-3 rounded-xl border border-border bg-card"
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p className="min-w-0 flex-1 truncate text-sm">
                    <span className="text-muted-foreground">ออกในนาม </span>
                    <span className="font-medium">{issuerName || "ยังไม่มีชื่อ"}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {issuerParty.type === "corporate" ? "นิติบุคคล" : "บุคคลธรรมดา"}
                    </span>
                  </p>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-primary hover:underline"
                    >
                      {issuerOpen ? "ซ่อน" : "ดูข้อมูล"}
                      <ChevronDown
                        className={cn("h-3.5 w-3.5 transition-transform", issuerOpen && "rotate-180")}
                        aria-hidden
                      />
                    </button>
                  </CollapsibleTrigger>
                </div>
                {issuerMissing ? (
                  <p className="flex items-start gap-1.5 border-t border-border px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      ข้อมูลผู้ออกเอกสารยังไม่ครบ ช่องที่ว่างจะขึ้นเป็น “—” บนเอกสาร{" "}
                      <Link
                        to={issuerSettingsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline underline-offset-2"
                      >
                        เติมข้อมูล
                      </Link>
                    </span>
                  </p>
                ) : null}
                <CollapsibleContent className="border-t border-border px-3 py-3">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {issuerParty.type === "corporate" ? (
                      <>
                        <IssuerField label="ชื่อบริษัท / นิติบุคคล" value={issuerParty.companyName} />
                        <IssuerField label="ชื่อผู้มีอำนาจ / ชื่อที่แสดง" value={issuerParty.name} />
                        <IssuerField label="สาขา" value={issuerParty.branch} />
                        <IssuerField label="เลขผู้เสียภาษี" value={issuerParty.taxId} />
                        <IssuerField label="ผู้ติดต่อ" value={issuerParty.contactPerson} />
                        <IssuerField label="ตำแหน่ง" value={issuerParty.contactRole} />
                      </>
                    ) : (
                      <>
                        <IssuerField label="ชื่อ-นามสกุล" value={issuerParty.name} />
                        <IssuerField label="เลขผู้เสียภาษี" value={issuerParty.taxId} />
                      </>
                    )}
                    <IssuerField label="อีเมล" value={issuerParty.email} />
                    <IssuerField label="โทร" value={issuerParty.phone} />
                    <div className="sm:col-span-2">
                      <IssuerField label="ที่อยู่" value={issuerParty.address} />
                    </div>
                    {issuerParty.type === "corporate" ? (
                      <IssuerField
                        label="จดทะเบียน VAT"
                        value={issuerParty.vatRegistered ? "ใช่" : "ไม่ใช่"}
                      />
                    ) : null}
                  </div>
                  <Link
                    to={issuerSettingsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs text-primary hover:underline"
                  >
                    แก้ไขข้อมูลผู้ออกเอกสาร
                  </Link>
                </CollapsibleContent>
              </Collapsible>

              <Accordion
                type="multiple"
                value={openSections}
                onValueChange={(v) => setOpenSections(v as OfferSectionId[])}
                className="space-y-3"
              >
                {/* 1 · Client */}
                <OfferSection
                  value="client"
                  step={1}
                  title="ลูกค้า"
                  summary={clientSummary}
                  done={clientDone}
                >
                  <ToggleGroup
                    type="single"
                    value={clientType}
                    onValueChange={(v) => {
                      if (v === "individual" || v === "corporate") setClientType(v);
                    }}
                    className="inline-flex w-full rounded-full border border-border bg-background p-1"
                    aria-label="ประเภทลูกค้า"
                  >
                    <ToggleGroupItem
                      value="individual"
                      className="min-h-9 flex-1 rounded-full px-3 text-sm data-[state=on]:bg-muted data-[state=on]:text-foreground"
                    >
                      บุคคลธรรมดา
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="corporate"
                      className="min-h-9 flex-1 rounded-full px-3 text-sm data-[state=on]:bg-muted data-[state=on]:text-foreground"
                    >
                      นิติบุคคล
                    </ToggleGroupItem>
                  </ToggleGroup>

                  {clientType === "individual" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="offer-client">ชื่อลูกค้า</Label>
                        <Input
                          id="offer-client"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="ชื่อ-นามสกุล"
                          autoComplete="off"
                          maxLength={80}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="offer-client-email">อีเมล</Label>
                        <Input
                          id="offer-client-email"
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="client@email.com"
                          autoComplete="off"
                          maxLength={120}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="offer-client-phone">เบอร์โทร</Label>
                        <Input
                          id="offer-client-phone"
                          type="tel"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="08x-xxx-xxxx"
                          autoComplete="off"
                          maxLength={40}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="offer-client-address">
                          ที่อยู่ <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span>
                        </Label>
                        <Textarea
                          id="offer-client-address"
                          value={clientAddress}
                          onChange={(e) => setClientAddress(e.target.value)}
                          placeholder="ที่อยู่สำหรับออกเอกสาร"
                          rows={2}
                          maxLength={300}
                          className="resize-none text-base sm:text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2" ref={setFieldRef("companyName")}>
                        <Label htmlFor="offer-company">
                          ชื่อบริษัท / นิติบุคคล <span className="text-brand">*</span>
                        </Label>
                        <Input
                          id="offer-company"
                          value={companyName}
                          onChange={(e) => {
                            setCompanyName(e.target.value);
                            clearFieldError("companyName");
                          }}
                          placeholder="ชื่อบริษัท"
                          autoComplete="off"
                          maxLength={160}
                          className={cn(fieldErrors.companyName && fieldErrorClass)}
                          aria-invalid={!!fieldErrors.companyName}
                          aria-describedby={fieldErrors.companyName ? "offer-company-error" : undefined}
                        />
                        {fieldErrors.companyName ? (
                          <p id="offer-company-error" className="text-xs text-destructive" role="alert">
                            {fieldErrors.companyName}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1.5 sm:col-span-2" ref={setFieldRef("taxId")}>
                        <Label htmlFor="offer-corp-tax">
                          เลขผู้เสียภาษี 13 หลัก{" "}
                          <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span>
                        </Label>
                        <Input
                          id="offer-corp-tax"
                          value={taxId}
                          onChange={(e) => {
                            setTaxId(e.target.value.replace(/[^\d]/g, "").slice(0, 13));
                            clearFieldError("taxId");
                          }}
                          placeholder="0105xxxxxxxxx"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={13}
                          className={cn("tabular-nums", fieldErrors.taxId && fieldErrorClass)}
                          aria-invalid={!!fieldErrors.taxId}
                          aria-describedby={fieldErrors.taxId ? "offer-tax-error" : undefined}
                        />
                        {fieldErrors.taxId ? (
                          <p id="offer-tax-error" className="text-xs text-destructive" role="alert">
                            {fieldErrors.taxId}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="offer-corp-address">ที่อยู่</Label>
                        <Textarea
                          id="offer-corp-address"
                          value={corpAddress}
                          onChange={(e) => setCorpAddress(e.target.value)}
                          placeholder="ที่อยู่ตามหนังสือรับรองบริษัท"
                          rows={2}
                          maxLength={300}
                          className="resize-none text-base sm:text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="offer-contact-person">ผู้ติดต่อ</Label>
                        <Input
                          id="offer-contact-person"
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          placeholder="ชื่อผู้ติดต่อ"
                          autoComplete="off"
                          maxLength={80}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="offer-contact-role">ตำแหน่ง</Label>
                        <Input
                          id="offer-contact-role"
                          value={contactRole}
                          onChange={(e) => setContactRole(e.target.value)}
                          placeholder="เช่น ฝ่ายจัดซื้อ"
                          autoComplete="off"
                          maxLength={80}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="offer-corp-phone">เบอร์โทร</Label>
                        <Input
                          id="offer-corp-phone"
                          type="tel"
                          value={corpPhone}
                          onChange={(e) => setCorpPhone(e.target.value)}
                          placeholder="02-xxx-xxxx"
                          autoComplete="off"
                          maxLength={40}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="offer-corp-email">อีเมล</Label>
                        <Input
                          id="offer-corp-email"
                          type="email"
                          value={corpEmail}
                          onChange={(e) => setCorpEmail(e.target.value)}
                          placeholder="contact@company.com"
                          autoComplete="off"
                          maxLength={120}
                        />
                      </div>
                    </div>
                  )}
                </OfferSection>

                {/* 2 · Work + price */}
                <OfferSection
                  value="items"
                  step={2}
                  title="งานและราคา"
                  summary={itemsSummary}
                  done={itemsDone}
                >
                  <div className="space-y-1.5" ref={setFieldRef("title")}>
                    <Label htmlFor="offer-title">
                      ชื่องาน <span className="text-brand">*</span>
                    </Label>
                    <Input
                      id="offer-title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        clearFieldError("title");
                      }}
                      placeholder="เช่น ออกแบบโลโก้ + brand kit"
                      autoComplete="off"
                      maxLength={120}
                      className={cn(fieldErrors.title && fieldErrorClass)}
                      aria-invalid={!!fieldErrors.title}
                      aria-describedby={fieldErrors.title ? "offer-title-error" : undefined}
                    />
                    {fieldErrors.title ? (
                      <p id="offer-title-error" className="text-xs text-destructive" role="alert">
                        {fieldErrors.title}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label>
                        รายการ <span className="text-brand">*</span>
                      </Label>
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">สกุลเงิน</span>
                        <CurrencyMenu
                          value={displayCurrency}
                          onChange={pickDisplayCurrency}
                          variant="label"
                          asOf={fx?.asOf}
                        />
                      </div>
                    </div>

                    <div
                      ref={setFieldRef("items")}
                      className={cn(
                        "overflow-hidden rounded-xl border",
                        fieldErrors.items ? "border-destructive ring-1 ring-destructive/40" : "border-border",
                      )}
                    >
                      <div className="hidden grid-cols-[24px_minmax(0,1fr)_64px_104px_96px_32px] gap-1.5 bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground sm:grid">
                        <span className="text-center">#</span>
                        <span>รายละเอียด</span>
                        <span className="text-center">จำนวน</span>
                        <span className="text-right">
                          ราคา/หน่วย
                          {displayCurrency !== "THB" ? ` (${currencySymbol(displayCurrency)})` : ""}
                        </span>
                        <span className="text-right">รวม</span>
                        <span />
                      </div>

                      <div className="divide-y divide-border">
                        {items.map((it, idx) => {
                          const rowTotal = offerItemSubtotal(it);
                          const removeItem = () =>
                            setItems((prev) => prev.filter((x) => x.id !== it.id));
                          return (
                            <div
                              key={it.id}
                              className="space-y-2 p-3 sm:grid sm:grid-cols-[24px_minmax(0,1fr)_64px_104px_96px_32px] sm:items-center sm:gap-1.5 sm:space-y-0 sm:p-2.5"
                            >
                              <span className="hidden text-center text-xs font-medium tabular-nums text-muted-foreground sm:block">
                                {idx + 1}
                              </span>
                              <div className="flex items-center gap-2 sm:contents">
                                <Input
                                  value={it.name}
                                  onChange={(e) => {
                                    updateItem(it.id, { name: e.target.value });
                                    clearFieldError("items");
                                  }}
                                  placeholder={idx === 0 ? "เช่น ออกแบบโลโก้" : "ชื่อรายการ"}
                                  aria-label={`ชื่อรายการที่ ${idx + 1}`}
                                  autoComplete="off"
                                  maxLength={120}
                                  className="h-10 min-w-0 flex-1 font-medium sm:h-8 sm:text-sm"
                                />
                                <button
                                  type="button"
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30 sm:hidden"
                                  aria-label={`ลบรายการที่ ${idx + 1}`}
                                  disabled={items.length <= 1}
                                  onClick={removeItem}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <Input
                                value={it.description || ""}
                                onChange={(e) => updateItem(it.id, { description: e.target.value })}
                                placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                                aria-label={`รายละเอียดรายการที่ ${idx + 1}`}
                                autoComplete="off"
                                maxLength={300}
                                className="h-10 min-w-0 text-muted-foreground sm:col-span-4 sm:col-start-2 sm:row-start-2 sm:h-8 sm:text-xs"
                              />
                              <div className="grid grid-cols-2 gap-2 sm:contents">
                                <label className="space-y-1 sm:contents">
                                  <span className="text-xs text-muted-foreground sm:hidden">จำนวน</span>
                                  <Input
                                    inputMode="numeric"
                                    value={it.quantity || ""}
                                    onChange={(e) =>
                                      updateItem(it.id, {
                                        quantity: Math.max(
                                          0,
                                          Number(e.target.value.replace(/[^\d]/g, "")) || 0,
                                        ),
                                      })
                                    }
                                    placeholder="1"
                                    aria-label={`จำนวน รายการที่ ${idx + 1}`}
                                    className="h-10 text-center tabular-nums sm:h-8 sm:text-sm"
                                  />
                                </label>
                                <label className="space-y-1 sm:contents">
                                  <span className="text-xs text-muted-foreground sm:hidden">
                                    ราคา/หน่วย
                                    {displayCurrency !== "THB" ? ` (${currencySymbol(displayCurrency)})` : ""}
                                  </span>
                                  <OfferUnitPriceInput
                                    unitPriceThb={it.unitPrice || 0}
                                    currency={displayCurrency}
                                    rates={fx?.rates}
                                    onCommitThb={(thb) => updateItem(it.id, { unitPrice: thb })}
                                  />
                                </label>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end">
                                <span className="text-xs text-muted-foreground sm:hidden">รวม</span>
                                <p className="text-sm font-semibold tabular-nums">{moneyLabel(rowTotal)}</p>
                              </div>
                              <button
                                type="button"
                                className="hidden h-8 w-8 items-center justify-center justify-self-end rounded-full text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30 sm:flex"
                                aria-label={`ลบรายการที่ ${idx + 1}`}
                                disabled={items.length <= 1}
                                onClick={removeItem}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-3 border-t border-border bg-muted/20 p-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-10 w-full sm:h-9"
                          disabled={items.length >= 20}
                          onClick={() => setItems((prev) => [...prev, emptyOfferItem()])}
                        >
                          <Plus className="mr-1 h-4 w-4" /> เพิ่มรายการ
                        </Button>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">ยอดรวมรายการ</span>
                            <span className="tabular-nums">{moneyLabel(itemsTotal)}</span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <Label htmlFor="offer-discount" className="font-normal text-muted-foreground">
                              ส่วนลด
                            </Label>
                            <div className="flex items-center gap-1.5">
                              {discountMode === "percent" && clampedDiscount > 0 ? (
                                <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                                  −{moneyLabel(clampedDiscount)}
                                </span>
                              ) : null}
                              <div
                                className="inline-flex h-9 items-stretch overflow-hidden rounded-full border border-border bg-background text-xs font-medium"
                                role="group"
                                aria-label="หน่วยส่วนลด"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (discountMode !== "thb") toggleDiscountMode();
                                  }}
                                  className={cn(
                                    "min-w-9 px-2.5 transition-colors",
                                    discountMode === "thb"
                                      ? "bg-muted text-foreground"
                                      : "text-muted-foreground hover:text-foreground",
                                  )}
                                  aria-label={`ส่วนลดเป็นจำนวนเงิน (${currencySymbol(displayCurrency)})`}
                                  aria-pressed={discountMode === "thb"}
                                >
                                  {currencySymbol(displayCurrency)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (discountMode !== "percent") toggleDiscountMode();
                                  }}
                                  className={cn(
                                    "min-w-9 border-l border-border px-2.5 transition-colors",
                                    discountMode === "percent"
                                      ? "bg-muted text-foreground"
                                      : "text-muted-foreground hover:text-foreground",
                                  )}
                                  aria-label="ส่วนลดเป็นเปอร์เซ็นต์"
                                  aria-pressed={discountMode === "percent"}
                                >
                                  %
                                </button>
                              </div>
                              <Input
                                id="offer-discount"
                                inputMode="numeric"
                                value={discountInput}
                                onChange={(e) => applyDiscountInput(e.target.value)}
                                placeholder="0"
                                className="h-9 w-24 text-right tabular-nums sm:text-sm"
                              />
                            </div>
                          </div>
                          {clientType === "corporate" ? (
                            <>
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-muted-foreground">ยอดรวมก่อนภาษี</span>
                                <span className="tabular-nums">{moneyLabel(netTotal)}</span>
                              </div>
                              <div className="flex items-start justify-between gap-3 text-sm">
                                <div className="flex min-w-0 items-start gap-2">
                                  <Checkbox
                                    id="offer-wht"
                                    checked={whtApplicable}
                                    onCheckedChange={(v) => setWhtEnabled(v === true)}
                                    className="mt-0.5"
                                  />
                                  <div className="space-y-0.5">
                                    <Label htmlFor="offer-wht" className="cursor-pointer font-normal">
                                      หัก ณ ที่จ่าย 3%
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      นิติบุคคลมักหัก 3% เมื่อจ่ายค่าบริการ
                                    </p>
                                  </div>
                                </div>
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                  {whtAmount > 0 ? `−${moneyLabel(whtAmount)}` : moneyLabel(0)}
                                </span>
                              </div>
                            </>
                          ) : null}
                          <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                            <span className="text-sm font-semibold">รวมทั้งสิ้น</span>
                            <span className="text-base font-semibold tabular-nums">
                              {moneyLabel(grandTotal)}
                            </span>
                          </div>
                          {paid && depositAmount > 0 ? (
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-muted-foreground">
                                มัดจำที่ต้องชำระ ({effectiveDepositPercent}%)
                              </span>
                              <span className="tabular-nums">{moneyLabel(depositAmount)}</span>
                            </div>
                          ) : null}
                          {displayCurrency !== "THB" ? (
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              พิมพ์ราคาเป็น {currencySymbol(displayCurrency)} ได้เลย ระบบจะแปลงเป็นบาทให้
                              {fx?.asOf && fx.asOf !== "fallback" ? ` · อัตรา ${fx.asOf}` : ""}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {fieldErrors.items ? (
                      <p className="text-xs text-destructive" role="alert">
                        {fieldErrors.items}
                      </p>
                    ) : null}
                  </div>

                  {paid ? (
                    <div className="space-y-2">
                      <Label>รูปแบบการชำระ</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <ToggleGroup
                          type="single"
                          value={paymentMode}
                          onValueChange={(v) => {
                            if (v === "full" || v === "deposit") {
                              setPaymentMode(v);
                              if (v === "full") applyDeposit(100);
                              else if (depositPercent >= 100) applyDeposit(50);
                            }
                          }}
                          className="inline-flex rounded-full border border-border bg-background p-1"
                        >
                          <ToggleGroupItem
                            value="full"
                            className="min-h-9 rounded-full px-3 text-sm data-[state=on]:bg-muted data-[state=on]:text-foreground"
                          >
                            เต็มจำนวน
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="deposit"
                            className="min-h-9 rounded-full px-3 text-sm data-[state=on]:bg-muted data-[state=on]:text-foreground"
                          >
                            มัดจำ %
                          </ToggleGroupItem>
                        </ToggleGroup>

                        {paymentMode === "deposit" ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {DEPOSIT_PRESETS.filter((p) => p < 100).map((p) => (
                              <Button
                                key={p}
                                type="button"
                                size="sm"
                                variant={depositPercent === p ? "default" : "outline"}
                                className="h-9 shrink-0 rounded-full"
                                onClick={() => applyDeposit(p)}
                              >
                                {p}%
                              </Button>
                            ))}
                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                              หรือกำหนดเอง
                            </span>
                            <Input
                              className={cn(
                                "h-9 w-16 shrink-0 text-center sm:text-sm",
                                depositPercent !== 50 && depositPercent !== 100
                                  ? "border-primary ring-1 ring-primary/30"
                                  : "",
                              )}
                              inputMode="numeric"
                              aria-label="มัดจำกำหนดเอง (เปอร์เซ็นต์)"
                              value={customDeposit}
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^\d]/g, "");
                                setCustomDeposit(v);
                                if (v) applyDeposit(Number(v));
                              }}
                              onFocus={() => {
                                if (customDeposit) applyDeposit(Number(customDeposit) || 50);
                              }}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </OfferSection>

                {/* 3 · Timeline — one list: first step = start, last step = delivery */}
                <OfferSection
                  value="timeline"
                  step={3}
                  title={paid ? "ไทม์ไลน์และงวดงาน" : "ขั้นตอนและวันส่งมอบ"}
                  summary={timelineSummary}
                  done={timelineDone}
                >
                  <ol className="space-y-3">
                    {milestones.map((m, i) => {
                      const isFirst = i === 0;
                      const isLast = i === lastMilestoneIdx;
                      const role = isFirst ? "เริ่มงาน" : isLast ? "ส่งมอบ" : `ขั้นที่ ${i + 1}`;
                      const endError = isLast
                        ? fieldErrors.endDate ||
                          fieldErrors.endBeforeStart ||
                          (endDate && endDate < effectiveStartDate
                            ? "วันส่งมอบต้องไม่อยู่ก่อนวันเริ่มงาน"
                            : "")
                        : "";
                      return (
                        <li
                          key={m.id}
                          className="flex gap-2.5"
                          ref={
                            isLast
                              ? (el) => {
                                  setFieldRef("endDate")(el);
                                  setFieldRef("endBeforeStart")(el);
                                }
                              : undefined
                          }
                        >
                          <div className="flex flex-col items-center pt-8">
                            <span
                              aria-hidden
                              className={cn(
                                "block h-3 w-3 shrink-0 rounded-full border-2 border-primary",
                                isFirst || isLast ? "bg-primary" : "bg-background",
                              )}
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">
                              {role}
                              {isLast ? <span className="text-brand"> *</span> : null}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_168px_auto]">
                              <div className="flex items-center gap-2">
                                <Input
                                value={m.label}
                                onChange={(e) =>
                                  setMilestones((prev) =>
                                    prev.map((x) =>
                                      x.id === m.id ? { ...x, label: e.target.value } : x,
                                    ),
                                  )
                                }
                                aria-label={`ชื่อ${role}`}
                                placeholder={paid ? "ชื่องวด" : "ชื่อขั้นตอน"}
                                autoComplete="off"
                                maxLength={80}
                                className="min-w-0 flex-1 sm:h-9 sm:text-sm"
                              />
                                {!isFirst && !isLast ? (
                                  <button
                                    type="button"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive sm:hidden"
                                    aria-label={`ลบ${role}`}
                                    onClick={() => removeMilestone(m.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                ) : null}
                              </div>
                                <Input
                                  type="date"
                                  value={m.date || ""}
                                  min={isFirst ? undefined : effectiveStartDate}
                                  onChange={(e) => {
                                    const next = e.target.value || null;
                                    setMilestones((prev) =>
                                      prev.map((x) => (x.id === m.id ? { ...x, date: next } : x)),
                                    );
                                    if (isFirst) setStartDate(next || "");
                                    if (isLast) {
                                      setEndDate(next || "");
                                      clearFieldError("endDate");
                                      clearFieldError("endBeforeStart");
                                    }
                                  }}
                                  aria-label={`วันที่${role}`}
                                  aria-invalid={isLast ? !!endError : undefined}
                                  className={cn(
                                    "min-w-0 tabular-nums sm:h-9 sm:text-sm",
                                    isLast && endError && fieldErrorClass,
                                  )}
                                />
                              {!isFirst && !isLast ? (
                                <button
                                  type="button"
                                  className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive sm:flex"
                                  aria-label={`ลบ${role}`}
                                  onClick={() => removeMilestone(m.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <span className="hidden w-9 sm:block" aria-hidden />
                              )}
                            </div>
                            {isFirst && !m.date ? (
                              <p className="text-xs text-muted-foreground">ไม่ใส่วันที่ = เริ่มวันนี้</p>
                            ) : null}
                            {endError ? (
                              <p className="text-xs text-destructive" role="alert">
                                {endError}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {milestones.length < 6 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-10 w-full sm:h-9"
                      onClick={addMilestone}
                    >
                      <Plus className="mr-1 h-4 w-4" /> {paid ? "เพิ่มงวด" : "เพิ่มขั้นตอน"}
                    </Button>
                  ) : null}

                  <div className="flex items-start gap-2.5 rounded-xl border border-border p-3">
                    <Checkbox
                      id="offer-show-full-timeline"
                      checked={showFullTimeline}
                      onCheckedChange={(v) => setShowFullTimeline(v === true)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="offer-show-full-timeline" className="cursor-pointer font-medium">
                        แสดงทุกขั้นตอนบนใบเสนอราคา
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        ถ้าไม่เลือก เอกสารจะแสดงแค่วันส่งมอบ
                      </p>
                    </div>
                  </div>
                </OfferSection>

                {/* 4 · Payment plan (free launch — parties pay each other directly) */}
                {!paid ? (
                  <OfferSection
                    value="payment"
                    step={4}
                    title="การชำระเงิน"
                    summary={paymentSummary}
                    done={paymentDone}
                  >
                    <div className="space-y-2" ref={setFieldRef("plan")}>
                      <p className="text-xs text-muted-foreground">
                        แบ่งจ่ายเป็นงวดได้ ระบบคำนวณยอดแต่ละงวดให้ แล้วออกใบแจ้งหนี้/ใบเสร็จทีละงวดจากแชทได้เลย
                      </p>
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label="รูปแบบการแบ่งจ่าย">
                        {PAYMENT_PLAN_PRESETS.map((preset) => {
                          const on = planPreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => {
                                setPaymentPlan(planFromPreset(preset.id));
                                clearFieldError("plan");
                              }}
                              className={cn(
                                "inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm transition-colors",
                                on
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border bg-background hover:bg-muted",
                              )}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                        <span
                          className={cn(
                            "inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm",
                            planPreset === "custom"
                              ? "border-foreground bg-foreground text-background"
                              : "border-dashed border-border text-muted-foreground",
                          )}
                        >
                          กำหนดเอง
                        </span>
                      </div>

                      <ol
                        className={cn(
                          "divide-y divide-border overflow-hidden rounded-xl border bg-background",
                          fieldErrors.plan ? "border-destructive ring-1 ring-destructive/40" : "border-border",
                        )}
                      >
                        {paymentPlan.map((inst, i) => {
                          const amounts = planRows[i];
                          return (
                            <li key={inst.id} className="space-y-2 p-3">
                              <div className="flex items-center gap-2">
                                <span
                                  aria-hidden
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
                                >
                                  {i + 1}
                                </span>
                                <Input
                                  value={inst.label}
                                  onChange={(e) => updateInstallment(inst.id, { label: e.target.value })}
                                  aria-label={`ชื่องวดที่ ${i + 1}`}
                                  placeholder="เช่น มัดจำก่อนเริ่มงาน"
                                  autoComplete="off"
                                  maxLength={80}
                                  className="min-w-0 flex-1 sm:h-9 sm:text-sm"
                                />
                                <div className="relative w-20 shrink-0">
                                  <Input
                                    inputMode="numeric"
                                    value={inst.percent ? String(inst.percent) : ""}
                                    onChange={(e) =>
                                      updateInstallment(inst.id, {
                                        percent: Math.min(100, Number(e.target.value.replace(/[^\d]/g, "")) || 0),
                                      })
                                    }
                                    aria-label={`เปอร์เซ็นต์งวดที่ ${i + 1}`}
                                    placeholder="0"
                                    className="pr-7 text-right tabular-nums sm:h-9 sm:text-sm"
                                  />
                                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    %
                                  </span>
                                </div>
                                {paymentPlan.length > 1 ? (
                                  <button
                                    type="button"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive sm:h-9 sm:w-9"
                                    aria-label={`ลบงวดที่ ${i + 1}`}
                                    onClick={() => {
                                      setPaymentPlan((prev) => prev.filter((p) => p.id !== inst.id));
                                      clearFieldError("plan");
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2 pl-9">
                                <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                                  จ่ายเมื่อ
                                  <select
                                    value={inst.milestoneId || ""}
                                    onChange={(e) =>
                                      updateInstallment(inst.id, { milestoneId: e.target.value || null })
                                    }
                                    className="h-9 min-w-0 max-w-[12rem] rounded-full border border-input bg-card px-3 text-sm text-foreground"
                                  >
                                    <option value="">ไม่ระบุ</option>
                                    {milestones.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.label || "ขั้นตอน"}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <p className="text-sm font-semibold tabular-nums">
                                  {amounts ? moneyLabel(amounts.net) : moneyLabel(0)}
                                  {amounts && amounts.wht > 0 ? (
                                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                                      (หัก ณ ที่จ่ายแล้ว)
                                    </span>
                                  ) : null}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ol>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {paymentPlan.length < 6 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-10 sm:h-9"
                            onClick={() => {
                              const remaining = Math.max(0, 100 - planTotal);
                              setPaymentPlan((prev) => [
                                ...prev,
                                {
                                  id: newInstallmentId(),
                                  label: `งวดที่ ${prev.length + 1}`,
                                  percent: remaining,
                                  milestoneId: null,
                                },
                              ]);
                              clearFieldError("plan");
                            }}
                          >
                            <Plus className="mr-1 h-4 w-4" /> เพิ่มงวด
                          </Button>
                        ) : (
                          <span />
                        )}
                        <p
                          className={cn(
                            "text-sm tabular-nums",
                            planTotal === 100 ? "text-muted-foreground" : "font-medium text-destructive",
                          )}
                          aria-live="polite"
                        >
                          รวม {planTotal}%{planTotal === 100 ? " ✓" : ` · ขาดอีก ${100 - planTotal}%`}
                        </p>
                      </div>
                      {fieldErrors.plan ? (
                        <p className="text-xs text-destructive" role="alert">
                          {fieldErrors.plan}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="offer-valid-until">ใบเสนอราคามีผลถึง</Label>
                      <Input
                        id="offer-valid-until"
                        type="date"
                        value={validUntil}
                        min={todayOfferDateYmd()}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="tabular-nums sm:w-56 sm:text-sm"
                      />
                    </div>
                  </OfferSection>
                ) : null}

                {/* 5 · Notes */}
                <OfferSection
                  value="notes"
                  step={paid ? 4 : 5}
                  title="หมายเหตุ"
                  summary={notesSummary}
                  done={!!clientNotes.trim()}
                  optional
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-client-notes" className="inline-flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-primary" aria-hidden />
                      เงื่อนไขที่ลูกค้าเห็น
                    </Label>
                    <div className="flex flex-wrap gap-1.5" aria-label="เงื่อนไขที่ใช้บ่อย">
                      {noteChips.map((chip) => {
                        const on = clientNotes
                          .split("\n")
                          .some((line) => line.replace(/^•\s*/, "").trim() === chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => toggleNoteChip(chip)}
                            aria-pressed={on}
                            className={cn(
                              "inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-xs transition-colors",
                              on
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background text-foreground hover:bg-muted",
                            )}
                          >
                            {on ? <Check className="h-3 w-3" aria-hidden /> : <Plus className="h-3 w-3" aria-hidden />}
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                    <Textarea
                      id="offer-client-notes"
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="กดเลือกด้านบน หรือพิมพ์เงื่อนไขเอง"
                      rows={3}
                      maxLength={800}
                      className="resize-none text-base sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 rounded-xl border border-dashed border-border/80 bg-muted/20 p-3">
                    <Label htmlFor="offer-internal-notes" className="inline-flex items-center gap-1.5">
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      โน้ตส่วนตัว
                    </Label>
                    <p className="text-xs text-muted-foreground">เห็นแค่คุณ ไม่แสดงบนเอกสาร</p>
                    <Textarea
                      id="offer-internal-notes"
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="เช่น ต้นทุนจริง · คุยส่วนลดไว้ · นัดโอนมัดจำวันไหน"
                      rows={2}
                      maxLength={800}
                      className="resize-none bg-background text-base sm:text-sm"
                    />
                  </div>
                </OfferSection>
              </Accordion>
            </div>

            {/* Live paper preview (desktop) */}
            <aside
              className="relative hidden min-h-0 overflow-y-auto overscroll-contain border-l border-border bg-muted p-4 dark:bg-background lg:block"
              aria-label="พรีวิวใบเสนอราคา"
            >
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                พรีวิว · ลูกค้าจะเห็นแบบนี้
              </p>
              <ChatOfferPreview offer={previewOffer} draft />
            </aside>
          </div>

          {/* Sticky summary + actions */}
          <div className="border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="truncate text-xs text-muted-foreground">
                  รวมทั้งสิ้น{whtAmount > 0 ? " (หลังหัก ณ ที่จ่าย)" : ""}
                </p>
                <p className="truncate text-lg font-semibold leading-tight tabular-nums">
                  {moneyLabel(grandTotal)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-11 shrink-0 px-0 sm:w-auto sm:px-4 lg:hidden"
                onClick={() => openPreview("view")}
                aria-label="พรีวิวใบเสนอราคา"
              >
                <Eye className="h-4 w-4 sm:mr-1.5" aria-hidden />
                <span className="hidden sm:inline">พรีวิว</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="hidden h-11 sm:inline-flex"
                onClick={() => handleOpen(false)}
              >
                ปิด
              </Button>
              <Button
                type="button"
                className="h-11 shrink-0"
                onClick={() => openPreview("confirm")}
                disabled={send.isPending}
              >
                ตรวจและส่ง
              </Button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {paid ? (
                <>
                  การส่งถือว่ายอมรับ{" "}
                  <Link
                    to="/legal/payment-refund"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    นโยบายชำระเงิน/คืนเงิน
                  </Link>{" "}
                  และ{" "}
                  <Link
                    to="/legal/service-agreement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    ข้อตกลงบริการ
                  </Link>
                </>
              ) : (
                "SAMECOR ช่วยทำเอกสาร ไม่ได้รับหรือถือเงิน ลูกค้าชำระกับคุณโดยตรงตามที่ตกลงในแชท"
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-3xl">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>
              {previewMode === "confirm" ? "เช็กอีกครั้งก่อนส่ง" : "พรีวิวใบเสนอราคา"}
            </DialogTitle>
            <DialogDescription>
              {previewMode === "confirm"
                ? "ถ้าข้อมูลถูกต้อง กดส่งได้เลย ลูกค้าจะได้รับในแชทนี้"
                : "หน้าตาเอกสารที่ลูกค้าจะเห็นในแชท"}
            </DialogDescription>
          </DialogHeader>
          <div className="mx-auto w-full max-w-2xl space-y-3" ref={previewPaperRef}>
            <ChatOfferPreview offer={previewOffer} draft />
            {internalNotes.trim() ? (
              <div className="space-y-1 rounded-xl border border-dashed border-border bg-muted/30 p-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  โน้ตส่วนตัว (ลูกค้าไม่เห็น)
                </p>
                <p className="whitespace-pre-wrap text-sm">{internalNotes.trim()}</p>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {previewMode === "confirm" ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPreviewOpen(false)}
                  disabled={send.isPending}
                >
                  กลับไปแก้
                </Button>
                <Button
                  type="button"
                  onClick={() => void confirmSend()}
                  disabled={send.isPending || allocatingNumber}
                >
                  {send.isPending || allocatingNumber ? "กำลังส่ง..." : "ส่งในแชท"}
                </Button>
              </>
            ) : (
              <>
                <PrintButton
                  targetRef={previewPaperRef}
                  docNumber="ร่าง"
                  title={title}
                  size="default"
                />
                <Button type="button" variant="secondary" onClick={() => setPreviewOpen(false)}>
                  กลับไปแก้ไข
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OfferSection({
  value,
  step,
  title,
  summary,
  done,
  optional,
  children,
}: {
  value: OfferSectionId;
  step: number;
  title: string;
  summary: string;
  done: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="rounded-2xl border border-border bg-card px-3.5 sm:px-4">
      <AccordionTrigger className="gap-3 py-3 text-left hover:no-underline">
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
            )}
          >
            {done ? <Check className="h-4 w-4" /> : step}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              {title}
              {optional ? (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">ไม่บังคับ</span>
              ) : null}
            </span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{summary}</span>
          </span>
          {done || !optional ? (
            <span className="sr-only">{done ? "กรอกครบแล้ว" : "ยังกรอกไม่ครบ"}</span>
          ) : null}
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 px-0.5 pb-4 pt-0.5">{children}</AccordionContent>
    </AccordionItem>
  );
}

function formatOfferShortDate(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}
