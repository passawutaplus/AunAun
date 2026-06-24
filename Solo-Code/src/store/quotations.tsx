import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/auth/AuthProvider";
import type { IssuerSnapshot, QuotationKind } from "@/lib/quotationKinds";

export type QuotationStatus =
  | "draft"
  | "pending_approval"
  | "pending_payment"
  | "pending_receipt"
  | "completed"
  | "rejected"
  | "expired";

export interface QuotationItem {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  quantity: number;
}

export interface QuotationAddon {
  id: string;
  label: string;
  percent: number;
  enabled: boolean;
}

export interface QuotationDifficulty {
  id: string;
  label: string;
  percent: number;
  enabled: boolean;
}

export interface QuotationMilestone {
  id: string;
  label: string;
  description?: string;
  percent: number;
  date?: string;
  done?: boolean;
}

export type DepositPreset = 30 | 50 | 70 | 100;

export type SignatureMode = "none" | "embedded" | "online" | "wet";
export type ClientSignMethod = "draw" | "full_document";

export interface Quotation {
  id: string;
  number: string;
  projectName: string;
  clientName: string;
  clientPhone?: string;
  clientLineId?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientTaxId?: string;
  startDate?: string;
  endDate?: string;
  depositDueDate?: string;
  items: QuotationItem[];
  addons: QuotationAddon[];
  difficulties: QuotationDifficulty[];
  milestones: QuotationMilestone[];
  hiddenCost: number;
  discountValue: number;
  discountKind: "percent" | "amount";
  vatEnabled: boolean;
  vatRate: number;
  whtEnabled: boolean;
  whtRate: number;
  depositPreset: DepositPreset;
  paymentTerms: string;
  notes: string;
  status: QuotationStatus;
  hourlyDays: number;
  hourlyHours: number;
  revisionsCount: number;
  pdfExportedAt?: string;
  invoiceNumber?: string;
  invoiceIssuedAt?: string;
  receiptNumber?: string;
  receiptIssuedAt?: string;
  paidAt?: string;
  dueDate?: string;
  lateFeePercent: number;
  paidPartial: number;
  lastFollowupAt?: string;
  briefId?: string;
  contractSignedAt?: string;
  contractAccepted?: boolean;
  contractSignerIp?: string;
  usageRightsId?: string;
  licenseCertificatePath?: string;
  timelineEnabled: boolean;
  headerImageUrl?: string;
  quotationKind?: QuotationKind;
  orgId?: string;
  orgSnapshot?: IssuerSnapshot | null;
  studioId?: string;
  studioSnapshot?: IssuerSnapshot | null;
  inhouseWorkspaceId?: string;
  ownerUserId?: string;
  signatureMode?: SignatureMode;
  includeFreelancerSignature?: boolean;
  signShareToken?: string;
  clientSignerName?: string;
  clientSignatureUrl?: string;
  clientSignedAt?: string;
  clientSignMethod?: ClientSignMethod;
  clientSignerIp?: string;
  clientSignerUserAgent?: string;
  signedDocumentUrl?: string;
  signatureConsentVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocKind = "quotation" | "invoice" | "receipt";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ===== DB row mapping =====
interface QuotationRow {
  id: string;
  user_id: string;
  number: string;
  project_name: string;
  client_name: string;
  client_phone: string | null;
  client_line_id: string | null;
  client_email: string | null;
  client_address: string | null;
  client_tax_id: string | null;
  start_date: string | null;
  end_date: string | null;
  deposit_due_date?: string | null;
  items: unknown;
  addons: unknown;
  difficulties: unknown;
  milestones: unknown;
  hidden_cost: number;
  discount_value: number;
  discount_kind: string;
  vat_enabled: boolean;
  vat_rate: number;
  wht_enabled: boolean;
  wht_rate: number;
  deposit_preset: number;
  payment_terms: string;
  notes: string;
  status: string;
  hourly_days: number;
  hourly_hours: number;
  revisions_count: number;
  pdf_exported_at: string | null;
  invoice_number: string | null;
  invoice_issued_at: string | null;
  receipt_number: string | null;
  receipt_issued_at: string | null;
  paid_at: string | null;
  due_date: string | null;
  late_fee_percent: number;
  paid_partial: number;
  last_followup_at: string | null;
  brief_id: string | null;
  contract_signed_at?: string | null;
  contract_accepted?: boolean;
  contract_signer_ip?: string | null;
  usage_rights_id?: string | null;
  license_certificate_path?: string | null;
  created_at: string;
  updated_at: string;
  quotation_kind?: string;
  org_id?: string | null;
  org_snapshot?: unknown;
  studio_id?: string | null;
  studio_snapshot?: unknown;
  inhouse_workspace_id?: string | null;
  signature_mode?: string;
  include_freelancer_signature?: boolean;
  sign_share_token?: string | null;
  client_signer_name?: string | null;
  client_signature_url?: string | null;
  client_signed_at?: string | null;
  client_sign_method?: string | null;
  client_signer_ip?: string | null;
  client_signer_user_agent?: string | null;
  signed_document_url?: string | null;
  signature_consent_version?: string | null;
}

export function rowToQuotation(r: QuotationRow): Quotation {
  return {
    id: r.id,
    number: r.number,
    projectName: r.project_name,
    clientName: r.client_name,
    clientPhone: r.client_phone ?? "",
    clientLineId: r.client_line_id ?? "",
    clientEmail: r.client_email ?? "",
    clientAddress: r.client_address ?? "",
    clientTaxId: r.client_tax_id ?? "",
    startDate: r.start_date ?? undefined,
    endDate: r.end_date ?? undefined,
    depositDueDate:
      (r as QuotationRow & { deposit_due_date?: string | null }).deposit_due_date ?? undefined,
    items: (Array.isArray(r.items) ? r.items : []) as QuotationItem[],
    addons: (Array.isArray(r.addons) ? r.addons : []) as QuotationAddon[],
    difficulties: (Array.isArray(r.difficulties) ? r.difficulties : []) as QuotationDifficulty[],
    milestones: (Array.isArray(r.milestones) ? r.milestones : []) as QuotationMilestone[],
    hiddenCost: Number(r.hidden_cost) || 0,
    discountValue: Number(r.discount_value) || 0,
    discountKind: (r.discount_kind as Quotation["discountKind"]) || "percent",
    vatEnabled: !!r.vat_enabled,
    vatRate: Number(r.vat_rate) || 7,
    whtEnabled: !!r.wht_enabled,
    whtRate: Number(r.wht_rate) || 3,
    depositPreset: (Number(r.deposit_preset) as DepositPreset) || 50,
    paymentTerms: r.payment_terms ?? "",
    notes: r.notes ?? "",
    status: (r.status as QuotationStatus) || "draft",
    hourlyDays: Number(r.hourly_days) || 0,
    hourlyHours: Number(r.hourly_hours) || 0,
    revisionsCount: Number(r.revisions_count) || 0,
    pdfExportedAt: r.pdf_exported_at ?? undefined,
    invoiceNumber: r.invoice_number ?? undefined,
    invoiceIssuedAt: r.invoice_issued_at ?? undefined,
    receiptNumber: r.receipt_number ?? undefined,
    receiptIssuedAt: r.receipt_issued_at ?? undefined,
    paidAt: r.paid_at ?? undefined,
    dueDate: r.due_date ?? undefined,
    lateFeePercent: Number(r.late_fee_percent) || 0,
    paidPartial: Number(r.paid_partial) || 0,
    lastFollowupAt: r.last_followup_at ?? undefined,
    briefId: r.brief_id ?? undefined,
    contractSignedAt: r.contract_signed_at ?? undefined,
    contractAccepted: !!r.contract_accepted,
    contractSignerIp: r.contract_signer_ip ?? undefined,
    usageRightsId: r.usage_rights_id ?? undefined,
    licenseCertificatePath: r.license_certificate_path ?? undefined,
    timelineEnabled: (r as unknown as { timeline_enabled?: boolean }).timeline_enabled ?? true,
    headerImageUrl:
      (r as unknown as { header_image_url?: string | null }).header_image_url ?? undefined,
    quotationKind: (r.quotation_kind as QuotationKind) || "solo",
    orgId: r.org_id ?? undefined,
    orgSnapshot: (r.org_snapshot as IssuerSnapshot | null) ?? undefined,
    studioId: r.studio_id ?? undefined,
    studioSnapshot: (r.studio_snapshot as IssuerSnapshot | null) ?? undefined,
    inhouseWorkspaceId: r.inhouse_workspace_id ?? undefined,
    ownerUserId: r.user_id,
    signatureMode: (r.signature_mode as SignatureMode) || "none",
    includeFreelancerSignature: !!r.include_freelancer_signature,
    signShareToken: r.sign_share_token ?? undefined,
    clientSignerName: r.client_signer_name ?? undefined,
    clientSignatureUrl: r.client_signature_url ?? undefined,
    clientSignedAt: r.client_signed_at ?? undefined,
    clientSignMethod: (r.client_sign_method as ClientSignMethod) ?? undefined,
    clientSignerIp: r.client_signer_ip ?? undefined,
    clientSignerUserAgent: r.client_signer_user_agent ?? undefined,
    signedDocumentUrl: r.signed_document_url ?? undefined,
    signatureConsentVersion: r.signature_consent_version ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function quotationToRow(q: Quotation, userId: string) {
  return {
    user_id: userId,
    number: q.number,
    project_name: q.projectName,
    client_name: q.clientName,
    client_phone: q.clientPhone || null,
    client_line_id: q.clientLineId || null,
    client_email: q.clientEmail || null,
    client_address: q.clientAddress || null,
    client_tax_id: q.clientTaxId || null,
    start_date: q.startDate || null,
    end_date: q.endDate || null,
    deposit_due_date: q.depositDueDate || null,
    items: q.items as unknown as never,
    addons: q.addons as unknown as never,
    difficulties: q.difficulties as unknown as never,
    milestones: q.milestones as unknown as never,
    hidden_cost: q.hiddenCost,
    discount_value: q.discountValue,
    discount_kind: q.discountKind,
    vat_enabled: q.vatEnabled,
    vat_rate: q.vatRate,
    wht_enabled: q.whtEnabled,
    wht_rate: q.whtRate,
    deposit_preset: q.depositPreset,
    payment_terms: q.paymentTerms,
    notes: q.notes,
    status: q.status,
    hourly_days: q.hourlyDays,
    hourly_hours: q.hourlyHours,
    revisions_count: q.revisionsCount,
    pdf_exported_at: q.pdfExportedAt ?? null,
    invoice_number: q.invoiceNumber ?? null,
    invoice_issued_at: q.invoiceIssuedAt ?? null,
    receipt_number: q.receiptNumber ?? null,
    receipt_issued_at: q.receiptIssuedAt ?? null,
    paid_at: q.paidAt ?? null,
    due_date: q.dueDate ?? null,
    late_fee_percent: q.lateFeePercent ?? 0,
    paid_partial: q.paidPartial ?? 0,
    brief_id: q.briefId ?? null,
    timeline_enabled: q.timelineEnabled,
    quotation_kind: q.quotationKind ?? "solo",
    org_id: q.orgId ?? null,
    org_snapshot: q.orgSnapshot ?? null,
    studio_id: q.studioId ?? null,
    studio_snapshot: q.studioSnapshot ?? null,
    inhouse_workspace_id: q.inhouseWorkspaceId ?? null,
    signature_mode: q.signatureMode ?? "none",
    include_freelancer_signature: !!q.includeFreelancerSignature,
    sign_share_token: q.signShareToken ?? null,
    client_signer_name: q.clientSignerName ?? null,
    client_signature_url: q.clientSignatureUrl ?? null,
    client_signed_at: q.clientSignedAt ?? null,
    client_sign_method: q.clientSignMethod ?? null,
    client_signer_ip: q.clientSignerIp ?? null,
    client_signer_user_agent: q.clientSignerUserAgent ?? null,
    signed_document_url: q.signedDocumentUrl ?? null,
    signature_consent_version: q.signatureConsentVersion ?? null,
  };
}

export function makeBlankQuotation(num: string): Quotation {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: uid(),
    number: num,
    projectName: "",
    clientName: "",
    clientPhone: "",
    clientLineId: "",
    clientEmail: "",
    clientAddress: "",
    clientTaxId: "",
    startDate: today,
    endDate: today,
    items: [],
    addons: [
      { id: uid(), label: "ไฟล์ต้นฉบับ", percent: 20, enabled: false },
      { id: uid(), label: "สิทธิ์เชิงพาณิชย์", percent: 30, enabled: false },
      { id: uid(), label: "งานด่วน", percent: 25, enabled: false },
    ],
    difficulties: [
      {
        id: "diff-communication",
        label: "ลูกค้าสื่อสารยาก / เปลี่ยนใจบ่อย",
        percent: 15,
        enabled: false,
      },
      { id: "diff-rush", label: "งานเร่งด่วน (ภายใน 7 วัน)", percent: 20, enabled: false },
      { id: "diff-scope", label: "ขอบเขตงานคลุมเครือ ต้องตีโจทย์เอง", percent: 10, enabled: false },
      { id: "diff-revisions", label: "คาดว่าต้องแก้ไขหลายรอบ", percent: 10, enabled: false },
    ],
    milestones: [
      { id: uid(), label: "มัดจำ / เริ่มงาน", description: "มัดจำ 50%", percent: 50, date: today },
      { id: uid(), label: "ส่งร่างเบื้องต้น", description: "การสำรวจหลักการ", percent: 0 },
      { id: uid(), label: "ส่งมอบสุดท้าย", description: "ชำระเต็มจำนวน", percent: 50, date: today },
    ],
    hiddenCost: 0,
    discountValue: 0,
    discountKind: "percent",
    vatEnabled: false,
    vatRate: 7,
    whtEnabled: true,
    whtRate: 3,
    depositPreset: 50,
    paymentTerms: "ชำระมัดจำก่อนเริ่มงาน",
    notes: "",
    status: "draft",
    hourlyDays: 0,
    hourlyHours: 0,
    revisionsCount: 2,
    lateFeePercent: 0,
    paidPartial: 0,
    timelineEnabled: true,
    quotationKind: "solo",
    signatureMode: "none",
    includeFreelancerSignature: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function quotationsKey(userId: string | null) {
  return ["quotations", userId] as const;
}

function nextNumberFromList(
  list: Quotation[],
  prefix: string,
  getter: (q: Quotation) => string | undefined,
) {
  const year = new Date().getFullYear();
  const full = `${prefix}-${year}-`;
  const nums = list
    .map(getter)
    .filter((n): n is string => !!n && n.startsWith(full))
    .map((n) => parseInt(n.slice(full.length), 10) || 0);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${full}${String(next).padStart(3, "0")}`;
}

// ===== Hook =====
export function useQuotations() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: quotationsKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => rowToQuotation(r as QuotationRow));
    },
  });

  const list = query.data ?? [];

  const get = React.useCallback((id: string) => list.find((q) => q.id === id), [list]);

  const nextNumber = React.useCallback(
    () => nextNumberFromList(list, "QT", (q) => q.number),
    [list],
  );

  const createMutation = useMutation({
    mutationFn: async (init?: Partial<Quotation>) => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const blank = makeBlankQuotation(
        init?.number ?? nextNumberFromList(list, "QT", (q) => q.number),
      );
      const draft: Quotation = { ...blank, ...init, number: init?.number ?? blank.number };
      const { data, error } = await supabase
        .from("quotations")
        .insert(quotationToRow(draft, userId) as never)
        .select()
        .single();
      if (error) throw error;
      return rowToQuotation(data as QuotationRow);
    },
    onSuccess: (newQ) => {
      qc.setQueryData<Quotation[]>(quotationsKey(userId), (old) => {
        const prev = old ?? [];
        if (prev.some((q) => q.id === newQ.id)) return prev;
        return [newQ, ...prev];
      });
      void qc.invalidateQueries({ queryKey: quotationsKey(userId) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Quotation> }) => {
      const current = list.find((q) => q.id === id);
      if (!current || !userId) return;
      const merged: Quotation = { ...current, ...patch };
      const { error } = await supabase
        .from("quotations")
        .update(quotationToRow(merged, userId) as never)
        .eq("id", id);
      if (error) throw error;
      return merged;
    },
    onSuccess: (merged, { id, patch }) => {
      qc.setQueryData<Quotation[]>(quotationsKey(userId), (old) => {
        const prev = old ?? [];
        return prev.map((q) =>
          q.id === id
            ? { ...q, ...patch, ...(merged ?? {}), updatedAt: new Date().toISOString() }
            : q,
        );
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: quotationsKey(userId) }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const found = list.find((q) => q.id === id);
      if (!found || !userId) return undefined;
      const copy: Quotation = {
        ...found,
        id: uid(),
        number: nextNumberFromList(list, "QT", (q) => q.number),
        status: "draft",
        invoiceNumber: undefined,
        invoiceIssuedAt: undefined,
        receiptNumber: undefined,
        receiptIssuedAt: undefined,
        paidAt: undefined,
        pdfExportedAt: undefined,
        signShareToken: undefined,
        clientSignerName: undefined,
        clientSignatureUrl: undefined,
        clientSignedAt: undefined,
        clientSignMethod: undefined,
        signedDocumentUrl: undefined,
        signatureConsentVersion: undefined,
        signatureMode: "none",
        includeFreelancerSignature: false,
      };
      const { data, error } = await supabase
        .from("quotations")
        .insert(quotationToRow(copy, userId) as never)
        .select()
        .single();
      if (error) throw error;
      return rowToQuotation(data as QuotationRow);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: quotationsKey(userId) }),
  });

  const markPdfExportedMutation = useMutation({
    mutationFn: async (id: string) => {
      const q = list.find((x) => x.id === id);
      if (!q || !userId) return;
      const isFirst = !q.pdfExportedAt;
      const nowIso = new Date().toISOString();
      const shouldAdvance = isFirst && q.status === "draft";
      const { error } = await supabase
        .from("quotations")
        .update({
          pdf_exported_at: q.pdfExportedAt ?? nowIso,
          status: shouldAdvance ? "pending_approval" : q.status,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: quotationsKey(userId) }),
  });

  const advanceStatusMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: QuotationStatus }) => {
      const q = list.find((x) => x.id === id);
      if (!q || !userId) return;
      const nowIso = new Date().toISOString();
      const patch: TablesUpdate<"quotations"> = { status: next };
      if (next === "pending_payment" && !q.invoiceNumber) {
        patch.invoice_number = nextNumberFromList(list, "INV", (x) => x.invoiceNumber);
        patch.invoice_issued_at = nowIso;
      }
      if ((next === "pending_receipt" || next === "completed") && !q.receiptNumber) {
        patch.receipt_number = nextNumberFromList(list, "RC", (x) => x.receiptNumber);
        patch.receipt_issued_at = nowIso;
      }
      if (next === "completed" && !q.paidAt) {
        patch.paid_at = nowIso;
      }
      const { error } = await supabase.from("quotations").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: quotationsKey(userId) }),
  });

  return React.useMemo(
    () => ({
      list,
      isLoading: query.isLoading,
      get,
      nextNumber,
      create: (init?: Partial<Quotation>) => createMutation.mutateAsync(init),
      update: (id: string, patch: Partial<Quotation>) => updateMutation.mutateAsync({ id, patch }),
      remove: (id: string) => removeMutation.mutateAsync(id),
      duplicate: (id: string) => duplicateMutation.mutateAsync(id),
      markPdfExported: (id: string) => markPdfExportedMutation.mutate(id),
      advanceStatus: (id: string, next: QuotationStatus) =>
        advanceStatusMutation.mutate({ id, next }),
      advanceStatusAsync: (id: string, next: QuotationStatus) =>
        advanceStatusMutation.mutateAsync({ id, next }),
    }),
    [
      list,
      query.isLoading,
      get,
      nextNumber,
      createMutation,
      updateMutation,
      removeMutation,
      duplicateMutation,
      markPdfExportedMutation,
      advanceStatusMutation.mutateAsync,
      advanceStatusMutation,
    ],
  );
}

/** Backward-compat shim — providers no longer required. */
export function QuotationsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ────────────────── compute helpers ──────────────────

export interface ComputedTotals {
  itemsSubtotal: number;
  addonAmount: number;
  difficultyAmount: number;
  hiddenCost: number;
  preTaxBeforeDiscount: number;
  discountAmount: number;
  preTax: number;
  vatAmount: number;
  withholdingAmount: number;
  grandTotal: number;
  depositAmount: number;
  hourlyRate: number;
}

// Coerce any value (null/undefined/empty string/NaN) to a finite number, defaulting to 0
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Round to 2 decimal places to avoid floating-point drift on tax/VAT/discount.
 * Uses the standard "round half away from zero" via Number.EPSILON shim.
 */
const round2 = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

export function computeTotals(q: Quotation): ComputedTotals {
  const itemsSubtotal = round2(
    q.items.reduce((s, it) => s + num(it.unitPrice) * num(it.quantity), 0),
  );
  const addonAmount = round2(
    q.addons
      .filter((a) => a.enabled)
      .reduce((s, a) => s + itemsSubtotal * (num(a.percent) / 100), 0),
  );
  const difficultyAmount = round2(
    q.difficulties
      .filter((d) => d.enabled)
      .reduce((s, d) => s + itemsSubtotal * (num(d.percent) / 100), 0),
  );
  const preTaxBeforeDiscount = round2(
    itemsSubtotal + addonAmount + difficultyAmount + num(q.hiddenCost),
  );
  const discountAmount = round2(
    q.discountKind === "percent"
      ? (preTaxBeforeDiscount * num(q.discountValue)) / 100
      : num(q.discountValue),
  );
  const preTax = round2(Math.max(0, preTaxBeforeDiscount - discountAmount));
  const vatAmount = round2(q.vatEnabled ? preTax * (num(q.vatRate) / 100) : 0);
  const withholdingAmount = round2(q.whtEnabled ? preTax * (num(q.whtRate) / 100) : 0);
  const grandTotal = round2(preTax + vatAmount - withholdingAmount);
  const depositAmount = round2(grandTotal * (num(q.depositPreset) / 100));
  const totalHours = num(q.hourlyDays) * 8 + num(q.hourlyHours);
  const hourlyRate = totalHours > 0 ? round2(grandTotal / totalHours) : 0;
  return {
    itemsSubtotal,
    addonAmount,
    difficultyAmount,
    hiddenCost: round2(num(q.hiddenCost)),
    preTaxBeforeDiscount,
    discountAmount,
    preTax,
    vatAmount,
    withholdingAmount,
    grandTotal,
    depositAmount,
    hourlyRate,
  };
}

export function formatBaht(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

/** Labels aligned with Pipeline kanban columns (ภาษาไทย). */
export function statusLabel(s: QuotationStatus): { label: string; tone: string } {
  switch (s) {
    case "draft":
      return { label: "คุย/ร่าง", tone: "bg-slate-100 text-slate-700 border-slate-200" };
    case "pending_approval":
      return { label: "ส่งใบเสนอราคา", tone: "bg-blue-50 text-blue-700 border-blue-200" };
    case "pending_payment":
      return { label: "รอเซ็น/มัดจำ", tone: "bg-amber-50 text-amber-800 border-amber-200" };
    case "pending_receipt":
      return {
        label: "กำลังดำเนินงาน",
        tone: "bg-[#FF5F05]/10 text-[#FF5F05] border-[#FF5F05]/30",
      };
    case "completed":
      return { label: "ปิดงาน", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "rejected":
      return { label: "ปฏิเสธ", tone: "bg-destructive/15 text-destructive" };
    case "expired":
      return { label: "หมดอายุ", tone: "bg-warning/15 text-warning-foreground" };
  }
}

export function computeRevisionDates(start?: string, end?: string, count?: number): string[] {
  if (!start || !end || !count || count <= 0) return [];
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return [];
  const step = (e - s) / (count + 1);
  const dates: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(s + step * i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
