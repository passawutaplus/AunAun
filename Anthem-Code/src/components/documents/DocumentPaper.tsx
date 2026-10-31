import { useRef, useState } from "react";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brandConfig";
import {
  LEGAL_COMPANY_ADDRESS,
  LEGAL_COMPANY_NAME,
  LEGAL_COMPANY_TAX_ID,
  LEGAL_VAT_REGISTERED,
} from "@/lib/legalConfig";
import type { BusinessDocument } from "@/lib/documents/documentPayload";
import { docKindLabelTh } from "@/lib/documents/numbering";
import {
  formatOfferBaht,
  formatOfferDateLong,
  formatOfferDateShort,
  partyDisplayName,
} from "@/lib/chatOffer";
import { satangToThb } from "@/lib/payments/fees";
import { isCommerceEnabled } from "@/lib/aplus1Launch";
import {
  documentFileStem,
  printDocumentElement,
} from "@/lib/documents/printDocument";
import { maskPromptPayId, promptPayPayload } from "@/lib/payments/promptpayQr";
import { cn } from "@/lib/utils";

type Props = {
  doc: BusinessDocument;
  className?: string;
  /** DOM id so the paper can be printed / saved as PDF. */
  id?: string;
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
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-neutral-900">{name}</p>
      {party.address?.trim() ? (
        <p className="text-[10px] text-neutral-600 leading-snug mt-0.5 whitespace-pre-line">
          {party.address.trim()}
        </p>
      ) : null}
      <div className="text-[10px] text-neutral-600 mt-1 space-y-0.5">
        {party.taxId ? (
          <p className="tabular-nums">เลขผู้เสียภาษี {party.taxId}</p>
        ) : null}
        {party.branch ? <p>สาขา {party.branch}</p> : null}
        {party.contactPerson ? (
          <p>
            ผู้ติดต่อ {party.contactPerson}
            {party.contactRole ? ` (${party.contactRole})` : ""}
          </p>
        ) : null}
        {party.phone ? <p>โทร {party.phone}</p> : null}
        {party.email ? <p className="break-all">{party.email}</p> : null}
      </div>
    </div>
  );
}

function SignatureLine({
  label,
  name,
}: {
  label: string;
  name?: string | null;
}) {
  return (
    <div className="text-center">
      <div className="h-10 border-b border-neutral-300" />
      <p className="mt-1 text-[10px] text-neutral-700">
        {name ? `( ${name} )` : "(..............................)"}
      </p>
      <p className="text-[10px] text-neutral-400">{label}</p>
      <p className="text-[10px] text-neutral-400">
        วันที่ ......../......../........
      </p>
    </div>
  );
}

