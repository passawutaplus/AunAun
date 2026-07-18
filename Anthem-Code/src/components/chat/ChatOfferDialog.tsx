import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Banknote,
  Building2,
  CalendarRange,
  Eye,
  EyeOff,
  FileText,
  Plus,
  StickyNote,
  Trash2,
  UserRound,
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
import { toast } from "sonner";
import { useSendMessage } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { sharedDb } from "@/integrations/supabase/db";
import type { Json } from "@/integrations/supabase/types";
import { billingToParty, type BillingProfileFields } from "@/lib/billingProfile";
import {
  DEPOSIT_PRESETS,
  defaultOfferMilestones,
  emptyOfferItem,
  emptyParty,
  encodeChatOffer,
  formatOfferAmount,
  isValidThaiTaxId,
  makeOfferNumber,
  offerDepositAmount,
  offerItemSubtotal,
  offerItemsSubtotal,
  offerWhtAmount,
  partyDisplayName,
  paymentTermsLabel,
  summarizeOfferItems,
  type ChatOfferLineItem,
  type ChatOfferMilestone,
  type ChatOfferPayload,
  type OfferPartyInfo,
  type OfferPartyType,
  type OfferPaymentMode,
} from "@/lib/chatOffer";
import { ChatOfferTimeline } from "@/components/chat/ChatOfferTimeline";
import { ChatOfferPreview } from "@/components/chat/ChatOfferPreview";
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
  | "endBeforeStart";

