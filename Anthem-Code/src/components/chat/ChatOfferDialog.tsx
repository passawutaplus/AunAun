import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Building2, Check, ChevronDown, Eye, EyeOff, FileText, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Accordion } from "@/components/ui/accordion";
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
import { billingToParty } from "@/lib/billingProfile";
import { mergeBillingWithKyc } from "@/lib/billingFromKyc";
import { isKycExpired, resolveKycExpiresAt } from "@/lib/kycIdentity";
import { allocateDocNumber } from "@/lib/documents/numbering";
import {
  DEPOSIT_PRESETS,
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
import { todayOfferDateYmd, newMilestoneId, OfferFieldError, OFFER_FIELD_ORDER, OfferSectionId, DEFAULT_OPEN_SECTIONS, SECTION_FOR_FIELD, OFFER_NOTE_CHIPS_FREE, OFFER_NOTE_CHIPS_PAID, OfferDraft, offerDraftKey, initialOfferMilestones, fieldErrorClass, profileToBillingFields, IssuerField, OfferUnitPriceInput } from "@/components/chat/offer/offerDialogHelpers";
import { OfferSection, formatOfferShortDate } from "@/components/chat/offer/OfferSection";
import { useT } from "@/lib/i18n";
import { CHAT_HIRE } from "@/lib/i18n/chatHire";

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
  const tHire = useT(CHAT_HIRE);
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
      title: title.trim() || tHire("jobTitle"),
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
    tHire,
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
        toast(tHire("draftKept"), { description: tHire("draftKeptDesc") });
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
      errors.title = tHire("errTitle");
    }
    if (named.length === 0) {
      errors.items = tHire("errItemsMin");
    } else if (itemsTotal <= 0) {
      errors.items = tHire("errItemsTotal");
    } else if (netTotal <= 0) {
      errors.items = tHire("errDiscount");
    }
    if (!endDate) {
      errors.endDate = tHire("errEndDate");
    } else if (endDate < effectiveStartDate) {
      errors.endBeforeStart = tHire("errEndBeforeStart");
    }
    if (!paid) {
      const sum = planPercentTotal(paymentPlan);
      if (sum !== 100) errors.plan = tHire("errPlanSum", { sum });
      else if (paymentPlan.some((p) => p.percent <= 0)) errors.plan = tHire("errPlanZero");
    }
    if (clientType === "corporate") {
      if (!companyName.trim()) {
        errors.companyName = tHire("errCompany");
      }
      if (taxId.trim() && !isValidThaiTaxId(taxId)) {
        errors.taxId = tHire("errTaxId");
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
        toast.warning(tHire("quoteSentNotRecorded"), {
          description: tHire("quoteSentNotRecordedDesc"),
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
      toast.success(tHire("quoteSent"));
      void trackProductEvent("proposal_send", { conversation_id: conversationId }, { debounceMs: 0 });
      clearDraft();
      setPreviewOpen(false);
      setPreviewMode("view");
      reset();
      setRestoredDraft(false);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tHire("sendFailed"));
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
      ? `${companyName.trim()} · ${tHire("corporate")}`
      : clientName.trim()
    : tHire("clientSummaryEmpty");
  const itemsSummary = itemsDone
    ? `${title.trim()} · ${tHire("itemCount", { n: namedItemCount })}`
    : tHire("itemsSummaryEmpty");
  const timelineSummary = timelineDone
    ? tHire("deliverBy", { date: formatOfferShortDate(endDate) })
    : tHire("timelineSummaryEmpty");
  const noteLines = clientNotes
    .split("\n")
    .map((line) => line.replace(/^•\s*/, "").trim())
    .filter(Boolean);
  const notesSummary = noteLines.length
    ? `${noteLines[0]}${noteLines.length > 1 ? ` +${noteLines.length - 1}` : ""}`
    : tHire("notesSummaryEmpty");
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
    ? tHire("planIncomplete", { total: planTotal })
    : paymentPlan.length === 1
      ? tHire("payOnce")
      : `${tHire("installmentCount", { n: paymentPlan.length })} · ${paymentPlan.map((p) => `${p.percent}%`).join(" / ")}`;
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
              {tHire("createQuote")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {paid
                ? tHire("createQuoteDescPaid")
                : tHire("createQuoteDescFree")}
              {restoredDraft ? (
                <>
                  {" · "}
                  <span className="text-foreground">{tHire("continuedDraft")}</span>{" "}
                  <button
                    type="button"
                    onClick={discardDraft}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {tHire("startOver")}
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
                    <span className="text-muted-foreground">{tHire("issuedBy")} </span>
                    <span className="font-medium">{issuerName || tHire("noNameYet")}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {issuerParty.type === "corporate" ? tHire("corporate") : tHire("individual")}
                    </span>
                  </p>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-primary hover:underline"
                    >
                      {issuerOpen ? tHire("hide") : tHire("viewInfo")}
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
                      {tHire("issuerIncomplete")}{" "}
                      <Link
                        to={issuerSettingsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline underline-offset-2"
                      >
                        {tHire("fillIn")}
                      </Link>
                    </span>
                  </p>
                ) : null}
                <CollapsibleContent className="border-t border-border px-3 py-3">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {issuerParty.type === "corporate" ? (
                      <>
                        <IssuerField label={tHire("companyNameLabel")} value={issuerParty.companyName} />
                        <IssuerField label={tHire("authorizedName")} value={issuerParty.name} />
                        <IssuerField label={tHire("branch")} value={issuerParty.branch} />
                        <IssuerField label={tHire("taxId")} value={issuerParty.taxId} />
                        <IssuerField label={tHire("contactPerson")} value={issuerParty.contactPerson} />
                        <IssuerField label={tHire("position")} value={issuerParty.contactRole} />
                      </>
                    ) : (
                      <>
                        <IssuerField label={tHire("fullName")} value={issuerParty.name} />
                        <IssuerField label={tHire("taxId")} value={issuerParty.taxId} />
                      </>
                    )}
                    <IssuerField label={tHire("email")} value={issuerParty.email} />
                    <IssuerField label={tHire("phoneShort")} value={issuerParty.phone} />
                    <div className="sm:col-span-2">
                      <IssuerField label={tHire("address")} value={issuerParty.address} />
                    </div>
                    {issuerParty.type === "corporate" ? (
                      <IssuerField
                        label={tHire("vatRegistered")}
                        value={issuerParty.vatRegistered ? tHire("yes") : tHire("no")}
                      />
                    ) : null}
                  </div>
                  <Link
                    to={issuerSettingsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs text-primary hover:underline"
                  >
                    {tHire("editIssuer")}
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
                  title={tHire("client")}
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
                    aria-label={tHire("clientType")}
                  >
                    <ToggleGroupItem
                      value="individual"
                      className="min-h-9 flex-1 rounded-full px-3 text-sm data-[state=on]:bg-muted data-[state=on]:text-foreground"
                    >
                      {tHire("individual")}
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="corporate"
                      className="min-h-9 flex-1 rounded-full px-3 text-sm data-[state=on]:bg-muted data-[state=on]:text-foreground"
                    >
                      {tHire("corporate")}
                    </ToggleGroupItem>
                  </ToggleGroup>

                  {clientType === "individual" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="offer-client">{tHire("clientName")}</Label>
                        <Input
                          id="offer-client"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder={tHire("fullName")}
                          autoComplete="off"
                          maxLength={80}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="offer-client-email">{tHire("email")}</Label>
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
                        <Label htmlFor="offer-client-phone">{tHire("phone")}</Label>
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
                          {tHire("address")} <span className="font-normal text-muted-foreground">{tHire("optionalParen")}</span>
                        </Label>
                        <Textarea
                          id="offer-client-address"
                          value={clientAddress}
                          onChange={(e) => setClientAddress(e.target.value)}
                          placeholder={tHire("addressForDocs")}
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
                          {tHire("companyNameLabel")} <span className="text-brand">*</span>
                        </Label>
                        <Input
                          id="offer-company"
                          value={companyName}
                          onChange={(e) => {
                            setCompanyName(e.target.value);
                            clearFieldError("companyName");
                          }}
                          placeholder={tHire("companyNamePlaceholder")}
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
                          {tHire("taxId13")}{" "}
                          <span className="font-normal text-muted-foreground">{tHire("optionalParen")}</span>
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
                        <Label htmlFor="offer-corp-address">{tHire("address")}</Label>
                        <Textarea
                          id="offer-corp-address"
                          value={corpAddress}
                          onChange={(e) => setCorpAddress(e.target.value)}
                          placeholder={tHire("addressPerCert")}
                          rows={2}
                          maxLength={300}
                          className="resize-none text-base sm:text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="offer-contact-person">{tHire("contactPerson")}</Label>
                        <Input
                          id="offer-contact-person"
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          placeholder={tHire("contactNamePlaceholder")}
                          autoComplete="off"
                          maxLength={80}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="offer-contact-role">{tHire("position")}</Label>
                        <Input
                          id="offer-contact-role"
                          value={contactRole}
                          onChange={(e) => setContactRole(e.target.value)}
                          placeholder={tHire("positionPlaceholder")}
                          autoComplete="off"
                          maxLength={80}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="offer-corp-phone">{tHire("phone")}</Label>
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
                        <Label htmlFor="offer-corp-email">{tHire("email")}</Label>
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
                  title={tHire("jobAndPrice")}
                  summary={itemsSummary}
                  done={itemsDone}
                >
                  <div className="space-y-1.5" ref={setFieldRef("title")}>
                    <Label htmlFor="offer-title">
                      {tHire("jobTitle")} <span className="text-brand">*</span>
                    </Label>
                    <Input
                      id="offer-title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        clearFieldError("title");
                      }}
                      placeholder={tHire("jobTitlePlaceholder")}
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
                        {tHire("items")} <span className="text-brand">*</span>
                      </Label>
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{tHire("currency")}</span>
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
                        <span>{tHire("description")}</span>
                        <span className="text-center">{tHire("quantity")}</span>
                        <span className="text-right">
                          {tHire("pricePerUnit")}
                          {displayCurrency !== "THB" ? ` (${currencySymbol(displayCurrency)})` : ""}
                        </span>
                        <span className="text-right">{tHire("lineTotal")}</span>
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
                                  placeholder={idx === 0 ? tHire("itemPlaceholderFirst") : tHire("itemNamePlaceholder")}
                                  aria-label={tHire("itemNameAria", { n: idx + 1 })}
                                  autoComplete="off"
                                  maxLength={120}
                                  className="h-10 min-w-0 flex-1 font-medium sm:h-8 sm:text-sm"
                                />
                                <button
                                  type="button"
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30 sm:hidden"
                                  aria-label={tHire("removeItemAria", { n: idx + 1 })}
                                  disabled={items.length <= 1}
                                  onClick={removeItem}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <Input
                                value={it.description || ""}
                                onChange={(e) => updateItem(it.id, { description: e.target.value })}
                                placeholder={tHire("itemDetailPlaceholder")}
                                aria-label={tHire("itemDetailAria", { n: idx + 1 })}
                                autoComplete="off"
                                maxLength={300}
                                className="h-10 min-w-0 text-muted-foreground sm:col-span-4 sm:col-start-2 sm:row-start-2 sm:h-8 sm:text-xs"
                              />
                              <div className="grid grid-cols-2 gap-2 sm:contents">
                                <label className="space-y-1 sm:contents">
                                  <span className="text-xs text-muted-foreground sm:hidden">{tHire("quantity")}</span>
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
                                    aria-label={tHire("itemQtyAria", { n: idx + 1 })}
                                    className="h-10 text-center tabular-nums sm:h-8 sm:text-sm"
                                  />
                                </label>
                                <label className="space-y-1 sm:contents">
                                  <span className="text-xs text-muted-foreground sm:hidden">
                                    {tHire("pricePerUnit")}
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
                                <span className="text-xs text-muted-foreground sm:hidden">{tHire("lineTotal")}</span>
                                <p className="text-sm font-semibold tabular-nums">{moneyLabel(rowTotal)}</p>
                              </div>
                              <button
                                type="button"
                                className="hidden h-8 w-8 items-center justify-center justify-self-end rounded-full text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30 sm:flex"
                                aria-label={tHire("removeItemAria", { n: idx + 1 })}
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
                          <Plus className="mr-1 h-4 w-4" /> {tHire("addItem")}
                        </Button>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">{tHire("itemsSubtotal")}</span>
                            <span className="tabular-nums">{moneyLabel(itemsTotal)}</span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <Label htmlFor="offer-discount" className="font-normal text-muted-foreground">
                              {tHire("discount")}
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
                                aria-label={tHire("discountUnit")}
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
                                  aria-label={tHire("discountAmountAria", { symbol: currencySymbol(displayCurrency) })}
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
                                  aria-label={tHire("discountPercentAria")}
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
                                <span className="text-muted-foreground">{tHire("subtotalBeforeTax")}</span>
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
                                      {tHire("wht3")}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      {tHire("whtHint")}
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
                            <span className="text-sm font-semibold">{tHire("grandTotal")}</span>
                            <span className="text-base font-semibold tabular-nums">
                              {moneyLabel(grandTotal)}
                            </span>
                          </div>
                          {paid && depositAmount > 0 ? (
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-muted-foreground">
                                {tHire("depositDue", { pct: effectiveDepositPercent })}
                              </span>
                              <span className="tabular-nums">{moneyLabel(depositAmount)}</span>
                            </div>
                          ) : null}
                          {displayCurrency !== "THB" ? (
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {tHire("fxHint", { symbol: currencySymbol(displayCurrency) })}
                              {fx?.asOf && fx.asOf !== "fallback" ? ` · ${tHire("rateAsOf", { date: fx.asOf })}` : ""}
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
                      <Label>{tHire("paymentMode")}</Label>
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
                            {tHire("fullAmount")}
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="deposit"
                            className="min-h-9 rounded-full px-3 text-sm data-[state=on]:bg-muted data-[state=on]:text-foreground"
                          >
                            {tHire("depositPercentOption")}
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
                              {tHire("orCustom")}
                            </span>
                            <Input
                              className={cn(
                                "h-9 w-16 shrink-0 text-center sm:text-sm",
                                depositPercent !== 50 && depositPercent !== 100
                                  ? "border-primary ring-1 ring-primary/30"
                                  : "",
                              )}
                              inputMode="numeric"
                              aria-label={tHire("customDepositAria")}
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
                  title={paid ? tHire("timelineSectionPaid") : tHire("timelineSectionFree")}
                  summary={timelineSummary}
                  done={timelineDone}
                >
                  <ol className="space-y-3">
                    {milestones.map((m, i) => {
                      const isFirst = i === 0;
                      const isLast = i === lastMilestoneIdx;
                      const role = isFirst ? tHire("roleStart") : isLast ? tHire("roleDelivery") : tHire("roleStep", { n: i + 1 });
                      const endError = isLast
                        ? fieldErrors.endDate ||
                          fieldErrors.endBeforeStart ||
                          (endDate && endDate < effectiveStartDate
                            ? tHire("errEndBeforeStart")
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
                                aria-label={tHire("stepNameAria", { role })}
                                placeholder={paid ? tHire("installmentNamePlaceholder") : tHire("stepNamePlaceholder")}
                                autoComplete="off"
                                maxLength={80}
                                className="min-w-0 flex-1 sm:h-9 sm:text-sm"
                              />
                                {!isFirst && !isLast ? (
                                  <button
                                    type="button"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive sm:hidden"
                                    aria-label={tHire("removeStepAria", { role })}
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
                                  aria-label={tHire("stepDateAria", { role })}
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
                                  aria-label={tHire("removeStepAria", { role })}
                                  onClick={() => removeMilestone(m.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <span className="hidden w-9 sm:block" aria-hidden />
                              )}
                            </div>
                            {isFirst && !m.date ? (
                              <p className="text-xs text-muted-foreground">{tHire("noDateStartsToday")}</p>
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
                      <Plus className="mr-1 h-4 w-4" /> {paid ? tHire("addInstallment") : tHire("addStep")}
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
                        {tHire("showAllSteps")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {tHire("showAllStepsHint")}
                      </p>
                    </div>
                  </div>
                </OfferSection>

                {/* 4 · Payment plan (free launch — parties pay each other directly) */}
                {!paid ? (
                  <OfferSection
                    value="payment"
                    step={4}
                    title={tHire("payment")}
                    summary={paymentSummary}
                    done={paymentDone}
                  >
                    <div className="space-y-2" ref={setFieldRef("plan")}>
                      <p className="text-xs text-muted-foreground">
                        {tHire("planHint")}
                      </p>
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label={tHire("planPresetsAria")}>
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
                          {tHire("custom")}
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
                                  aria-label={tHire("installmentNameAria", { n: i + 1 })}
                                  placeholder={tHire("installmentNameExample")}
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
                                    aria-label={tHire("installmentPercentAria", { n: i + 1 })}
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
                                    aria-label={tHire("removeInstallmentAria", { n: i + 1 })}
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
                                  {tHire("payWhen")}
                                  <select
                                    value={inst.milestoneId || ""}
                                    onChange={(e) =>
                                      updateInstallment(inst.id, { milestoneId: e.target.value || null })
                                    }
                                    className="h-9 min-w-0 max-w-[12rem] rounded-full border border-input bg-card px-3 text-sm text-foreground"
                                  >
                                    <option value="">{tHire("notSpecified")}</option>
                                    {milestones.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.label || tHire("stepFallback")}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <p className="text-sm font-semibold tabular-nums">
                                  {amounts ? moneyLabel(amounts.net) : moneyLabel(0)}
                                  {amounts && amounts.wht > 0 ? (
                                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                                      {tHire("afterWhtShort")}
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
                            <Plus className="mr-1 h-4 w-4" /> {tHire("addInstallment")}
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
                          {tHire("planTotalLabel", { total: planTotal })}{planTotal === 100 ? " ✓" : ` · ${tHire("planShort", { n: 100 - planTotal })}`}
                        </p>
                      </div>
                      {fieldErrors.plan ? (
                        <p className="text-xs text-destructive" role="alert">
                          {fieldErrors.plan}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="offer-valid-until">{tHire("validUntil")}</Label>
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
                  title={tHire("notes")}
                  summary={notesSummary}
                  done={!!clientNotes.trim()}
                  optional
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-client-notes" className="inline-flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-primary" aria-hidden />
                      {tHire("clientTerms")}
                    </Label>
                    <div className="flex flex-wrap gap-1.5" aria-label={tHire("commonTermsAria")}>
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
                      placeholder={tHire("clientTermsPlaceholder")}
                      rows={3}
                      maxLength={800}
                      className="resize-none text-base sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 rounded-xl border border-dashed border-border/80 bg-muted/20 p-3">
                    <Label htmlFor="offer-internal-notes" className="inline-flex items-center gap-1.5">
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      {tHire("privateNote")}
                    </Label>
                    <p className="text-xs text-muted-foreground">{tHire("privateNoteHint")}</p>
                    <Textarea
                      id="offer-internal-notes"
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder={tHire("privateNotePlaceholder")}
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
              aria-label={tHire("previewQuote")}
            >
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                {tHire("previewAsClient")}
              </p>
              <ChatOfferPreview offer={previewOffer} draft />
            </aside>
          </div>

          {/* Sticky summary + actions */}
          <div className="border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="truncate text-xs text-muted-foreground">
                  {whtAmount > 0 ? tHire("grandTotalAfterWht") : tHire("grandTotal")}
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
                aria-label={tHire("previewQuote")}
              >
                <Eye className="h-4 w-4 sm:mr-1.5" aria-hidden />
                <span className="hidden sm:inline">{tHire("preview")}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="hidden h-11 sm:inline-flex"
                onClick={() => handleOpen(false)}
              >
                {tHire("close")}
              </Button>
              <Button
                type="button"
                className="h-11 shrink-0"
                onClick={() => openPreview("confirm")}
                disabled={send.isPending}
              >
                {tHire("reviewAndSend")}
              </Button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {paid ? (
                <>
                  {tHire("sendingMeansAccept")}{" "}
                  <Link
                    to="/legal/payment-refund"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {tHire("paymentPolicyShort")}
                  </Link>{" "}
                  {tHire("and")}{" "}
                  <Link
                    to="/legal/service-agreement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {tHire("serviceAgreementShort")}
                  </Link>
                </>
              ) : (
                tHire("freeLaunchNote")
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-3xl">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>
              {previewMode === "confirm" ? tHire("checkBeforeSend") : tHire("previewQuote")}
            </DialogTitle>
            <DialogDescription>
              {previewMode === "confirm"
                ? tHire("confirmSendDesc")
                : tHire("previewDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="mx-auto w-full max-w-2xl space-y-3" ref={previewPaperRef}>
            <ChatOfferPreview offer={previewOffer} draft />
            {internalNotes.trim() ? (
              <div className="space-y-1 rounded-xl border border-dashed border-border bg-muted/30 p-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  {tHire("privateNoteHidden")}
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
                  {tHire("backToEditShort")}
                </Button>
                <Button
                  type="button"
                  onClick={() => void confirmSend()}
                  disabled={send.isPending || allocatingNumber}
                >
                  {send.isPending || allocatingNumber ? tHire("sending") : tHire("sendInChat")}
                </Button>
              </>
            ) : (
              <>
                <PrintButton
                  targetRef={previewPaperRef}
                  docNumber={tHire("draft")}
                  title={title}
                  size="default"
                />
                <Button type="button" variant="secondary" onClick={() => setPreviewOpen(false)}>
                  {tHire("backToEdit")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

