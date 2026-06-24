import * as React from "react";
import type { Quotation, DocKind } from "@/store/quotations";
import { computeTotals, formatBaht, computeRevisionDates } from "@/store/quotations";
import { useAuth } from "@/auth/AuthProvider";
import { useUsageRightsById } from "@/store/legalUsageRights";
import { summarizeUsageRights } from "@/lib/buildCopyrightClauses";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";

import { useSubscription } from "@/hooks/useSubscription";
import {
  docAccentForKind,
  resolveDocumentTheme,
  type DocumentThemeInput,
  type ResolvedDocumentTheme,
} from "@/lib/documentTheme";
import { issuerFromQuotation } from "@/lib/quotationKinds";
import { EsignDisclaimer } from "@/components/legal/EsignDisclaimer";

interface Props {
  q: Quotation;
  docKind?: DocKind; // "quotation" (default) | "invoice" | "receipt"
  /** Override theme (e.g. public portal preview). */
  themeOverride?: ResolvedDocumentTheme;
  /** แสดงส่วนไทม์ไลน์ในเอกสาร — undefined = แสดงเมื่อมีข้อมูลไทม์ไลน์ */
  showTimelineSection?: boolean;
}

// Thai Buddhist year format: 27 เมษายน 2569
const fmtThaiLong = (d?: string | Date) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  const day = date.getDate();
  const month = format(date, "MMMM", { locale: th });
  const year = date.getFullYear() + 543;
  return `${day} ${month} ${year}`;
};

const fmtThaiShort = (d?: string | Date) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  const day = date.getDate();
  const month = format(date, "MMM", { locale: th });
  const year = (date.getFullYear() + 543).toString().slice(-2);
  return `${day} ${month} ${year}`;
};

const DOC_META: Record<DocKind, { label: string; en: string }> = {
  quotation: { label: "ใบเสนอราคา", en: "QUOTATION" },
  invoice: { label: "ใบแจ้งหนี้", en: "INVOICE" },
  receipt: { label: "ใบเสร็จรับเงิน", en: "RECEIPT" },
};

