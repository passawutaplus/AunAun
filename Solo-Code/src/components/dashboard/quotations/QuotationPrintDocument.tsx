import type { PortalBranding, ResolvedDocumentTheme } from "@/lib/documentTheme/types";

export type PrintQuotationData = {
  number: string;
  project_name: string;
  start_date: string | null;
  end_date?: string | null;
  items: Array<{ name: string; unit: string; quantity: number; unitPrice: number }>;
  payment_terms: string;
  notes: string;
  deposit_percent: number;
  vat_enabled?: boolean;
  vat_rate?: number;
  wht_enabled?: boolean;
  wht_rate?: number;
  totals: {
    itemsSubtotal?: number;
    vatAmount: number;
    whtAmount: number;
    grandTotal: number;
    depositAmount: number;
  };
};

type ThemeSource = PortalBranding | { theme: ResolvedDocumentTheme };

function colorsFrom(source?: ThemeSource | null) {
  return source?.theme.colors;
}

/** Full printable quotation body — themed via portal branding or resolved theme. */
export function ThemedQuotationPrintBody({
  q,
  clientName,
  itemsSubtotal,
  branding,
  printAreaId = "quotation-print-area",
  docKind = "quotation",
}: {
  q: PrintQuotationData;
  clientName: string;
  itemsSubtotal: number;
  branding?: ThemeSource | null;
  printAreaId?: string;
  docKind?: "quotation" | "invoice" | "receipt";
}) {
  const colors = colorsFrom(branding);
  const accent = colors?.primary ?? "#F37021";
  const accentSoft = colors?.primarySoft ?? "#FFF4EC";
  const accentBorder = colors?.primaryBorder ?? "#FDBA74";
  const brandName = branding && "brandName" in branding ? branding.brandName : undefined;
  const logoUrl = branding && "logoUrl" in branding ? branding.logoUrl : null;
  const showPoweredBy = branding && "showPoweredBy" in branding ? branding.showPoweredBy : true;
  const showLogo = branding && "showLogo" in branding ? branding.showLogo !== false : true;

  const docLabels = {
    quotation: { th: "ใบเสนอราคา", en: "QUOTATION" },
    invoice: { th: "ใบแจ้งหนี้", en: "INVOICE" },
    receipt: { th: "ใบเสร็จรับเงิน", en: "RECEIPT" },
  } as const;
  const docLabel = docLabels[docKind];

  return (
    <div id={printAreaId} className="px-6 pb-6 sm:px-10 sm:pb-10 bg-white text-neutral-800">
      <div
        className="pb-4 mb-4 flex items-start justify-between gap-4"
        style={{ borderBottom: `2px solid ${accent}` }}
      >
        <div className="flex items-start gap-3 min-w-0">
          {!showPoweredBy && showLogo && logoUrl && (
            <img src={logoUrl} alt="" className="h-10 w-auto object-contain shrink-0" />
          )}
          <div>
            <h2 className="text-2xl font-bold" style={{ color: accent }}>
              {docLabel.th}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{docLabel.en}</p>
            {!showPoweredBy && brandName && (
              <p className="text-[10px] text-muted-foreground mt-1">{brandName}</p>
            )}
          </div>
        </div>
        <div className="text-right text-xs shrink-0">
          <p className="font-mono font-semibold">{q.number}</p>
          {q.start_date && (
            <p className="text-muted-foreground mt-1">
              วันที่: {new Date(q.start_date).toLocaleDateString("th-TH")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5 text-xs">
        <div>
          <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-1">
            โครงการ
          </p>
          <p className="text-sm font-medium">{q.project_name || "—"}</p>
        </div>
        <div>
          <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-1">
            ลูกค้า
          </p>
          <p className="text-sm font-medium">{clientName || "—"}</p>
        </div>
      </div>

      <table className="w-full text-sm border-collapse mb-5">
        <thead>
          <tr className="text-xs" style={{ background: accentSoft, color: accent }}>
            <th
              className="text-left font-semibold py-2 px-3 border"
              style={{ borderColor: accentBorder }}
            >
              รายการ
            </th>
            <th
              className="text-center font-semibold py-2 px-3 border w-16"
              style={{ borderColor: accentBorder }}
            >
              จำนวน
            </th>
            <th
              className="text-right font-semibold py-2 px-3 border w-28"
              style={{ borderColor: accentBorder }}
            >
              ราคา/หน่วย
            </th>
            <th
              className="text-right font-semibold py-2 px-3 border w-28"
              style={{ borderColor: accentBorder }}
            >
              รวม
            </th>
          </tr>
        </thead>
        <tbody>
          {q.items.map((it, i) => (
            <tr key={i}>
              <td className="py-2 px-3 border border-neutral-100">
                {it.name || `รายการ ${i + 1}`}
              </td>
              <td className="py-2 px-3 border border-neutral-100 text-center font-mono">
                {it.quantity} {it.unit || ""}
              </td>
              <td className="py-2 px-3 border border-neutral-100 text-right font-mono">
                ฿{it.unitPrice.toLocaleString("th-TH")}
              </td>
              <td className="py-2 px-3 border border-neutral-100 text-right font-mono">
                ฿{(it.quantity * it.unitPrice).toLocaleString("th-TH")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">รวมรายการ</span>
          <span className="font-mono">฿{itemsSubtotal.toLocaleString("th-TH")}</span>
        </div>
        {q.vat_enabled && q.totals.vatAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">VAT {q.vat_rate}%</span>
            <span className="font-mono">฿{q.totals.vatAmount.toLocaleString("th-TH")}</span>
          </div>
        )}
        {q.wht_enabled && q.totals.whtAmount > 0 && (
          <div className="flex justify-between text-rose-600">
            <span>หัก ณ ที่จ่าย {q.wht_rate}%</span>
            <span className="font-mono">−฿{q.totals.whtAmount.toLocaleString("th-TH")}</span>
          </div>
        )}
        <div
          className="flex justify-between font-bold text-lg pt-2"
          style={{ color: accent, borderTop: `2px solid ${accentBorder}` }}
        >
          <span>ยอดสุทธิ</span>
          <span className="font-mono">฿{q.totals.grandTotal.toLocaleString("th-TH")}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>มัดจำ ({q.deposit_percent}%)</span>
          <span className="font-mono">฿{q.totals.depositAmount.toLocaleString("th-TH")}</span>
        </div>
      </div>

      {(q.payment_terms || q.notes) && (
        <div
          className="mt-6 pt-4 text-xs space-y-2"
          style={{ borderTop: `1px solid ${accentSoft}` }}
        >
          {q.payment_terms && (
            <div>
              <p className="font-semibold mb-1" style={{ color: accent }}>
                เงื่อนไขการชำระ
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap">{q.payment_terms}</p>
            </div>
          )}
          {q.notes && (
            <div>
              <p className="font-semibold mb-1" style={{ color: accent }}>
                หมายเหตุ
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap">{q.notes}</p>
            </div>
          )}
        </div>
      )}

      {showPoweredBy && (
        <p className="text-[9px] text-muted-foreground/70 text-center mt-8">
          Powered by So1o Freelancer
        </p>
      )}
    </div>
  );
}

/** Compact preview card for client portal tab. */
export function ThemedQuotationMiniPreview({
  q,
  itemsSubtotal,
  branding,
}: {
  q: PrintQuotationData;
  itemsSubtotal: number;
  branding?: ThemeSource | null;
}) {
  const colors = colorsFrom(branding);
  const accent = colors?.primary ?? "#F37021";
  const accentSoft = colors?.primarySoft ?? "#FFF4EC";
  const accentBorder = colors?.primaryBorder ?? "#FDBA74";

  return (
    <div
      className="rounded-xl border bg-white p-3 sm:p-4 space-y-3 text-xs"
      style={{ borderColor: accentBorder }}
    >
      <div
        className="flex items-start justify-between gap-2 pb-2"
        style={{ borderBottom: `1px solid ${accentSoft}` }}
      >
        <div>
          <p
            className="text-[9px] uppercase tracking-widest font-semibold"
            style={{ color: accent }}
          >
            Quotation
          </p>
          <p className="font-mono text-[11px] mt-0.5">{q.number}</p>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          {q.start_date && <p>{new Date(q.start_date).toLocaleDateString("th-TH")}</p>}
          {q.end_date && <p>ถึง {new Date(q.end_date).toLocaleDateString("th-TH")}</p>}
        </div>
      </div>

      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-muted-foreground border-b border-dashed border-muted">
            <th className="text-left font-medium py-1">รายการ</th>
            <th className="text-right font-medium py-1 w-12">จน.</th>
            <th className="text-right font-medium py-1 w-20">ราคา</th>
          </tr>
        </thead>
        <tbody>
          {q.items.length > 0 ? (
            q.items.map((it, i) => (
              <tr key={i} className="border-b border-muted/40 last:border-0">
                <td className="py-1.5">{it.name || `รายการ ${i + 1}`}</td>
                <td className="py-1.5 text-right font-mono">{it.quantity}</td>
                <td className="py-1.5 text-right font-mono">
                  ฿{(it.quantity * it.unitPrice).toLocaleString("th-TH")}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="py-2 text-muted-foreground text-center">
                ยังไม่มีรายการ
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex justify-between font-semibold text-sm pt-1" style={{ color: accent }}>
        <span>ยอดสุทธิ</span>
        <span className="font-mono">฿{q.totals.grandTotal.toLocaleString("th-TH")}</span>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>รวมรายการ</span>
        <span className="font-mono">฿{itemsSubtotal.toLocaleString("th-TH")}</span>
      </div>
    </div>
  );
}