/** Scroll order matches form sections top → bottom. */
const OFFER_FIELD_ORDER: OfferFieldError[] = [
  "companyName",
  "taxId",
  "title",
  "items",
  "endDate",
  "endBeforeStart",
];

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
      <p className="text-[10px] text-muted-foreground">{label}</p>
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
  let s = raw.replace(/[^\d.]/g, "");
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
      className="h-8 text-sm tabular-nums text-right col-start-2 sm:col-start-auto"
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
  const [paymentMode, setPaymentMode] = useState<OfferPaymentMode>("deposit");
  const [depositPercent, setDepositPercent] = useState(50);
  const [customDeposit, setCustomDeposit] = useState("50");
  const [whtEnabled, setWhtEnabled] = useState(true);
  const [discountMode, setDiscountMode] = useState<"thb" | "percent">("thb");
  const [discount, setDiscount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountInput, setDiscountInput] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [docNumber] = useState(() => makeOfferNumber());
  const [milestones, setMilestones] = useState<ChatOfferMilestone[]>(() =>
    defaultOfferMilestones(),
  );
  /** Unchecked = quotation shows only final delivery date. */
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"view" | "confirm">("view");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OfferFieldError, string>>>({});
  const fieldRefs = useRef<Partial<Record<OfferFieldError, HTMLElement | null>>>({});

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
    requestAnimationFrame(() => {
      const el = fieldRefs.current[first];
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
          ? el
          : el.querySelector<HTMLElement>("input, textarea");
      focusable?.focus?.();
    });
  };

  const issuerParty = useMemo(
    () => billingToParty(profileToBillingFields(profile, user?.email)),
    [profile, user?.email],
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

  const syncMilestoneDates = (start: string, end: string) => {
    setMilestones((prev) => {
      const next = [...prev];
      if (next[0]) next[0] = { ...next[0], date: start || next[0].date || null };
      if (next.length > 0) {
        const last = next.length - 1;
        next[last] = { ...next[last], date: end || next[last].date || null };
      }
      return next;
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
      number: docNumber,
      clientName: flatClientName || null,
      clientEmail: clientParty.email || null,
      clientPhone: clientParty.phone || null,
      clientAddress: clientParty.address || null,
      clientTaxId: clientParty.taxId || null,
      issuerName: partyDisplayName(issuerParty) || null,
      issuerEmail: issuerParty.email || null,
      party: { issuer: issuerParty, client: clientParty },
      paymentMode,
      depositPercent: effectiveDepositPercent,
      depositDueDate: null,
      paymentTerms: paymentTermsLabel(effectiveDepositPercent),
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
    docNumber,
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
    setPaymentMode("deposit");
    setDepositPercent(50);
    setCustomDeposit("50");
    setWhtEnabled(true);
    setDiscountMode("thb");
    setDiscount(0);
    setDiscountPercent(0);
    setDiscountInput("");
    setClientNotes("");
    setInternalNotes("");
    setMilestones(defaultOfferMilestones());
    setShowFullTimeline(false);
    setFieldErrors({});
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
      setPreviewOpen(false);
      setPreviewMode("view");
      reset();
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
      errors.endDate = "ใส่วันที่จบงานด้วย";
    } else if (endDate < effectiveStartDate) {
      errors.endBeforeStart = "วันจบงานต้องไม่อยู่ก่อนวันเริ่มงาน";
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
            doc_number: docNumber,
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
      toast.success("ส่งใบเสนอราคาแล้ว");
      setPreviewOpen(false);
      handleOpen(false);
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

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              เสนอราคา
            </DialogTitle>
            <DialogDescription>
              กรอกรายละเอียดแบบใบเสนอราคา — กดส่งแล้วจะขึ้นพรีวิวให้เช็คก่อนส่งจริง
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1 min-w-0">
            {/* Issuer + Client */}
            <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">ผู้เสนอราคา</p>
                      <p className="text-[11px] text-muted-foreground">
                        จากโปรไฟล์การออกบิลของคุณ
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/settings#billing-profile"
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-sm text-primary hover:underline"
                  >
                    แก้ไข
                  </Link>
                </div>
                <div className="space-y-2.5 rounded-xl bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">
                      {partyDisplayName(issuerParty) || "—"}
                    </p>
                    <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground border border-border">
                      {issuerParty.type === "corporate" ? "นิติบุคคล" : "บุคคลธรรมดา"}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
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
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
                <div className="flex items-start gap-2">
                  <UserRound className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">ลูกค้า</p>
                    <p className="text-[11px] text-muted-foreground">
                      ข้อมูลที่จะแสดงบนใบเสนอราคา
                    </p>
                  </div>
                </div>

                <ToggleGroup
                  type="single"
                  value={clientType}
                  onValueChange={(v) => {
                    if (v === "individual" || v === "corporate") setClientType(v);
                  }}
                  className="inline-flex rounded-full border border-border bg-background p-1 w-full"
                >
                  <ToggleGroupItem
                    value="individual"
                    className="rounded-full px-3 py-1.5 text-xs flex-1 data-[state=on]:bg-muted data-[state=on]:text-foreground"
                  >
                    บุคคลธรรมดา
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="corporate"
                    className="rounded-full px-3 py-1.5 text-xs flex-1 data-[state=on]:bg-muted data-[state=on]:text-foreground"
                  >
                    นิติบุคคล
                  </ToggleGroupItem>
                </ToggleGroup>

                {clientType === "individual" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="offer-client">ชื่อลูกค้า</Label>
                      <Input
                        id="offer-client"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="ชื่อ-นามสกุล"
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
                        maxLength={40}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="offer-client-address">ที่อยู่</Label>
                      <Textarea
                        id="offer-client-address"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        placeholder="ที่อยู่สำหรับออกเอกสาร (ไม่บังคับ)"
                        rows={2}
                        maxLength={300}
                        className="resize-none text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2" ref={setFieldRef("companyName")}>
                      <Label htmlFor="offer-company">
                        ชื่อบริษัท / นิติบุคคล <span className="text-orange-500">*</span>
                      </Label>
                      <Input
                        id="offer-company"
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          clearFieldError("companyName");
                        }}
                        placeholder="ชื่อบริษัท"
                        maxLength={160}
                        className={cn(fieldErrors.companyName && fieldErrorClass)}
                        aria-invalid={!!fieldErrors.companyName}
                      />
                      {fieldErrors.companyName ? (
                        <p className="text-[11px] text-destructive" role="alert">
                          {fieldErrors.companyName}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2" ref={setFieldRef("taxId")}>
                      <Label htmlFor="offer-corp-tax">เลขผู้เสียภาษี (13 หลัก)</Label>
                      <Input
                        id="offer-corp-tax"
                        value={taxId}
                        onChange={(e) => {
                          setTaxId(e.target.value.replace(/[^\d]/g, "").slice(0, 13));
                          clearFieldError("taxId");
                        }}
                        placeholder="13 หลัก"
                        inputMode="numeric"
                        maxLength={13}
                        className={cn(fieldErrors.taxId && fieldErrorClass)}
                        aria-invalid={!!fieldErrors.taxId}
                      />
                      {fieldErrors.taxId ? (
                        <p className="text-[11px] text-destructive" role="alert">
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
                        placeholder="ที่อยู่สำหรับออกเอกสาร"
                        rows={2}
                        maxLength={300}
                        className="resize-none text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="offer-contact-person">ผู้ติดต่อ</Label>
                      <Input
                        id="offer-contact-person"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="ชื่อผู้ติดต่อ"
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
                        placeholder="08x-xxx-xxxx"
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
                        placeholder="client@email.com"
                        maxLength={120}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Document details */}
            <section className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">รายละเอียดเอกสาร</p>
                  <p className="text-[11px] text-muted-foreground">ข้อมูลโครงการและเงื่อนไขชำระ</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2" ref={setFieldRef("title")}>
                  <Label htmlFor="offer-title">
                    ชื่อโครงการ <span className="text-orange-500">*</span>
                  </Label>
                  <Input
                    id="offer-title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      clearFieldError("title");
                    }}
                    placeholder="เช่น ออกแบบโลโก้ + brand kit"
                    maxLength={120}
                    className={cn(fieldErrors.title && fieldErrorClass)}
                    aria-invalid={!!fieldErrors.title}
                  />
                  {fieldErrors.title ? (
                    <p className="text-[11px] text-destructive" role="alert">
                      {fieldErrors.title}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="offer-number">เลขที่ใบเสนอราคา</Label>
                  <Input id="offer-number" value={docNumber} readOnly className="bg-muted/50" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>
                    รายการ <span className="text-orange-500">*</span>
                  </Label>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">เปลี่ยนสกุลเงิน</span>
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
                    "rounded-xl border overflow-hidden",
                    fieldErrors.items ? "border-destructive ring-1 ring-destructive/40" : "border-border",
                  )}
                >
                  <div className="hidden sm:grid grid-cols-[28px_minmax(0,1.4fr)_64px_88px_88px_32px] gap-1.5 px-2.5 py-1.5 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
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
                      return (
                        <div
                          key={it.id}
                          className="p-2.5 grid grid-cols-[28px_minmax(0,1fr)] gap-1.5 sm:grid-cols-[28px_minmax(0,1.4fr)_64px_88px_88px_32px] sm:gap-x-1.5 sm:gap-y-1.5 sm:items-center"
                        >
                          <div className="flex h-8 items-center justify-center">
                            <span className="text-xs font-medium tabular-nums text-muted-foreground">
                              {idx + 1}
                            </span>
                          </div>
                          <Input
                            value={it.name}
                            onChange={(e) => {
                              updateItem(it.id, { name: e.target.value });
                              clearFieldError("items");
                            }}
                            placeholder="เช่น ออกแบบโลโก้"
                            maxLength={120}
                            className="h-8 text-sm font-medium min-w-0 col-span-1 sm:col-span-1"
                          />
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
                            aria-label="จำนวน"
                            className="h-8 text-sm tabular-nums text-center col-start-2 sm:col-start-auto"
                          />
                          <OfferUnitPriceInput
                            unitPriceThb={it.unitPrice || 0}
                            currency={displayCurrency}
                            rates={fx?.rates}
                            onCommitThb={(thb) => updateItem(it.id, { unitPrice: thb })}
                          />
                          <div className="flex h-8 items-center justify-between col-start-2 sm:col-start-auto sm:justify-end">
                            <span className="sm:hidden text-[10px] text-muted-foreground">รวม</span>
                            <p className="text-sm font-semibold tabular-nums leading-none">
                              {moneyLabel(rowTotal)}
                            </p>
                          </div>
                          <div className="flex h-8 items-center justify-end col-start-2 sm:col-start-auto">
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive p-1 disabled:opacity-30"
                              aria-label="ลบรายการ"
                              disabled={items.length <= 1}
                              onClick={() =>
                                setItems((prev) => prev.filter((x) => x.id !== it.id))
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <Input
                            value={it.description || ""}
                            onChange={(e) =>
                              updateItem(it.id, { description: e.target.value })
                            }
                            placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                            maxLength={300}
                            className="h-8 min-w-0 rounded-none border-0 border-b border-border/60 bg-transparent px-0 text-xs text-muted-foreground shadow-none focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 col-start-2 sm:col-start-2"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-2 border-t border-border bg-muted/20 space-y-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs"
                      disabled={items.length >= 20}
                      onClick={() => setItems((prev) => [...prev, emptyOfferItem()])}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มรายการ
                    </Button>

                    <div className="space-y-1.5 px-0.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">ยอดรวมรายการ</span>
                        <span className="tabular-nums">{moneyLabel(itemsTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <Label htmlFor="offer-discount" className="text-muted-foreground font-normal">
                          ส่วนลด
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="inline-flex h-8 items-stretch overflow-hidden rounded-md border border-border bg-muted/40 text-xs font-medium"
                            role="group"
                            aria-label="หน่วยส่วนลด"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (discountMode !== "percent") toggleDiscountMode();
                              }}
                              className={cn(
                                "px-2 transition-colors",
                                discountMode === "percent"
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                              title="ส่วนลดเป็นเปอร์เซ็นต์"
                              aria-pressed={discountMode === "percent"}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (discountMode !== "thb") toggleDiscountMode();
                              }}
                              className={cn(
                                "border-l border-border px-2 transition-colors",
                                discountMode === "thb"
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                              title={`ส่วนลดเป็นจำนวนเงิน (${currencySymbol(displayCurrency)})`}
                              aria-pressed={discountMode === "thb"}
                            >
                              {currencySymbol(displayCurrency)}
                            </button>
                          </div>
                          <Input
                            id="offer-discount"
                            inputMode="numeric"
                            value={discountInput}
                            onChange={(e) => applyDiscountInput(e.target.value)}
                            placeholder="0"
                            className="h-8 w-24 text-right tabular-nums text-sm"
                            aria-label={
                              discountMode === "thb"
                                ? `ส่วนลด (${currencySymbol(displayCurrency)})`
                                : "ส่วนลด (เปอร์เซ็นต์)"
                            }
                          />
                          {discountMode === "percent" && clampedDiscount > 0 ? (
                            <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                              = {moneyLabel(clampedDiscount)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            id="offer-wht"
                            checked={whtApplicable}
                            onCheckedChange={(v) => setWhtEnabled(v === true)}
                            disabled={clientType !== "corporate"}
                          />
                          <Label
                            htmlFor="offer-wht"
                            className={cn(
                              "text-sm font-normal cursor-pointer",
                              clientType !== "corporate"
                                ? "text-muted-foreground cursor-not-allowed"
                                : "text-muted-foreground",
                            )}
                            title={
                              clientType !== "corporate"
                                ? "ใช้ได้เมื่อลูกค้าเป็นนิติบุคคล"
                                : undefined
                            }
                          >
                            หัก ณ ที่จ่าย 3%
                          </Label>
                        </div>
                        <span className="tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0">
                          {whtAmount > 0 ? `−${moneyLabel(whtAmount)}` : moneyLabel(0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">
                          มัดจำที่ต้องชำระ
                          {depositAmount > 0 ? ` (${effectiveDepositPercent}%)` : ""}
                        </span>
                        <span className="tabular-nums">{moneyLabel(depositAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                        <span className="text-sm font-semibold">ยอดรวม</span>
                        <span className="text-sm font-semibold text-primary tabular-nums">
                          {totalLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right leading-relaxed">
                        {displayCurrency === "THB"
                          ? "กรอกราคาต่อหน่วยเป็นบาท — ชำระจริงเป็นบาท"
                          : `พิมพ์จำนวนในสกุลที่เลือก (${currencySymbol(displayCurrency)}) — จะแปลงเป็นบาทเมื่อออกจากช่อง`}
                        {fx?.asOf && fx.asOf !== "fallback" ? ` · อัตรา ${fx.asOf}` : ""}
                        {displayCurrency !== "THB" ? " · ชำระจริงเป็นบาท" : ""}
                      </p>
                    </div>
                  </div>
                </div>
                {fieldErrors.items ? (
                  <p className="text-[11px] text-destructive" role="alert">
                    {fieldErrors.items}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <Label className="shrink-0">รูปแบบการชำระ</Label>
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
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
                        className="rounded-full px-3 py-1.5 text-xs data-[state=on]:bg-muted data-[state=on]:text-foreground"
                      >
                        เต็มจำนวน
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="deposit"
                        className="rounded-full px-3 py-1.5 text-xs data-[state=on]:bg-muted data-[state=on]:text-foreground"
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
                            className="rounded-full h-8 shrink-0"
                            onClick={() => applyDeposit(p)}
                          >
                            {p}%
                          </Button>
                        ))}
                        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                          หรือกำหนดเอง:
                        </span>
                        <Input
                          className={cn(
                            "h-8 w-14 shrink-0",
                            depositPercent !== 50 && depositPercent !== 100
                              ? "border-primary ring-1 ring-primary/30"
                              : "",
                          )}
                          inputMode="numeric"
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
                        <span className="text-[12px] text-muted-foreground">%</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            {/* Timeline + Notes side by side on lg+ */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <section className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
                <div className="flex items-start gap-2">
                  <CalendarRange className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">ไทม์ไลน์และงวดงาน</p>
                    <p className="text-[11px] text-muted-foreground">
                      วันที่เหล่านี้จะปรากฏบนใบเสนอราคา
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border p-3",
                    showFullTimeline ? "border-primary/40 bg-primary/5" : "border-border",
                  )}
                >
                  <Checkbox
                    id="offer-show-full-timeline"
                    checked={showFullTimeline}
                    onCheckedChange={(v) => setShowFullTimeline(v === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="offer-show-full-timeline"
                      className="text-sm font-medium cursor-pointer"
                    >
                      ต้องการแสดงไทม์ไลน์แบบเต็มในใบเสนอราคาไหม
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      {showFullTimeline
                        ? "แสดงลำดับงวดงานทั้งหมดเหมือนพรีวิวด้านล่าง"
                        : "ไม่ติ๊ก = แสดงแค่วันส่งมอบสุดท้ายบนใบเสนอราคา"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[12px] font-medium mb-1.5">วันที่โครงการ</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="offer-start">วันที่เริ่ม</Label>
                      <Input
                        id="offer-start"
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          const next = e.target.value;
                          setStartDate(next);
                          if (endDate && next && endDate < next) setEndDate("");
                          syncMilestoneDates(
                            next || todayOfferDateYmd(),
                            endDate && next && endDate < next ? "" : endDate,
                          );
                        }}
                      />
                      {!startDate ? (
                        <p className="text-[10px] text-muted-foreground">
                          ไม่ใส่ = ใช้วันที่ทำใบเสนอราคาอัตโนมัติ
                        </p>
                      ) : null}
                    </div>
                    <div
                      className="space-y-1.5"
                      ref={(el) => {
                        setFieldRef("endDate")(el);
                        setFieldRef("endBeforeStart")(el);
                      }}
                    >
                      <Label htmlFor="offer-end">
                        วันที่จบงาน <span className="text-orange-500">*</span>
                      </Label>
                      <Input
                        id="offer-end"
                        type="date"
                        value={endDate}
                        min={effectiveStartDate}
                        required
                        onChange={(e) => {
                          const next = e.target.value;
                          setEndDate(next);
                          clearFieldError("endDate");
                          clearFieldError("endBeforeStart");
                          syncMilestoneDates(startDate || todayOfferDateYmd(), next);
                        }}
                        className={cn(
                          (fieldErrors.endDate || fieldErrors.endBeforeStart) && fieldErrorClass,
                        )}
                        aria-invalid={!!(fieldErrors.endDate || fieldErrors.endBeforeStart)}
                      />
                    </div>
                  </div>
                  {fieldErrors.endDate || fieldErrors.endBeforeStart || (endDate && endDate < effectiveStartDate) ? (
                    <p className="text-[11px] text-destructive mt-1.5" role="alert">
                      {fieldErrors.endDate ||
                        fieldErrors.endBeforeStart ||
                        "วันจบงานต้องไม่อยู่ก่อนวันเริ่มงาน"}
                    </p>
                  ) : null}
                  <ChatOfferTimeline offer={previewOffer} className="mt-2" />
                </div>

                <div className="space-y-2">
                  <p className="text-[12px] font-medium">งวดการชำระเงิน / ลำดับงาน</p>
                  <div className="space-y-2.5">
                    {milestones.map((m, i) => (
                      <div key={m.id} className="flex gap-2 items-start">
                        <div className="pt-2.5">
                          <span
                            className={cn(
                              "block h-3 w-3 rounded-full border-2 border-primary",
                              i === 0 || i === milestones.length - 1
                                ? "bg-primary"
                                : "bg-transparent",
                            )}
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
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
                              className="h-8 text-xs font-medium"
                              placeholder="ชื่องวด"
                              maxLength={80}
                            />
                            {milestones.length > 1 ? (
                              <button
                                type="button"
                                className="text-destructive p-1"
                                aria-label="ลบงวด"
                                onClick={() =>
                                  setMilestones((prev) => prev.filter((x) => x.id !== m.id))
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                          <Input
                            type="date"
                            value={m.date || ""}
                            min={effectiveStartDate}
                            onChange={(e) => {
                              const next = e.target.value || null;
                              setMilestones((prev) =>
                                prev.map((x) => (x.id === m.id ? { ...x, date: next } : x)),
                              );
                              // Link timeline ↔ project dates both ways.
                              if (i === 0) {
                                setStartDate(next || "");
                              }
                              if (i === milestones.length - 1) {
                                setEndDate(next || "");
                                clearFieldError("endDate");
                                clearFieldError("endBeforeStart");
                              }
                            }}
                            className="h-8 text-xs border-0 bg-transparent shadow-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {milestones.length < 6 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs"
                      onClick={() =>
                        setMilestones((prev) => [
                          ...prev,
                          { id: newMilestoneId(), label: "งวดใหม่", date: null },
                        ])
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" /> เพิ่มงวด
                    </Button>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
                <div className="flex items-start gap-2">
                  <StickyNote className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">หมายเหตุ</p>
                    <p className="text-[11px] text-muted-foreground">
                      แยกหมายเหตุที่ลูกค้าเห็น กับโน้ตภายในของคุณ
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offer-client-notes" className="inline-flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-primary" aria-hidden />
                    หมายเหตุฝั่งลูกค้า
                  </Label>
                  <p className="text-[11px] text-muted-foreground -mt-0.5">
                    แสดงบนใบเสนอราคาให้ลูกค้าอ่านได้
                  </p>
                  <Textarea
                    id="offer-client-notes"
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="เช่น รวมไฟล์ต้นฉบับ · ชำระมัดจำก่อนเริ่มงาน · แก้ไข 2 รอบ"
                    rows={3}
                    maxLength={800}
                    className="resize-none text-sm"
                  />
                </div>
                <div className="space-y-1.5 rounded-xl border border-dashed border-border/80 bg-muted/20 p-3">
                  <Label htmlFor="offer-internal-notes" className="inline-flex items-center gap-1.5">
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    หมายเหตุฝั่งเรา (ภายใน)
                  </Label>
                  <p className="text-[11px] text-muted-foreground -mt-0.5">
                    เห็นเฉพาะคุณตอนเปิดดูข้อเสนอที่ส่งแล้ว — ไม่โชว์บนใบเสนอราคา
                  </p>
                  <Textarea
                    id="offer-internal-notes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="เช่น ต้นทุนจริง · คุยส่วนลดไว้ · ติดตามมัดจำวันไหน"
                    rows={3}
                    maxLength={800}
                    className="resize-none text-sm bg-background"
                  />
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="flex-col gap-3 sm:flex-col sm:items-stretch">
            <p className="text-[10px] text-muted-foreground text-center w-full order-first sm:order-none">
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
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between w-full">
              <Button type="button" variant="outline" onClick={() => openPreview("view")}>
                <Eye className="w-4 h-4 mr-1.5" />
                ดูพรีวิว
              </Button>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="ghost" onClick={() => handleOpen(false)}>
                  ยกเลิก
                </Button>
                <Button
                  type="button"
                  onClick={() => openPreview("confirm")}
                  disabled={send.isPending}
                >
                  ส่งใบเสนอราคา
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {previewMode === "confirm" ? "เช็คพรีวิวก่อนส่ง" : "พรีวิวใบเสนอราคา"}
            </DialogTitle>
            <DialogDescription>
              {previewMode === "confirm"
                ? "ตรวจรายละเอียดให้ครบ แล้วกดยืนยันเพื่อส่งให้ลูกค้าในแชท"
                : "เอกสารที่จะส่งให้ลูกค้าในแชท"}
            </DialogDescription>
          </DialogHeader>
          <div className="mx-auto w-full max-w-2xl space-y-3">
            <ChatOfferPreview offer={previewOffer} />
            {internalNotes.trim() ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground inline-flex items-center gap-1.5">
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  หมายเหตุภายใน (ไม่โชว์ลูกค้า)
                </p>
                <p className="text-sm whitespace-pre-wrap">{internalNotes.trim()}</p>
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
                <Button type="button" onClick={() => void confirmSend()} disabled={send.isPending}>
                  {send.isPending ? "กำลังส่ง..." : "ยืนยันส่ง"}
                </Button>
              </>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setPreviewOpen(false)}>
                ปิด
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
