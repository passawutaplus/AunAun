import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCompact } from "@/lib/format";
import { satangToThb } from "@/lib/payments/fees";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import {
  buildHireIncomeWeekSeries,
  chartPointThb,
} from "@/lib/payments/hireIncomeChart";
import type { HireIncomeItem } from "@/lib/payments/hireWallet";

const chartConfig = {
  revenue: { label: "ราคางาน", color: "hsl(var(--primary))" },
  net: { label: "สุทธิเข้ากระเป๋า", color: "hsl(var(--foreground) / 0.28)" },
};

type Props = {
  income: HireIncomeItem[];
  preview?: boolean;
};

/** Weekly hire income vs net — last 8 Bangkok weeks. */
export function EarningsIncomeChart({ income, preview }: Props) {
  const series = useMemo(() => buildHireIncomeWeekSeries(income), [income]);
  const data = useMemo(() => series.map(chartPointThb), [series]);
  const totals = useMemo(
    () =>
      series.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenueSatang,
          net: acc.net + row.netSatang,
          count: acc.count + row.count,
        }),
        { revenue: 0, net: 0, count: 0 },
      ),
    [series],
  );
  const deducted = totals.revenue - totals.net;
  const hasData = totals.count > 0;

  return (
    <section className="space-y-3 rounded-2xl border border-border/70 bg-card/50 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">สถิติรายได้</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">8 สัปดาห์ล่าสุด · ราคางานเทียบสุทธิหลังหักค่าธรรมเนียม</p>
        </div>
        <Link
          to={preview ? "/dashboard/documents?preview=wallet" : "/dashboard/documents"}
          className="shrink-0 text-[11px] font-medium text-primary hover:underline"
        >
          ประมาณการภาษี
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="ราคางาน" value={formatMoneyLabel(satangToThb(totals.revenue), "THB")} />
        <Stat label="หักแล้ว" value={`−${formatMoneyLabel(satangToThb(deducted), "THB")}`} muted />
        <Stat label="สุทธิ" value={formatMoneyLabel(satangToThb(totals.net), "THB")} accent />
      </div>

      <p className="sr-only">
        {hasData
          ? `งาน ${totals.count} ชิ้น ราคางานรวม ${formatMoneyLabel(satangToThb(totals.revenue), "THB")} สุทธิ ${formatMoneyLabel(satangToThb(totals.net), "THB")}`
          : "ยังไม่มีรายได้ในช่วงนี้"}
      </p>

      <div className="h-52 w-full">
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={1} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                width={32}
                allowDecimals={false}
                tickFormatter={(v: number) => formatCompact(v)}
              />
              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="net" fill="var(--color-net)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
            ยังไม่มีรายได้ให้สรุปเป็นกราฟ
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums ${
          accent ? "text-foreground" : muted ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
