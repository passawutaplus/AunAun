import { BRAND_NAME } from "@/lib/brandConfig";
import {
  LEGAL_COMPANY_ADDRESS,
  LEGAL_COMPANY_NAME,
  LEGAL_COMPANY_TAX_ID,
  LEGAL_VAT_REGISTERED,
} from "@/lib/legalConfig";
import type { BusinessDocument } from "@/lib/documents/documentPayload";
import { docKindLabelTh } from "@/lib/documents/numbering";
import { formatOfferBaht, formatOfferDateLong, partyDisplayName } from "@/lib/chatOffer";
import { satangToThb } from "@/lib/payments/fees";
import { cn } from "@/lib/utils";

type Props = {
  doc: BusinessDocument;
  className?: string;
};

function money(satang: number) {
  return `฿${formatOfferBaht(satangToThb(satang))}`;
}

function PartyBlock({
  label,
  party,
}: {
  label: string;
  party: BusinessDocument["issuer"];
}) {
  const name =
    party.type === "corporate"
      ? party.companyName || party.name || "—"
      : party.name || partyDisplayName(party) || "—";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-neutral-900">{name}</p>
      {party.address?.trim() ? (
        <p className="text-[10px] text-neutral-600 leading-snug mt-0.5 whitespace-pre-line">
          {party.address.trim()}
        </p>
      ) : null}
      <div className="text-[10px] text-neutral-600 mt-1 space-y-0.5">
        {party.taxId ? <p className="tabular-nums">เลขผู้เสียภาษี {party.taxId}</p> : null}
        {party.branch ? <p>สาขา {party.branch}</p> : null}
        {party.contactPerson ? (
          <p>
            ผู้ติดต่อ {party.contactPerson}
            {party.contactRole ? ` (${party.contactRole})` : ""}
          </p>
        ) : null}
        {party.phone ? <p>โทร {party.phone}</p> : null}
        {party.email ? <p className="truncate">{party.email}</p> : null}
      </div>
    </div>
  );
}