export function PreviewPanel({
  q,
  docKind = "quotation",
  themeOverride,
  showTimelineSection,
}: Props) {
  const { data: usageRights } = useUsageRightsById(q.usageRightsId);
  const { profile } = useAuth();
  const { tier } = useSubscription();
  const issuer = issuerFromQuotation(q);
  const docTheme = React.useMemo(() => {
    if (themeOverride) return themeOverride;
    const themeInput =
      (issuer?.documentTheme as DocumentThemeInput | undefined) ??
      ((profile?.document_theme ?? {}) as DocumentThemeInput);
    const effectiveTier = issuer ? "inhouse" : tier;
    return resolveDocumentTheme(effectiveTier, themeInput);
  }, [themeOverride, issuer, tier, profile?.document_theme]);
  const brandName = issuer?.brandName ?? profile?.brand_name ?? "So1o Freelancer";
  const logoUrl = issuer?.logoUrl ?? profile?.logo_url;
  const tagline = issuer?.tagline ?? profile?.tagline;
  const issuerAddress = issuer?.address ?? profile?.address;
  const issuerPhone = issuer?.phone ?? profile?.phone;
  const issuerEmail = issuer?.email ?? profile?.email;
  const issuerTaxId = issuer?.taxId ?? profile?.tax_id;
  const signatureMode = q.signatureMode ?? "none";
  const showFreelancerSig =
    q.includeFreelancerSignature &&
    (signatureMode === "embedded" || signatureMode === "online") &&
    profile?.signature_url;
  const showClientSigArea = signatureMode === "online" || signatureMode === "wet";
  const { colors } = docTheme;
  void docAccentForKind(colors, docKind);
  const accent = colors.primary;
  const accentSoft = colors.primarySoft;
  const accentBorder = colors.primaryBorder;
  const totals = React.useMemo(() => computeTotals(q), [q]);
  const today = new Date();
  const revisionDates = React.useMemo(
    () => computeRevisionDates(q.startDate, q.endDate, q.revisionsCount),
    [q.startDate, q.endDate, q.revisionsCount],
  );

  // Attached brief reference (title only — used as a small footnote in header)
  const [briefRef, setBriefRef] = React.useState<{ title: string; share_token: string } | null>(
    null,
  );
  React.useEffect(() => {
    if (!q.briefId) {
      setBriefRef(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("design_briefs")
      .select("title,share_token")
      .eq("id", q.briefId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setBriefRef(data ? { title: data.title, share_token: data.share_token } : null);
      });
    return () => {
      cancelled = true;
    };
  }, [q.briefId]);
  const meta = DOC_META[docKind];
  const hasTimelineContent = !!(
    q.startDate ||
    q.endDate ||
    q.milestones.length > 0 ||
    revisionDates.length > 0
  );
  const showTimeline = showTimelineSection !== undefined ? showTimelineSection : hasTimelineContent;
  // Resolve the document number to display (เลขที่เอกสาร) per kind
  const docNumber =
    docKind === "invoice"
      ? q.invoiceNumber || q.number.replace(/^QT-/, "INV-")
      : docKind === "receipt"
        ? q.receiptNumber || q.number.replace(/^QT-/, "RC-")
        : q.number;
  const docDate =
    docKind === "invoice"
      ? q.invoiceIssuedAt
      : docKind === "receipt"
        ? q.receiptIssuedAt || q.paidAt
        : undefined;

  // Build a flat line-item list combining services + enabled add-ons + difficulties + hidden cost
  const lineItems: { name: string; description?: string; amount: number; meta?: string }[] = [];
  q.items.forEach((it) => {
    lineItems.push({
      name: it.name,
      description: it.description,
      amount: (it.unitPrice || 0) * (it.quantity || 0),
      meta: it.quantity > 1 ? `${it.quantity} × ฿${formatBaht(it.unitPrice)}` : undefined,
    });
  });
  q.addons
    .filter((a) => a.enabled)
    .forEach((a) => {
      lineItems.push({
        name: `${a.label} (+${a.percent}%)`,
        amount: totals.itemsSubtotal * (a.percent / 100),
      });
    });
  q.difficulties
    .filter((d) => d.enabled)
    .forEach((d) => {
      lineItems.push({
        name: `${d.label} (+${d.percent}%)`,
        amount: totals.itemsSubtotal * (d.percent / 100),
      });
    });
  if (q.hiddenCost > 0) {
    lineItems.push({ name: "ต้นทุนแฝง", amount: q.hiddenCost });
  }

  return (
    <div
      id="quotation-printable"
      className="bg-white border border-border/60 shadow-soft text-[11px] text-neutral-800 rounded-xl overflow-hidden thai-text"
      style={{
        fontFeatureSettings: "'tnum'",
        lineHeight: 1.6,
        overflowWrap: "break-word",
      }}
    >
      {q.headerImageUrl && (
        <div className="w-full h-28 sm:h-36 overflow-hidden bg-neutral-100">
          <img
            src={q.headerImageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            crossOrigin="anonymous"
          />
        </div>
      )}
      <div className="p-6 space-y-5">
        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-9 mb-2 object-contain"
                loading="lazy"
                decoding="async"
                crossOrigin="anonymous"
              />
            )}
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
              {meta.en}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 leading-tight mt-0.5">
              {meta.label}
            </h1>
            {tagline ? (
              <p className="text-[11px] text-neutral-500 mt-1">{tagline}</p>
            ) : (
              !issuer && <p className="text-[11px] text-neutral-500 mt-1">{brandName}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400">เลขที่</p>
            <p className="text-sm font-semibold num text-neutral-900">{docNumber}</p>
            <p className="text-[11px] text-neutral-500 num pt-1">{fmtThaiLong(docDate || today)}</p>
            {docKind !== "quotation" && (
              <p className="text-[10px] text-neutral-400 num">อ้างอิง {q.number}</p>
            )}
            {docKind === "receipt" && q.paidAt && (
              <p className="text-[10px] text-emerald-600 font-semibold">✓ ชำระเงินแล้ว</p>
            )}
            {briefRef && (
              <p className="text-[10px] text-neutral-500">
                อ้างอิงบรีฟ: <span className="font-medium text-neutral-700">{briefRef.title}</span>
              </p>
            )}
          </div>
        </div>

        <div className="h-px w-full bg-neutral-200" />

        {/* ── FROM / TO ── */}
        <div className="grid grid-cols-2 gap-6 pb-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">จาก / FROM</p>
            <p className="text-sm font-semibold text-neutral-900">{brandName}</p>
            {issuerAddress && (
              <p className="text-[10px] text-neutral-600 leading-snug mt-0.5 whitespace-pre-line">
                {issuerAddress}
              </p>
            )}
            <div className="text-[10px] text-neutral-600 mt-1 space-y-0.5">
              {issuerPhone && <p>โทร {issuerPhone}</p>}
              {issuerEmail && <p>{issuerEmail}</p>}
              {issuerTaxId && <p className="num">เลขผู้เสียภาษี {issuerTaxId}</p>}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
              เรียน / สำหรับ
            </p>
            <p className="text-sm font-semibold text-neutral-900">{q.clientName || "—"}</p>
            {q.clientAddress && (
              <p className="text-[10px] text-neutral-600 leading-snug mt-0.5 whitespace-pre-line">
                {q.clientAddress}
              </p>
            )}
            <div className="text-[10px] text-neutral-600 mt-1 space-y-0.5">
              {q.clientPhone && <p>โทร {q.clientPhone}</p>}
              {q.clientEmail && <p className="truncate">{q.clientEmail}</p>}
              {q.clientTaxId && <p className="num">เลขผู้เสียภาษี {q.clientTaxId}</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200" />

        {/* ── PROJECT / DURATION ── */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">โครงการ</p>
            <p className="text-sm font-medium text-neutral-900">{q.projectName || "—"}</p>
          </div>
          {showTimeline && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
                ระยะเวลา
              </p>
              <p className="text-sm font-medium text-neutral-900 num">
                {fmtThaiShort(q.startDate)} — {fmtThaiShort(q.endDate)}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200" />

        {/* ── ITEMS TABLE ── */}
        <div>
          <div className="grid grid-cols-12 gap-2 pb-2 border-b border-neutral-200">
            <p className="col-span-8 text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
              รายการ
            </p>
            <p className="col-span-4 text-right text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
              จำนวนเงิน
            </p>
          </div>
          {lineItems.length === 0 ? (
            <p className="text-[11px] text-neutral-400 italic py-4 text-center">
              — ยังไม่มีรายการ —
            </p>
          ) : (
            <div>
              {lineItems.map((it, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 py-2.5 border-b border-neutral-100"
                >
                  <div className="col-span-8">
                    <p className="text-[12px] font-medium text-neutral-900 leading-tight">
                      {it.name}
                    </p>
                    {(it.description || it.meta) && (
                      <p className="text-[10px] text-neutral-500 leading-tight mt-0.5 italic">
                        {it.description || it.meta}
                      </p>
                    )}
                  </div>
                  <div className="col-span-4 text-right text-[12px] num font-medium text-neutral-900 self-start">
                    {formatBaht(it.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── TOTALS (right-aligned column) ── */}
        <div className="flex justify-end">
          <div className="w-full max-w-[58%] space-y-1.5">
            <TotalRow
              label="ยอดรวมก่อนภาษี"
              value={`฿${formatBaht(totals.preTaxBeforeDiscount)}`}
            />
            {totals.discountAmount > 0 && (
              <TotalRow
                label={q.discountKind === "percent" ? `ส่วนลด (${q.discountValue}%)` : "ส่วนลด"}
                value={`−฿${formatBaht(totals.discountAmount)}`}
                tone="text-emerald-600"
              />
            )}
            {totals.discountAmount > 0 && (
              <TotalRow label="ยอดหลังหักส่วนลด" value={`฿${formatBaht(totals.preTax)}`} />
            )}
            {q.vatEnabled && (
              <TotalRow label={`VAT ${q.vatRate}%`} value={`฿${formatBaht(totals.vatAmount)}`} />
            )}
            {q.whtEnabled && (
              <TotalRow
                label={`หัก ณ ที่จ่าย ${q.whtRate}%`}
                value={`−฿${formatBaht(totals.withholdingAmount)}`}
                tone="text-emerald-600"
              />
            )}

            {/* Grand total — orange highlighted bar */}
            <div
              className="flex items-center justify-between px-3 py-2 mt-1 rounded"
              style={{ backgroundColor: accentSoft, border: `1px solid ${accentBorder}` }}
            >
              <span className="text-[12px] font-semibold" style={{ color: accent }}>
                รวมทั้งสิ้น
              </span>
              <span className="num font-bold text-[13px]" style={{ color: accent }}>
                ฿{formatBaht(totals.grandTotal)}
              </span>
            </div>

            {/* Deposit */}
            {q.depositPreset < 100 && (
              <div
                className="flex items-center justify-between px-3 py-2 rounded"
                style={{ backgroundColor: accentSoft, border: `1px solid ${accentBorder}` }}
              >
                <span className="text-[12px] font-semibold" style={{ color: accent }}>
                  มัดจำที่ต้องชำระ
                </span>
                <span className="num font-bold text-[13px]" style={{ color: accent }}>
                  ฿{formatBaht(totals.depositAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── PAYMENT TERMS BOX ── */}
        {q.paymentTerms && (
          <div
            className="rounded px-3 py-2"
            style={{ backgroundColor: accentSoft, border: `1px solid ${accentBorder}` }}
          >
            <p className="text-[10px] text-neutral-600">เงื่อนไขการชำระ</p>
            <p className="text-[12px] font-semibold text-neutral-900 mt-0.5">
              {q.paymentTerms}
              {q.depositPreset < 100 && (
                <span className="text-neutral-600 font-normal"> (มัดจำ {q.depositPreset}%)</span>
              )}
              {q.depositDueDate && (
                <span className="text-neutral-600 font-normal block mt-0.5">
                  ครบกำหนดชำระมัดจำ: {fmtThaiShort(q.depositDueDate)}
                </span>
              )}
            </p>
          </div>
        )}

        {/* ── BANK DETAILS ── */}
        {profile?.bank_name && (
          <div className="grid grid-cols-2 gap-6 text-[10px]">
            <div>
              <p className="uppercase tracking-wider text-neutral-400 mb-0.5">โอนเข้าบัญชี</p>
              <p className="text-[12px] font-semibold text-neutral-900">{profile.bank_name}</p>
              {profile.bank_account_name && (
                <p className="text-neutral-600">{profile.bank_account_name}</p>
              )}
              {profile.bank_account_number && (
                <p className="text-neutral-600 num">{profile.bank_account_number}</p>
              )}
            </div>
            {profile?.payment_qr_url && (
              <div className="text-right">
                <img
                  src={profile.payment_qr_url}
                  alt="QR Payment"
                  className="h-20 w-20 ml-auto object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <p className="text-[9px] text-neutral-500 mt-0.5">สแกนเพื่อชำระเงิน</p>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-neutral-200" />

        {/* ── SIGNATURE ── */}
        <div className="grid grid-cols-2 gap-8 pt-3">
          <div>
            <p className="text-[10px] text-neutral-500">เตรียมโดย</p>
            <p className="text-[12px] font-semibold text-neutral-900 mt-0.5">{brandName}</p>
          </div>
          <div />
        </div>
        <div className="grid grid-cols-2 gap-8 pt-2">
          <div className="pt-2 min-h-[72px]">
            <div className="border-t border-neutral-400 pt-1">
              <p className="text-[10px] text-neutral-500">ลงนามลูกค้า</p>
              {showClientSigArea && q.clientSignedAt ? (
                <div className="mt-1">
                  {q.clientSignatureUrl && q.clientSignMethod === "draw" ? (
                    <img
                      src={q.clientSignatureUrl}
                      alt="ลายเซ็นลูกค้า"
                      className="h-12 max-w-[140px] object-contain"
                    />
                  ) : q.signedDocumentUrl ? (
                    <p className="text-[10px] text-neutral-600">เอกสารเซ็นแล้ว (wet sign)</p>
                  ) : null}
                  <p className="text-[11px] font-medium text-neutral-800 mt-1">
                    {q.clientSignerName ?? q.clientName}
                  </p>
                  <p className="text-[9px] text-neutral-500">
                    {fmtThaiShort(q.clientSignedAt)}
                  </p>
                </div>
              ) : showClientSigArea ? (
                <p className="text-[10px] text-neutral-400 mt-4 italic">รอลูกค้าเซ็น</p>
              ) : (
                <div className="h-10 mt-2" />
              )}
            </div>
          </div>
          <div className="pt-2 min-h-[72px]">
            <div className="border-t border-neutral-400 pt-1 text-right">
              <p className="text-[10px] text-neutral-500">ลงนามผู้เสนอราคา</p>
              {showFreelancerSig ? (
                <img
                  src={profile!.signature_url!}
                  alt="ลายเซ็นผู้เสนอราคา"
                  className="h-12 max-w-[140px] object-contain ml-auto mt-1"
                />
              ) : (
                <div className="h-10 mt-2" />
              )}
            </div>
          </div>
        </div>

        {signatureMode !== "none" && (
          <div className="pt-2 print:text-[8px]">
            <EsignDisclaimer variant="tool" className="text-[9px] py-1.5 px-2 border-neutral-200 bg-neutral-50" />
          </div>
        )}

        {/* ── USAGE RIGHTS ── */}
        {usageRights && docKind === "quotation" && (
          <div className="pt-1">
            <p className="text-[11px] font-semibold text-neutral-700 mb-1.5">
              สิทธิการใช้งานและลิขสิทธิ์
            </p>
            <ul className="space-y-1 text-[10.5px] text-neutral-700">
              {summarizeUsageRights(usageRights).map((line) => (
                <li key={line} className="flex items-start gap-1.5">
                  <span className="text-neutral-400 mt-0.5">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── TERMS / NOTES ── */}
        {profile?.terms && (
          <div className="pt-1">
            <p className="text-[11px] font-semibold text-neutral-700 mb-1.5">หมายเหตุและเงื่อนไข</p>
            <ul className="space-y-1 text-[10.5px] text-neutral-700">
              {profile.terms
                .split("\n")
                .filter(Boolean)
                .map((line, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-neutral-400 mt-0.5">•</span>
                    <span>{line.replace(/^[•\-*]\s*/, "")}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* ── TIMELINE / MILESTONES ── */}
        {showTimeline && (q.milestones.length > 0 || revisionDates.length > 0) && (
          <div className="pt-1">
            <p className="text-[11px] font-semibold text-neutral-700 mb-2">ลำดับงานและกำหนดส่ง</p>
            <div className="space-y-2.5">
              {q.milestones.map((m, i) => {
                const isLast = i === q.milestones.length - 1;
                const filled = i === 0 || isLast || m.done;
                return (
                  <div key={m.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center pt-0.5">
                      <div
                        className="h-3 w-3 rounded-full border-2"
                        style={{
                          borderColor: accent,
                          backgroundColor: filled ? accent : "white",
                        }}
                      />
                      {!isLast && (
                        <div
                          className="w-px flex-1 mt-1"
                          style={{
                            minHeight: 14,
                            borderLeft: `1px dashed ${accentBorder}`,
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 flex items-center justify-between border-b border-dotted border-neutral-200 pb-1.5">
                      <span className="text-[12px] text-neutral-800">{m.label}</span>
                      <span className="text-[11px] num text-neutral-500">
                        {m.date ? fmtThaiShort(m.date) : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Revision dates (if any, shown separately as smaller list) */}
            {revisionDates.length > 0 && (
              <div className="mt-3 pt-2 border-t border-dashed border-neutral-200">
                <p className="text-[10px] text-neutral-500 mb-1">
                  จำนวนแก้ไขฟรี · {q.revisionsCount} ครั้ง
                </p>
                <div className="space-y-0.5">
                  {revisionDates.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-[10.5px] text-neutral-600"
                    >
                      <span>ส่งแก้ไขครั้งที่ {i + 1}</span>
                      <span className="num">{fmtThaiShort(d)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        {docTheme.showSo1oBadge && (
          <div className="text-center pt-3 mt-2 text-[9px] text-neutral-400 border-t border-neutral-200">
            Free to Create, Easy to Manage by{" "}
            <span className="font-semibold text-neutral-600">So1o Freelancer</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  tone = "text-neutral-800",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-[11px] text-neutral-600">{label}</span>
      <span className={`num text-[12px] font-medium ${tone}`}>{value}</span>
    </div>
  );
}
