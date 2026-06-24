import * as React from "react";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "./StatCard";
import { AddIncomeModal } from "./Modals";
import { useFinance } from "@/store/finance";
import { useQuotations, computeTotals } from "@/store/quotations";
import { formatTHB } from "@/data/mockData";
import {
  Download,
  Coins,
  Receipt,
  Calculator,
  Sparkles,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { FinanceMoneyNav, type FinanceMoneySub } from "./FinanceMoneyNav";
import { useTaxEstimate } from "./tax/useTaxEstimate";
import { exportIncomeCsv } from "./tax/exportIncomeCsv";

const IncomeBreakdown = React.lazy(() =>
  import("./tax/IncomeBreakdown").then((m) => ({ default: m.IncomeBreakdown })),
);
const IncomeCumulativeChart = React.lazy(() =>
  import("./tax/IncomeTrendCharts").then((m) => ({ default: m.IncomeCumulativeChart })),
);
const IncomeNetTrendChart = React.lazy(() =>
  import("./tax/IncomeTrendCharts").then((m) => ({ default: m.IncomeNetTrendChart })),
);
const IncomeTopClientsChart = React.lazy(() =>
  import("./tax/IncomeTrendCharts").then((m) => ({ default: m.IncomeTopClientsChart })),
);

type Props = {
  onNavigate: (sub: FinanceMoneySub) => void;
};

export function IncomeTab({ onNavigate }: Props) {
  const { incomes, upsertIncomeFromQuotation } = useFinance();
  const { list: quotationsList } = useQuotations();
  const { est } = useTaxEstimate();
  const [resyncing, setResyncing] = React.useState(false);

  function handleResyncAll() {
    const completed = quotationsList.filter((q) => q.status === "completed");
    if (completed.length === 0) {
      toast.info("ยังไม่มีใบเสนอราคาที่เสร็จสิ้น");
      return;
    }
    setResyncing(true);
    let count = 0;
    for (const q of completed) {
      const totals = computeTotals(q);
      const monthSrc = q.paidAt || q.receiptIssuedAt || q.updatedAt || new Date().toISOString();
      upsertIncomeFromQuotation({
        sourceQuotationId: q.id,
        month: monthSrc.slice(0, 7),
        client: q.clientName || "ลูกค้า",
        gross: totals.preTax,
        withholding: totals.withholdingAmount,
        incomeType: "freelance",
        whtRate: q.whtEnabled ? q.whtRate : 0,
        certificateReceived: false,
        note: `จาก ${q.number}${q.invoiceNumber ? ` / ${q.invoiceNumber}` : ""}${q.receiptNumber ? ` / ${q.receiptNumber}` : ""}`,
      });
      count++;
    }
    setTimeout(() => setResyncing(false), 800);
    toast.success(`กำลังซิงค์ ${count} ใบงานเข้ารายได้...`);
  }

  const monthlyIncome = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of incomes) map[i.month] = (map[i.month] || 0) + i.gross;
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, gross]) => ({
        month: new Date(`${month}-01`).toLocaleDateString("th-TH", { month: "short" }),
        gross,
      }));
  }, [incomes]);

  const completedCount = quotationsList.filter((q) => q.status === "completed").length;
  const syncedCount = incomes.filter((i) => i.sourceQuotationId).length;
  const outOfSync = completedCount > syncedCount;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <FinanceMoneyNav active="income" onNavigate={onNavigate} />
          <p className="text-xs text-muted-foreground mt-1">
            บันทึกเงินที่รับจากงาน — ใช้คำนวณภาษีในหน้าถัดไป
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("tax")}
          className="w-full sm:max-w-xs lg:w-1/3 lg:max-w-none flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary-soft/50 px-4 py-3 text-left hover:border-primary/40 transition-colors shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Calculator className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                ภาษีประมาณการ (จากรายได้ที่บันทึก)
              </p>
              <p className="num text-sm font-semibold">฿{formatTHB(est.estimatedTax)}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary shrink-0">
            ดูรายละเอียด <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl glass border border-border p-3">
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">ซิงค์จากใบเสนอราคา:</span>
          <span className="num font-semibold">{syncedCount}</span>
          <span className="text-muted-foreground">/ {completedCount} ใบ</span>
          {outOfSync && (
            <Badge
              variant="outline"
              className="ml-1 bg-warning/15 text-warning-foreground border-warning/30 text-[10px]"
            >
              ไม่ตรงกัน
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleResyncAll}
            variant="outline"
            size="sm"
            disabled={resyncing}
            className="gap-1.5 h-8"
            title="ดึงข้อมูลจากใบเสนอราคาที่เสร็จสิ้นทั้งหมด"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resyncing ? "animate-spin" : ""}`} />
            Resync ทั้งหมด
          </Button>
          <Button
            onClick={() => exportIncomeCsv(incomes)}
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-end">
          <AddIncomeModal />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            accent
            label="รายได้รวม (ปีนี้)"
            value={`฿${formatTHB(est.totalGross)}`}
            sub={`${incomes.length} รายการ`}
            icon={<Coins className="h-5 w-5" />}
          />
          <StatCard
            label="หัก ณ ที่จ่ายสะสม"
            value={`฿${formatTHB(est.totalWithheld)}`}
            sub="ใช้เครดิตภาษีในหน้าภาษี"
            icon={<Receipt className="h-5 w-5" />}
          />
          <StatCard
            label="รายได้เดือนล่าสุด"
            value={`฿${formatTHB(monthlyIncome.at(-1)?.gross ?? 0)}`}
            sub={monthlyIncome.at(-1)?.month ?? "—"}
            icon={<Calculator className="h-5 w-5" />}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-up lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">รายได้รายเดือน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {monthlyIncome.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-16">
                  ยังไม่มีรายได้ — เพิ่มรายการหรือซิงค์จาก Quotation
                </p>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={monthlyIncome}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-card)",
                      }}
                      formatter={(v: number) => `฿${formatTHB(v)}`}
                    />
                    <Bar dataKey="gross" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <React.Suspense
          fallback={<div className="h-64 animate-pulse rounded-xl bg-muted/40" />}
        >
          <IncomeBreakdown />
        </React.Suspense>

        <React.Suspense
          fallback={<div className="h-64 animate-pulse rounded-xl bg-muted/40" />}
        >
          <IncomeCumulativeChart />
        </React.Suspense>

        <React.Suspense
          fallback={<div className="h-64 animate-pulse rounded-xl bg-muted/40" />}
        >
          <IncomeNetTrendChart />
        </React.Suspense>

        <React.Suspense
          fallback={<div className="h-64 animate-pulse rounded-xl bg-muted/40" />}
        >
          <IncomeTopClientsChart />
        </React.Suspense>
      </div>

      <PageFooterActions feature="income" label="รายได้" />
    </div>
  );
}
