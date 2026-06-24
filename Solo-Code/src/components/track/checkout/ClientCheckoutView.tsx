import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { PortalBranding } from "@/lib/documentTheme/types";
import type { ClientPaymentEstimate } from "@/lib/stripeClientPaymentFees";
import { startClientJobCheckout } from "@/lib/stripeClientPaymentsApi";

type QuotationItem = {
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

type CheckoutQuotation = {
  number: string;
  project_name: string;
  items: QuotationItem[];
  payment_terms: string;
  deposit_percent: number;
  vat_enabled?: boolean;
  vat_rate?: number;
  wht_enabled?: boolean;
  wht_rate?: number;
  totals: {
    itemsSubtotal?: number;
    addonAmount?: number;
    diffAmount?: number;
    discountAmount?: number;
    preTax?: number;
    vatAmount: number;
    whtAmount: number;
    grandTotal: number;
    depositAmount: number;
  };
};

type CheckoutJob = {
  title: string;
  client_name: string;
  tracking_code: string;
  total_amount: number;
  deposit_percent: number;
};

export function ClientCheckoutView({
  token,
  paymentType,
  job,
  quotation,
  portal,
  estimate,
}: {
  token: string;
  paymentType: "deposit" | "final";
  job: CheckoutJob;
  quotation: CheckoutQuotation | null;
  portal: PortalBranding | null;
  estimate: ClientPaymentEstimate;
}) {
  const [paying, setPaying] = React.useState(false);
  const accent = portal?.theme.colors.primary ?? undefined;
  const accentSoft = portal?.theme.colors.primarySoft ?? "var(--primary-soft)";
  const isDeposit = paymentType === "deposit";

  const itemsSubtotal =
    quotation?.totals.itemsSubtotal ??
    quotation?.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0) ??
    job.total_amount;

  async function onPay() {
    setPaying(true);
    try {
      await startClientJobCheckout({ token, paymentType });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ไม่สามารถเริ่มชำระเงินได้");
      setPaying(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-orange-50/40 via-background to-background pb-28 lg:pb-8"
      style={
        accent
          ? ({
              background: `linear-gradient(to bottom, color-mix(in srgb, ${portal?.theme.colors.portalPrimary ?? accent} 12%, transparent), var(--background))`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            {portal?.showLogo !== false && portal?.logoUrl && !portal?.showPoweredBy && (
              <img
                src={portal.logoUrl}
                alt=""
                className="h-10 w-auto object-contain shrink-0 rounded-lg"
              />
            )}
            <div>
              <Link
                to="/track/$token"
                params={{ token }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                กลับไปหน้าติดตามงาน
              </Link>
              <h1 className="text-lg sm:text-xl font-bold">
                {isDeposit ? "ชำระมัดจำ" : "ชำระยอดสุดท้าย"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {job.title} · {job.tracking_code}
              </p>
            </div>
          </div>
          <CheckoutStepper step={1} accent={accent} />
        </header>

        <div className="grid lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-3 space-y-4">
            <Card className="shadow-soft border-border/60">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-sm">รายการที่ชำระ</h2>
                  {quotation?.number && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {quotation.number}
                    </Badge>
                  )}
                  <Badge
                    className="text-[10px] border-0"
                    style={accent ? { background: accentSoft, color: accent } : undefined}
                  >
                    {isDeposit
                      ? `งวดที่ 1 — มัดจำ ${job.deposit_percent}%`
                      : "งวดสุดท้าย — ปลดล็อกไฟล์งาน"}
                  </Badge>
                </div>

                {quotation && quotation.items.length > 0 ? (
                  <>
                    <div className="overflow-x-auto rounded-xl border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs bg-muted/50 text-muted-foreground">
                            <th className="text-left font-medium py-2.5 px-3">รายการ</th>
                            <th className="text-center font-medium py-2.5 px-3 w-20">จำนวน</th>
                            <th className="text-right font-medium py-2.5 px-3 w-24">ราคา/หน่วย</th>
                            <th className="text-right font-medium py-2.5 px-3 w-24">รวม</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotation.items.map((it, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="py-2.5 px-3">{it.name || `รายการ ${i + 1}`}</td>
                              <td className="py-2.5 px-3 text-center text-muted-foreground">
                                {it.quantity} {it.unit || ""}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-xs">
                                ฿{it.unitPrice.toLocaleString("th-TH")}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-xs font-medium">
                                ฿{(it.quantity * it.unitPrice).toLocaleString("th-TH")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <QuotationTotals q={quotation} itemsSubtotal={itemsSubtotal} />
                  </>
                ) : (
                  <div className="rounded-xl bg-muted/30 p-4 text-sm space-y-1">
                    <p className="font-medium">{job.title}</p>
                    <p className="text-muted-foreground text-xs">
                      ลูกค้า: {job.client_name || "—"} · ยอดรวมโปรเจกต์ ฿
                      {job.total_amount.toLocaleString("th-TH")}
                    </p>
                  </div>
                )}

                {quotation?.payment_terms && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap border-t pt-3">
                    <span className="font-medium text-foreground">เงื่อนไขชำระ: </span>
                    {quotation.payment_terms}
                  </p>
                )}
              </CardContent>
            </Card>

            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 px-1">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              ชำระด้วย QR/โอนไม่มีค่าธรรมเนียมออนไลน์ — กลับไปหน้าติดตามงานเพื่ออัปโหลดสลิปได้
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6 space-y-4">
              <Card className="shadow-elevated border-primary/20 ring-1 ring-primary/10">
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <h2 className="font-semibold text-sm">สรุปการชำระครั้งนี้</h2>

                  <div className="space-y-2 text-sm">
                    <Row
                      label={isDeposit ? `มัดจำ ${job.deposit_percent}%` : "ยอดคงเหลือ"}
                      value={`฿${estimate.jobAmount.toLocaleString("th-TH")}`}
                      strong
                    />
                    <Row
                      label="ค่าธรรมเนียมชำระออนไลน์"
                      value={`฿${estimate.feeAmount.toLocaleString("th-TH")}`}
                      hint="บัตร/ออนไลน์"
                    />
                    <div className="border-t pt-3 flex justify-between items-baseline">
                      <span className="font-semibold">รวมชำระวันนี้</span>
                      <span className="text-2xl font-bold text-primary">
                        ฿{estimate.totalAmount.toLocaleString("th-TH")}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2 bg-gradient-primary text-primary-foreground shadow-elevated hidden lg:flex"
                    size="lg"
                    disabled={paying}
                    onClick={onPay}
                  >
                    {paying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    ไปชำระเงิน ฿{estimate.totalAmount.toLocaleString("th-TH")}
                  </Button>

                  <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                    <Lock className="h-3 w-3" />
                    ปลอดภัยผ่าน Stripe · ฟรีแลนซ์ได้ยอดงานเต็ม ฿
                    {estimate.jobAmount.toLocaleString("th-TH")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 p-4 bg-background/95 backdrop-blur border-t lg:hidden">
        <Button
          className="w-full gap-2 bg-gradient-primary text-primary-foreground shadow-elevated"
          size="lg"
          disabled={paying}
          onClick={onPay}
        >
          {paying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          ไปชำระเงิน ฿{estimate.totalAmount.toLocaleString("th-TH")}
        </Button>
      </div>
    </div>
  );
}

function CheckoutStepper({ step, accent }: { step: 1 | 2 | 3; accent?: string }) {
  const steps = ["ตรวจสอบรายการ", "ชำระเงิน", "เสร็จสิ้น"];
  return (
    <ol className="flex items-center gap-2 text-[10px] sm:text-xs">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span className="w-4 h-px bg-border hidden sm:block" />}
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-1 ${
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : done
                    ? "text-emerald-600"
                    : "text-muted-foreground"
              }`}
              style={
                active && accent
                  ? { color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }
                  : undefined
              }
            >
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <span className="h-4 w-4 rounded-full border flex items-center justify-center text-[9px]">
                  {n}
                </span>
              )}
              <span className="hidden sm:inline">{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Row({
  label,
  value,
  strong,
  hint,
}: {
  label: string;
  value: string;
  strong?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className={strong ? "font-medium" : "text-muted-foreground"}>
        {label}
        {hint && <span className="block text-[10px] text-muted-foreground/80">{hint}</span>}
      </span>
      <span className={`font-mono ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

function QuotationTotals({ q, itemsSubtotal }: { q: CheckoutQuotation; itemsSubtotal: number }) {
  return (
    <div className="rounded-xl bg-muted/20 p-3 text-xs space-y-1.5 max-w-md ml-auto">
      <Row label="รวมรายการ" value={`฿${itemsSubtotal.toLocaleString("th-TH")}`} />
      {(q.totals.addonAmount ?? 0) > 0 && (
        <Row label="ส่วนเพิ่ม" value={`฿${q.totals.addonAmount!.toLocaleString("th-TH")}`} />
      )}
      {(q.totals.diffAmount ?? 0) > 0 && (
        <Row label="ความยากพิเศษ" value={`฿${q.totals.diffAmount!.toLocaleString("th-TH")}`} />
      )}
      {(q.totals.discountAmount ?? 0) > 0 && (
        <Row label="ส่วนลด" value={`−฿${q.totals.discountAmount!.toLocaleString("th-TH")}`} />
      )}
      {q.vat_enabled && q.totals.vatAmount > 0 && (
        <Row
          label={`VAT ${q.vat_rate ?? 0}%`}
          value={`฿${q.totals.vatAmount.toLocaleString("th-TH")}`}
        />
      )}
      {q.wht_enabled && q.totals.whtAmount > 0 && (
        <Row
          label={`หัก ณ ที่จ่าย ${q.wht_rate ?? 0}%`}
          value={`−฿${q.totals.whtAmount.toLocaleString("th-TH")}`}
        />
      )}
      <div className="border-t pt-1.5 flex justify-between font-semibold text-sm">
        <span>ยอดรวมโปรเจกต์</span>
        <span className="font-mono">฿{q.totals.grandTotal.toLocaleString("th-TH")}</span>
      </div>
    </div>
  );
}
