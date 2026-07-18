import { BRAND_NAME } from "@/lib/brandConfig";
import {
  formatOfferBaht,
  formatOfferDateLong,
  formatOfferDateShort,
  offerDepositAmount,
  offerDisplayMilestones,
  offerItemsSubtotal,
  offerWhtAmount,
  partyDisplayName,
  paymentTermsLabel,
  type ChatOfferPayload,
} from "@/lib/chatOffer";
import {
  convertThbToFx,
  formatPortfolioMoney,
  isPortfolioFxCurrency,
  type PortfolioFxCurrency,
} from "@/lib/payments/fxDaily";
import { cn } from "@/lib/utils";

type Props = {
  offer: ChatOfferPayload;
  issuerName?: string;
  issuerEmail?: string;
  className?: string;
};

function TotalRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-[11px] text-neutral-600">{label}</span>
      <span className={cn("tabular-nums text-[12px] font-medium text-neutral-800", tone)}>
        {value}
      </span>
    </div>
  );
}

/** Solo-style quotation paper preview for in-chat offers. */
export function ChatOfferPreview({ offer, issuerName, issuerEmail, className }: Props) {
  const today = formatOfferDateLong(new Date().toISOString().slice(0, 10));
  const brand =
    partyDisplayName(offer.party?.issuer) ||
    (offer.issuerName || issuerName || "").trim() ||
    BRAND_NAME;
  const email =
    (offer.party?.issuer?.email || offer.issuerEmail || issuerEmail || "").trim();
  const clientParty = offer.party?.client;
  const client =
    (clientParty ? partyDisplayName(clientParty) : (offer.clientName || "").trim()) || "—";
  const clientAddress = clientParty?.address?.trim() || offer.clientAddress?.trim() || "";
  const clientPhone = clientParty?.phone?.trim() || offer.clientPhone?.trim() || "";
  const clientEmail = clientParty?.email?.trim() || offer.clientEmail?.trim() || "";
  const clientTaxId = clientParty?.taxId?.trim() || offer.clientTaxId?.trim() || "";
  const amount = offer.amount || 0;
  const lineItems =
    offer.items && offer.items.length > 0
      ? offer.items.map((it) => ({
          id: it.id,
          name: it.name,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: (it.quantity || 0) * (it.unitPrice || 0),
        }))
      : [
          {
            id: "legacy",
            name: offer.title || "—",
            description: offer.deliverables || "",
            quantity: 1,
            unitPrice: amount,
            amount,
          },
        ];
  const itemsSubtotal =
    offer.items && offer.items.length > 0
      ? Math.round(offerItemsSubtotal(offer.items))
      : amount + Math.max(0, Math.round(offer.discount || 0));
  const discount = Math.min(
    itemsSubtotal,
    Math.max(0, Math.round(offer.discount || Math.max(0, itemsSubtotal - amount))),
  );
  const depositPct = offer.depositPercent ?? 50;
  const whtOn = offer.whtApplicable ?? offer.whtEnabled !== false;
  const whtRate = offer.whtRate ?? 3;
  const wht = whtOn ? offerWhtAmount(amount, whtRate) : 0;
  const grand = Math.max(0, amount - wht);
  const deposit = offerDepositAmount(grand, depositPct);
  const terms = offer.paymentTerms || paymentTermsLabel(depositPct);
  const end = offer.endDate || offer.dueDate;
  const milestones = offerDisplayMilestones(offer);

  const displayCur = isPortfolioFxCurrency(offer.displayCurrency)
    ? (offer.displayCurrency as PortfolioFxCurrency)
    : "THB";
  const fxRate =
    displayCur !== "THB" && offer.fxRateSnapshot?.rate && offer.fxRateSnapshot.rate > 0
      ? offer.fxRateSnapshot.rate
      : null;
  const money = (thb: number) => {
    if (!fxRate || displayCur === "THB") return `฿${formatOfferBaht(thb)}`;
    return formatPortfolioMoney(
      convertThbToFx(thb, displayCur, { [displayCur]: fxRate }),
      displayCur,
    );
  };

  return (
    <div
      className={cn(
        "bg-white border border-border/60 shadow-md text-[11px] text-neutral-800 rounded-xl overflow-hidden",
        className,
      )}
      style={{ fontFeatureSettings: "'tnum'", lineHeight: 1.6 }}
    >
      <div className="p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
              Quotation
            </p>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 leading-tight mt-0.5">
              ใบเสนอราคา
            </h1>
            <p className="text-[11px] text-neutral-500 mt-1">{brand}</p>
          </div>
          <div className="text-right shrink-0 space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400">เลขที่</p>
            <p className="text-sm font-semibold tabular-nums text-neutral-900">
              {offer.number || "QT-····"}
            </p>
            <p className="text-[11px] text-neutral-500 tabular-nums pt-1">{today}</p>
          </div>
        </div>

        <div className="h-px w-full bg-neutral-200" />

        {/* From / To */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">จาก / FROM</p>
            <p className="text-sm font-semibold text-neutral-900">{brand}</p>
            {email ? <p className="text-[10px] text-neutral-600 mt-0.5 truncate">{email}</p> : null}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
              เรียน / สำหรับ
            </p>
            <p className="text-sm font-semibold text-neutral-900">{client}</p>
            {clientParty?.type === "corporate" && clientParty.contactPerson ? (
              <p className="text-[10px] text-neutral-600 mt-0.5">
                ผู้ติดต่อ {clientParty.contactPerson}
                {clientParty.contactRole ? ` (${clientParty.contactRole})` : ""}
              </p>
            ) : null}
            {clientAddress ? (
              <p className="text-[10px] text-neutral-600 leading-snug mt-0.5 whitespace-pre-line">
                {clientAddress}
              </p>
            ) : null}
            <div className="text-[10px] text-neutral-600 mt-1 space-y-0.5">
              {clientPhone ? <p>โทร {clientPhone}</p> : null}
              {clientEmail ? <p className="truncate">{clientEmail}</p> : null}
              {clientTaxId ? <p className="tabular-nums">เลขผู้เสียภาษี {clientTaxId}</p> : null}
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200" />

        {/* Project / Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">โครงการ</p>
            <p className="text-sm font-medium text-neutral-900">{offer.title || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">ระยะเวลา</p>
            <p className="text-sm font-medium text-neutral-900 tabular-nums">
              {formatOfferDateShort(offer.startDate)} — {formatOfferDateShort(end)}
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-200" />

        {/* Line items */}
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
            lineItems.map((it) => (
              <div
                key={it.id}
                className="grid grid-cols-12 gap-2 py-2.5 border-b border-neutral-100"
              >
                <div className="col-span-8">
                  <p className="text-[12px] font-medium text-neutral-900 leading-tight">
                    {it.name || "—"}
                  </p>
                  {it.description ? (
                    <p className="text-[10px] text-neutral-500 leading-tight mt-0.5 italic whitespace-pre-wrap">
                      {it.description}
                    </p>
                  ) : null}
                  {it.quantity > 1 ? (
                    <p className="text-[10px] text-neutral-400 tabular-nums mt-0.5">
                      {it.quantity} × {money(it.unitPrice)}
                    </p>
                  ) : null}
                </div>
                <div className="col-span-4 text-right text-[12px] tabular-nums font-medium text-neutral-900">
                  {money(it.amount)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full max-w-[70%] space-y-1.5">
            <TotalRow label="ยอดรวมรายการ" value={money(itemsSubtotal)} />
            {discount > 0 ? (
              <TotalRow
                label={
                  offer.discountMode === "percent" && offer.discountPercent
                    ? `ส่วนลด ${offer.discountPercent}%`
                    : "ส่วนลด"
                }
                value={`−${money(discount)}`}
                tone="text-emerald-600"
              />
            ) : null}
            <TotalRow label="ยอดรวมก่อนภาษี" value={money(amount)} />
            {whtOn ? (
              <TotalRow
                label={`หัก ณ ที่จ่าย ${whtRate}%`}
                value={`−${money(wht)}`}
                tone="text-emerald-600"
              />
            ) : null}
            <div className="flex items-center justify-between px-3 py-2 mt-1 rounded bg-primary/10 border border-primary/25">
              <span className="text-[12px] font-semibold text-primary">รวมทั้งสิ้น</span>
              <span className="tabular-nums font-bold text-[13px] text-primary">
                {money(grand)}
              </span>
            </div>
            {depositPct < 100 ? (
              <div className="flex items-center justify-between px-3 py-2 rounded bg-primary/10 border border-primary/25">
                <span className="text-[12px] font-semibold text-primary">มัดจำที่ต้องชำระ</span>
                <span className="tabular-nums font-bold text-[13px] text-primary">
                  {money(deposit)}
                </span>
              </div>
            ) : null}
            {fxRate && displayCur !== "THB" ? (
              <p className="text-[9px] text-neutral-500 text-right pt-0.5">
                แสดง {displayCur} อัตราอ้างอิง — ชำระจริงเป็นบาท
                {offer.fxRateSnapshot?.asOf ? ` (${offer.fxRateSnapshot.asOf})` : ""}
              </p>
            ) : null}
          </div>
        </div>

        {/* Payment terms */}
        <div className="rounded px-3 py-2 bg-primary/10 border border-primary/25">
          <p className="text-[10px] text-neutral-600">เงื่อนไขการชำระ</p>
          <p className="text-[12px] font-semibold text-neutral-900 mt-0.5">
            {terms}
            {depositPct < 100 ? (
              <span className="text-neutral-600 font-normal"> (มัดจำ {depositPct}%)</span>
            ) : null}
            {offer.depositDueDate ? (
              <span className="text-neutral-600 font-normal block mt-0.5">
                ครบกำหนดชำระมัดจำ: {formatOfferDateShort(offer.depositDueDate)}
              </span>
            ) : null}
          </p>
        </div>

        {offer.clientNotes?.trim() ? (
          <div>
            <p className="text-[11px] font-semibold text-neutral-700 mb-1">หมายเหตุ</p>
            <p className="text-[11px] text-neutral-700 whitespace-pre-wrap leading-relaxed">
              {offer.clientNotes.trim()}
            </p>
          </div>
        ) : null}

        <div className="border-t border-neutral-200" />

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-6 pt-1">
          <div className="pt-8 border-t border-neutral-400">
            <p className="text-[10px] text-neutral-500">ลงนามลูกค้า</p>
          </div>
          <div className="pt-8 border-t border-neutral-400 text-right">
            <p className="text-[10px] text-neutral-500 mb-1">{brand}</p>
            <p className="text-[10px] text-neutral-500">ลงนามผู้เสนอราคา</p>
          </div>
        </div>

        {/* Timeline */}
        {milestones.length > 0 ? (
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-neutral-700 mb-2">ลำดับงานและกำหนดส่ง</p>
            <div className="space-y-2.5">
              {milestones.map((m, i) => {
                const isLast = i === milestones.length - 1;
                const filled = i === 0 || isLast;
                return (
                  <div key={m.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center pt-0.5">
                      <div
                        className={cn(
                          "h-3 w-3 rounded-full border-2 border-primary",
                          filled ? "bg-primary" : "bg-white",
                        )}
                      />
                      {!isLast ? (
                        <div className="w-px flex-1 mt-1 min-h-[14px] border-l border-dashed border-primary/40" />
                      ) : null}
                    </div>
                    <div className="flex-1 flex items-center justify-between border-b border-dotted border-neutral-200 pb-1.5">
                      <span className="text-[12px] text-neutral-800">{m.label}</span>
                      <span className="text-[11px] tabular-nums text-neutral-500">
                        {m.date ? formatOfferDateShort(m.date) : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <p className="text-[9px] text-neutral-400 text-center pt-1 border-t border-neutral-100">
          สรุปในแชท Aplus1 — เอกสารบัญชีเต็มใช้ So1o ได้
        </p>
      </div>
    </div>
  );
}