/** Printable business document paper (quotation / invoice / receipt / fee). */
export function DocumentPaper({ doc, className, id }: Props) {
  const issued = formatOfferDateLong(doc.issuedAt.slice(0, 10));
  const isFee = doc.kind === "platform_fee_receipt";
  const titleTh = docKindLabelTh(doc.kind);
  const isDepositReceipt =
    doc.kind === "receipt" &&
    ((doc.installment
      ? doc.installment.no === 1 && doc.installment.total > 1
      : false) ||
      (!doc.installment &&
        (!!doc.notes?.includes("มัดจำ") || !!doc.title?.includes("มัดจำ"))));
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

  const showQty = doc.items.some((it) => (it.quantity || 1) !== 1);
  const itemsSubtotal = doc.items.reduce(
    (sum, it) => sum + (it.amount || 0),
    0,
  );
  const discount = doc.discountSatang ?? 0;
  const commerce = isCommerceEnabled();
  const dueLabel = doc.dueDate ? formatOfferDateLong(doc.dueDate) : null;
  const issuerName = isFee
    ? LEGAL_COMPANY_NAME
    : partyDisplayName(doc.issuer) || null;
  const clientName =
    doc.client.type === "corporate"
      ? doc.client.companyName || doc.client.name
      : doc.client.name || partyDisplayName(doc.client);

  return (
    <div
      id={id}
      className={cn(
        "doc-paper relative bg-white border border-border/60 shadow-md text-[11px] text-neutral-800 rounded-xl overflow-hidden print:shadow-none",
        className,
      )}
      style={{ fontFeatureSettings: "'tnum'", lineHeight: 1.6 }}
    >
      {doc.draft ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <span className="-rotate-[24deg] select-none text-[88px] font-black tracking-widest text-neutral-900/[0.05]">
            ร่าง
          </span>
        </div>
      ) : null}
      <div className="relative p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
              {en}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 leading-tight mt-0.5">
              {receiptTitle}
            </h1>
            <p className="text-[11px] text-neutral-500 mt-1">
              {issuerName || BRAND_NAME}
            </p>
          </div>
          <div className="text-right shrink-0 space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400">
              เลขที่
            </p>
            <p className="text-sm font-semibold tabular-nums text-neutral-900">
              {doc.docNumber}
            </p>
            <p className="text-[11px] text-neutral-500 tabular-nums pt-1">
              {issued}
            </p>
            {dueLabel ? (
              <p className="text-[10px] text-neutral-600">
                {doc.kind === "quotation" ? "ยืนราคาถึง" : "ครบกำหนดชำระ"}{" "}
                {dueLabel}
              </p>
            ) : null}
            {doc.referenceDocNumber ? (
              <p className="text-[10px] text-neutral-500">
                อ้างอิง {doc.referenceDocNumber}
              </p>
            ) : null}
          </div>
        </div>

        <div className="h-px w-full bg-neutral-200" />

        <div className="grid grid-cols-2 gap-4">
          <PartyBlock label="จาก / FROM" party={issuerForFee} />
          <PartyBlock label="เรียน / สำหรับ" party={doc.client} />
        </div>

        <div className="border-t border-neutral-200" />

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
              โครงการ
            </p>
            <p className="text-sm font-medium text-neutral-900">
              {doc.title || "—"}
            </p>
          </div>
          {doc.installment ? (
            <p className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-[10px] font-medium text-neutral-700">
              งวดที่ {doc.installment.no}/{doc.installment.total} ·{" "}
              {doc.installment.label}
              {doc.installment.percent ? ` (${doc.installment.percent}%)` : ""}
            </p>
          ) : null}
        </div>

        <div className="doc-items">
          <div className="grid grid-cols-12 gap-2 pb-2 border-b border-neutral-200 text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
            <p className={showQty ? "col-span-5" : "col-span-8"}>รายการ</p>
            {showQty ? (
              <>
                <p className="col-span-2 text-center">จำนวน</p>
                <p className="col-span-2 text-right">ราคา/หน่วย</p>
              </>
            ) : null}
            <p
              className={cn(
                "text-right",
                showQty ? "col-span-3" : "col-span-4",
              )}
            >
              จำนวนเงิน
            </p>
          </div>
          {doc.items.map((it) => (
            <div
              key={it.id}
              className="doc-row grid grid-cols-12 gap-2 py-2.5 border-b border-neutral-100"
            >
              <div className={showQty ? "col-span-5" : "col-span-8"}>
                <p className="text-[12px] font-medium text-neutral-900">
                  {it.name}
                </p>
                {it.description ? (
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    {it.description}
                  </p>
                ) : null}
              </div>
              {showQty ? (
                <>
                  <p className="col-span-2 text-center tabular-nums">
                    {it.quantity}
                  </p>
                  <p className="col-span-2 text-right tabular-nums">
                    ฿{formatOfferBaht(it.unitPrice)}
                  </p>
                </>
              ) : null}
              <div
                className={cn(
                  "text-right text-[12px] tabular-nums font-medium",
                  showQty ? "col-span-3" : "col-span-4",
                )}
              >
                ฿{formatOfferBaht(it.amount)}
              </div>
            </div>
          ))}
        </div>

        <div className="doc-totals flex justify-end">
          <div className="w-full max-w-[70%] space-y-1.5">
            {discount > 0 ? (
              <>
                <div className="flex justify-between px-1">
                  <span className="text-[11px] text-neutral-600">
                    ยอดรวมรายการ
                  </span>
                  <span className="tabular-nums text-[12px]">
                    ฿{formatOfferBaht(itemsSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="text-[11px] text-neutral-600">ส่วนลด</span>
                  <span className="tabular-nums text-[12px]">
                    −{money(discount)}
                  </span>
                </div>
              </>
            ) : null}
            <div className="flex justify-between px-1">
              <span className="text-[11px] text-neutral-600">
                {doc.installment ? `ยอดงวดนี้` : "ยอดรวม"}
              </span>
              <span className="tabular-nums text-[12px]">
                {money(doc.subtotalSatang)}
              </span>
            </div>
            {(doc.vatSatang ?? 0) > 0 ? (
              <div className="flex justify-between px-1">
                <span className="text-[11px] text-neutral-600">
                  VAT {doc.vatRate ?? 7}%
                </span>
                <span className="tabular-nums text-[12px]">
                  {money(doc.vatSatang!)}
                </span>
              </div>
            ) : null}
            {(doc.whtSatang ?? 0) > 0 ? (
              <div className="flex justify-between px-1">
                <span className="text-[11px] text-neutral-600">
                  หัก ณ ที่จ่าย {doc.whtRate ?? 3}%
                </span>
                <span className="tabular-nums text-[12px]">
                  −{money(doc.whtSatang!)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between px-3 py-2 mt-1 rounded bg-neutral-100 border border-neutral-300">
              <span className="text-[12px] font-semibold text-neutral-900">
                {doc.kind === "receipt" ? "ได้รับเงินแล้ว" : "รวมทั้งสิ้น"}
              </span>
              <span className="tabular-nums font-bold text-[13px] text-neutral-900">
                {money(doc.totalSatang)}
              </span>
            </div>
            {doc.amountPaidSatang != null && doc.kind !== "receipt" ? (
              <div className="flex justify-between px-1">
                <span className="text-[11px] text-neutral-600">ยอดที่ชำระ</span>
                <span className="tabular-nums text-[12px] font-medium">
                  {money(doc.amountPaidSatang)}
                </span>
              </div>
            ) : null}
            {doc.fxNote ? (
              <p className="text-[9px] text-neutral-500 text-right px-1">
                {doc.fxNote}
              </p>
            ) : null}
            {doc.platformFeePercent != null ? (
              <p className="text-[10px] text-neutral-500 px-1">
                ค่าธรรมเนียมแพลตฟอร์ม {doc.platformFeePercent}% — SAMECOR
                เป็นตัวกลางรับชำระ ไม่ใช่ผู้ขายงาน
              </p>
            ) : null}
          </div>
        </div>

        {doc.paymentSchedule && doc.paymentSchedule.length > 1 ? (
          <div className="doc-schedule">
            <p className="text-[11px] font-semibold text-neutral-700 mb-1">
              กำหนดการชำระเงิน
            </p>
            <div className="rounded border border-neutral-200">
              {doc.paymentSchedule.map((row, i) => (
                <div
                  key={`${row.label}-${i}`}
                  className={cn(
                    "doc-row flex items-center justify-between gap-3 px-3 py-1.5",
                    i > 0 && "border-t border-neutral-100",
                    doc.installment?.no === i + 1 &&
                      "bg-neutral-50 font-semibold",
                  )}
                >
                  <span className="min-w-0 text-[11px]">
                    งวดที่ {i + 1} · {row.label} ({row.percent}%)
                    {row.done ? (
                      <span className="ml-1.5 text-neutral-500">
                        · ชำระแล้ว
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-[11px]">
                    {money(row.amountSatang)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {doc.timeline && doc.timeline.length > 0 ? (
          <div className="doc-schedule">
            <p className="text-[11px] font-semibold text-neutral-700 mb-1">
              ขั้นตอนงานและกำหนดส่ง
            </p>
            <div className="rounded border border-neutral-200">
              {doc.timeline.map((row, i) => (
                <div
                  key={`${row.label}-${i}`}
                  className={cn(
                    "doc-row flex items-center justify-between gap-3 px-3 py-1.5",
                    i > 0 && "border-t border-neutral-100",
                  )}
                >
                  <span className="min-w-0 text-[11px]">{row.label}</span>
                  <span className="shrink-0 tabular-nums text-[11px] text-neutral-600">
                    {row.date ? formatOfferDateShort(row.date) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {doc.kind === "invoice" &&
        doc.promptPayId &&
        promptPayPayload(doc.promptPayId, satangToThb(doc.totalSatang)) ? (
          <div className="doc-schedule flex items-center gap-4 rounded border border-neutral-200 p-3">
            <div className="shrink-0 rounded bg-white p-1">
              <QRCodeSVG
                value={
                  promptPayPayload(
                    doc.promptPayId,
                    satangToThb(doc.totalSatang),
                  ) || ""
                }
                size={104}
                level="M"
              />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[12px] font-semibold text-neutral-900">
                สแกนจ่ายด้วยพร้อมเพย์
              </p>
              <p className="text-[11px] text-neutral-600">
                ยอด {money(doc.totalSatang)} · บัญชี{" "}
                {maskPromptPayId(doc.promptPayId)}
              </p>
              <p className="text-[10px] text-neutral-500">
                เงินโอนเข้าบัญชีผู้ออกเอกสารโดยตรง — โอนแล้วกด “แจ้งว่าโอนแล้ว”
                ในแชท
              </p>
            </div>
          </div>
        ) : null}

        {doc.paymentMethodLabel || doc.paymentTerms ? (
          <div className="rounded px-3 py-2 bg-neutral-50 border border-neutral-200">
            {doc.paymentTerms ? (
              <p className="text-[12px] font-semibold text-neutral-900">
                {doc.paymentTerms}
              </p>
            ) : null}
            {doc.paymentMethodLabel ? (
              <p className="text-[11px] text-neutral-600 mt-0.5">
                วิธีชำระ: {doc.paymentMethodLabel}
              </p>
            ) : null}
            {doc.providerChargeId ? (
              <p className="text-[10px] text-neutral-500 tabular-nums">
                อ้างอิง {doc.providerChargeId}
              </p>
            ) : null}
          </div>
        ) : null}

        {doc.notes?.trim() ? (
          <div>
            <p className="text-[11px] font-semibold text-neutral-700 mb-1">
              หมายเหตุ
            </p>
            <p className="text-[11px] text-neutral-700 whitespace-pre-wrap">
              {doc.notes.trim()}
            </p>
          </div>
        ) : null}

        {!isFee ? (
          <div className="doc-signatures grid grid-cols-2 gap-6 pt-2">
            <SignatureLine
              label={doc.kind === "receipt" ? "ผู้รับเงิน" : "ผู้ออกเอกสาร"}
              name={issuerName}
            />
            <SignatureLine
              label={
                doc.kind === "quotation"
                  ? "ผู้อนุมัติ / ลูกค้า"
                  : "ผู้รับเอกสาร"
              }
              name={clientName}
            />
          </div>
        ) : null}

        <p className="text-[9px] text-neutral-400 text-center pt-1 border-t border-neutral-100">
          {commerce
            ? "เอกสารออกผ่าน SAMECOR — แพลตฟอร์มตัวกลาง · เงินค่าจ้างเป็นของผู้รับงาน · รายได้แพลตฟอร์มคือค่าธรรมเนียมเท่านั้น"
            : "จัดทำด้วย SAMECOR · ผู้ออกเอกสารเป็นผู้รับผิดชอบเนื้อหาและการรับชำระเงินโดยตรง"}
        </p>
      </div>
    </div>
  );
}

/** Paper + "ดาวน์โหลด PDF / พิมพ์" button. Use this wherever a document is opened for viewing. */
export function PrintableDocumentPaper({ doc, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const print = async () => {
    const el = ref.current?.querySelector<HTMLElement>(".doc-paper");
    if (!el) return;
    setBusy(true);
    try {
      await printDocumentElement(
        el,
        documentFileStem(doc.docNumber, doc.title),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div ref={ref} className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto text-xs text-muted-foreground">
          เลือก “บันทึกเป็น PDF” ในหน้าต่างพิมพ์เพื่อเก็บไฟล์
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void print()}
          disabled={busy}
        >
          <Printer className="mr-1.5 h-4 w-4" aria-hidden />
          {busy ? "กำลังเตรียม…" : "ดาวน์โหลด PDF / พิมพ์"}
        </Button>
      </div>
      <DocumentPaper doc={doc} />
    </div>
  );
}