/** Printable business document paper (quotation / invoice / receipt / fee). */
export function DocumentPaper({ doc, className }: Props) {
  const issued = formatOfferDateLong(doc.issuedAt.slice(0, 10));
  const isFee = doc.kind === "platform_fee_receipt";
  const titleTh = docKindLabelTh(doc.kind);
  const isDepositReceipt =
    doc.kind === "receipt" &&
    (!!doc.notes?.includes("มัดจำ") || !!doc.title?.includes("มัดจำ"));
  const en =
    doc.kind === "quotation"
      ? "Quotation"
      : doc.kind === "invoice"
        ? "Invoice"
        : doc.kind === "platform_fee_receipt"
          ? "Platform Fee Receipt"
          : doc.kind === "wht_cert"
            ? "WHT Certificate"
            : isDepositReceipt
              ? "Deposit Receipt"
              : "Receipt";
  const vatOn = isFee
    ? LEGAL_VAT_REGISTERED || !!doc.vatRegisteredIssuer
    : !!doc.vatRegisteredIssuer;
  const receiptTitle =
    doc.kind === "receipt" || doc.kind === "platform_fee_receipt"
      ? isDepositReceipt
        ? "ใบเสร็จรับเงินมัดจำ"
        : vatOn
          ? `${titleTh}/ใบกำกับภาษี`
          : titleTh
      : titleTh;

  const issuerForFee = isFee
    ? {
        type: "corporate" as const,
        name: LEGAL_COMPANY_NAME,
        companyName: LEGAL_COMPANY_NAME,
        taxId: LEGAL_COMPANY_TAX_ID || null,
        address: LEGAL_COMPANY_ADDRESS,
        email: null,
        phone: null,
        branch: "สำนักงานใหญ่",
        contactPerson: null,
        contactRole: null,
        vatRegistered: LEGAL_VAT_REGISTERED,
      }
    : doc.issuer;

  return (
    <div
      className={cn(
        "bg-white border border-border/60 shadow-md text-[11px] text-neutral-800 rounded-xl overflow-hidden print:shadow-none",
        className,
      )}
      style={{ fontFeatureSettings: "'tnum'", lineHeight: 1.6 }}
    >
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
              {en}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 leading-tight mt-0.5">
              {receiptTitle}
            </h1>
            <p className="text-[11px] text-neutral-500 mt-1">
              {isFee ? LEGAL_COMPANY_NAME : partyDisplayName(doc.issuer) || BRAND_NAME}
            </p>
          </div>
          <div className="text-right shrink-0 space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400">เลขที่</p>
            <p className="text-sm font-semibold tabular-nums text-neutral-900">{doc.docNumber}</p>
            <p className="text-[11px] text-neutral-500 tabular-nums pt-1">{issued}</p>
            {doc.referenceDocNumber ? (
              <p className="text-[10px] text-neutral-500">อ้างอิง {doc.referenceDocNumber}</p>
            ) : null}
          </div>
        </div>

        <div className="h-px w-full bg-neutral-200" />

        <div className="grid grid-cols-2 gap-4">
          <PartyBlock label="จาก / FROM" party={issuerForFee} />
          <PartyBlock label="เรียน / สำหรับ" party={doc.client} />
        </div>

        <div className="border-t border-neutral-200" />

        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">โครงการ</p>
          <p className="text-sm font-medium text-neutral-900">{doc.title || "—"}</p>
        </div>

        <div>
          <div className="grid grid-cols-12 gap-2 pb-2 border-b border-neutral-200">
            <p className="col-span-8 text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
              รายการ
            </p>
            <p className="col-span-4 text-right text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
              จำนวนเงิน
            </p>
          </div>
          {doc.items.map((it) => (
            <div key={it.id} className="grid grid-cols-12 gap-2 py-2.5 border-b border-neutral-100">
              <div className="col-span-8">
                <p className="text-[12px] font-medium text-neutral-900">{it.name}</p>
                {it.description ? (
                  <p className="text-[10px] text-neutral-500 italic mt-0.5">{it.description}</p>
                ) : null}
              </div>
              <div className="col-span-4 text-right text-[12px] tabular-nums font-medium">
                ฿{formatOfferBaht(it.amount)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-[70%] space-y-1.5">
            <div className="flex justify-between px-1">
              <span className="text-[11px] text-neutral-600">ยอดรวม</span>
              <span className="tabular-nums text-[12px]">{money(doc.subtotalSatang)}</span>
            </div>
            {(doc.whtSatang ?? 0) > 0 ? (
              <div className="flex justify-between px-1 text-emerald-700">
                <span className="text-[11px]">หัก ณ ที่จ่าย {doc.whtRate ?? 3}%</span>
                <span className="tabular-nums text-[12px]">−{money(doc.whtSatang!)}</span>
              </div>
            ) : null}
            {(doc.vatSatang ?? 0) > 0 ? (
              <div className="flex justify-between px-1">
                <span className="text-[11px] text-neutral-600">VAT {doc.vatRate ?? 7}%</span>
                <span className="tabular-nums text-[12px]">{money(doc.vatSatang!)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between px-3 py-2 mt-1 rounded bg-primary/10 border border-primary/25">
              <span className="text-[12px] font-semibold text-primary">รวมทั้งสิ้น</span>
              <span className="tabular-nums font-bold text-[13px] text-primary">
                {money(doc.totalSatang)}
              </span>
            </div>
            {doc.amountPaidSatang != null ? (
              <div className="flex justify-between px-1">
                <span className="text-[11px] text-neutral-600">ยอดที่ชำระ</span>
                <span className="tabular-nums text-[12px] font-medium">
                  {money(doc.amountPaidSatang)}
                </span>
              </div>
            ) : null}
            {doc.platformFeePercent != null ? (
              <p className="text-[10px] text-neutral-500 px-1">
                ค่าธรรมเนียมแพลตฟอร์ม {doc.platformFeePercent}% — Aplus1 เป็นตัวกลางรับชำระ
                ไม่ใช่ผู้ขายงาน
              </p>
            ) : null}
          </div>
        </div>

        {doc.paymentMethodLabel || doc.paymentTerms ? (
          <div className="rounded px-3 py-2 bg-primary/10 border border-primary/25">
            {doc.paymentTerms ? (
              <p className="text-[12px] font-semibold text-neutral-900">{doc.paymentTerms}</p>
            ) : null}
            {doc.paymentMethodLabel ? (
              <p className="text-[11px] text-neutral-600 mt-0.5">วิธีชำระ: {doc.paymentMethodLabel}</p>
            ) : null}
            {doc.providerChargeId ? (
              <p className="text-[10px] text-neutral-500 tabular-nums">อ้างอิง {doc.providerChargeId}</p>
            ) : null}
          </div>
        ) : null}

        {doc.notes?.trim() ? (
          <div>
            <p className="text-[11px] font-semibold text-neutral-700 mb-1">หมายเหตุ</p>
            <p className="text-[11px] text-neutral-700 whitespace-pre-wrap">{doc.notes.trim()}</p>
          </div>
        ) : null}

        <p className="text-[9px] text-neutral-400 text-center pt-1 border-t border-neutral-100">
          เอกสารออกผ่าน Aplus1 — แพลตฟอร์มตัวกลาง · เงินค่าจ้างเป็นของผู้รับงาน ·
          รายได้แพลตฟอร์มคือค่าธรรมเนียมเท่านั้น
        </p>
      </div>
    </div>
  );
}

export function printDocumentElement(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>เอกสาร</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#171717}</style>
    </head><body>${el.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
