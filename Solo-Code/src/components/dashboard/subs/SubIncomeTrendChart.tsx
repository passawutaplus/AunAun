import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFinance } from "@/store/finance";
import { formatTHB, type Subscription } from "@/data/mockData";
import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type RangeKey = "3" | "6" | "12";

const RANGE_OPTIONS: { key: RangeKey; label: string; months: number }[] = [
  { key: "3", label: "3 เดือน", months: 3 },
  { key: "6", label: "6 เดือน", months: 6 },
  { key: "12", label: "12 เดือน", months: 12 },
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(d: Date, n: number) {
  const next = new Date(d);
  next.setMonth(next.getMonth() + n);
  return next;
}

function buildMonthSeries(count: number, end = new Date()) {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(monthKey(addMonths(end, -i)));
  }
  return months;
}

function formatMonthLabel(ym: string) {
  return new Date(`${ym}-01`).toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

type ChartPoint = {
  ym: string;
  label: string;
  income: number;
  subs: number;
};

export function SubIncomeTrendChart({ subs }: { subs: Subscription[] }) {
  const { incomes } = useFinance();
  const [range, setRange] = React.useState<RangeKey>("6");

  const monthCount = RANGE_OPTIONS.find((r) => r.key === range)?.months ?? 6;
  const monthlySubs = subs.reduce((s, x) => s + x.amount, 0);

  const chartData = React.useMemo<ChartPoint[]>(() => {
    const series = buildMonthSeries(monthCount);
    const incomeByMonth = new Map<string, number>();
    for (const i of incomes) {
      incomeByMonth.set(i.month, (incomeByMonth.get(i.month) ?? 0) + i.gross);
    }
    return series.map((ym) => ({
      ym,
      label: formatMonthLabel(ym),
      income: incomeByMonth.get(ym) ?? 0,
      subs: monthlySubs,
    }));
  }, [incomes, monthCount, monthlySubs]);

  const hasIncome = chartData.some((d) => d.income > 0);
  const latest = chartData[chartData.length - 1];
  const ratio =
    latest && latest.income > 0 ? ((latest.subs / latest.income) * 100).toFixed(1) : null;

  return (
    <Card className="animate-fade-up border-primary/30 h-full flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" /> รายได้ vs ค่าซัพ
          </CardTitle>
          {ratio !== null && (
            <p className="text-[11px] text-muted-foreground mt-1">
              เดือนล่าสุด ค่าซัพกิน{" "}
              <span
                className={cn(
                  "num font-semibold",
                  Number(ratio) >= 50
                    ? "text-destructive"
                    : Number(ratio) >= 30
                      ? "text-amber-600"
                      : "text-emerald-600",
                )}
              >
                {ratio}%
              </span>{" "}
              ของรายได้
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRange(opt.key)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                range === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {!hasIncome ? (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center">
            <p className="text-xs text-muted-foreground">
              เพิ่มรายได้ในแท็บ &quot;ภาษี &amp; รายได้&quot; เพื่อดูแนวโน้มเทียบค่าซัพ
            </p>
            <p className="num text-sm font-semibold text-foreground">
              ค่าซัพปัจจุบัน ฿{formatTHB(monthlySubs)}/เดือน
            </p>
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtCompact}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [
                    `฿${formatTHB(v)}`,
                    name === "income" ? "รายได้" : "ค่าซัพ",
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="line"
                  wrapperStyle={{ fontSize: 10, paddingBottom: 4 }}
                  formatter={(value) => (value === "income" ? "รายได้" : "ค่าซัพ")}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--color-primary)" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="subs"
                  stroke="oklch(0.72 0.17 55)"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
