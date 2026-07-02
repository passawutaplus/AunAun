import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFinance } from "@/store/finance";
import { formatTHB } from "@/data/mockData";
import { TrendingUp, Wallet, Users, Receipt, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";

type RangeKey = "2wk" | "1mo" | "2mo" | "3mo";

const RANGE_MONTHS: Record<RangeKey, number> = {
  "2wk": 2,
  "1mo": 3,
  "2mo": 6,
  "3mo": 12,
};

const RANGE_LABELS: { key: RangeKey; label: string }[] = [
  { key: "2wk", label: "2 เดือน" },
  { key: "1mo", label: "3 เดือน" },
  { key: "2mo", label: "6 เดือน" },
  { key: "3mo", label: "12 เดือน" },
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

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function fmtPct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

type ChartPoint = {
  label: string;
  current: number;
  previous: number;
};

type ClientBar = {
  name: string;
  value: number;
  highlight?: boolean;
};

const MOCK_CLIENTS: ClientBar[] = [
  { name: "Studio Mango", value: 48000, highlight: true },
  { name: "Northern Foods", value: 35000 },
  { name: "Cafe Nimman", value: 28000 },
  { name: "Tech Bangkok", value: 22000 },
  { name: "Indie Music Lab", value: 15000 },
];

/** สร้างข้อมูลตัวอย่างเมื่อยังไม่มีรายได้/รายจ่ายจริง */
function buildMockChartData(monthLabels: string[], monthCount: number) {
  const incomeSeeds = [
    32000, 38000, 42000, 45000, 48000, 52000, 55000, 58000, 61000, 64000, 67000, 72000,
  ];
  const expenseRatio = 0.28;

  const lineData: ChartPoint[] = monthLabels.map((label, idx) => {
    const base = incomeSeeds[(idx + 12 - monthCount) % incomeSeeds.length] ?? 40000;
    const wave = Math.sin(idx * 0.9) * 4000;
    const current = Math.round(base + wave + idx * 1200);
    const previous = Math.round(current * (0.88 + (idx % 3) * 0.03));
    return { label, current, previous };
  });

  const netLineData: ChartPoint[] = lineData.map((d) => ({
    label: d.label,
    current: Math.round(d.current * (1 - expenseRatio)),
    previous: Math.round(d.previous * (1 - expenseRatio - 0.02)),
  }));

  const monthlyBars = lineData.map((d) => ({ label: d.label, value: d.current }));

  const currentIncomeTotal = lineData.reduce((s, d) => s + d.current, 0);
  const previousIncomeTotal = lineData.reduce((s, d) => s + d.previous, 0);
  const currentNetTotal = netLineData.reduce((s, d) => s + d.current, 0);
  const previousNetTotal = netLineData.reduce((s, d) => s + d.previous, 0);
  const avgMonthlyIncome =
    monthlyBars.length > 0 ? monthlyBars.reduce((s, d) => s + d.value, 0) / monthlyBars.length : 0;
  const latestMonthIncome = monthlyBars.at(-1)?.value ?? 0;
  const prevMonthIncome = monthlyBars.at(-2)?.value ?? 0;

  return {
    lineData,
    netLineData,
    clientBars: MOCK_CLIENTS.slice(0, Math.min(5, Math.max(3, monthCount))),
    monthlyBars,
    currentIncomeTotal,
    previousIncomeTotal,
    incomeChange: pctChange(currentIncomeTotal, previousIncomeTotal),
    currentNetTotal,
    previousNetTotal,
    netChange: pctChange(currentNetTotal, previousNetTotal),
    avgMonthlyIncome,
    latestMonthIncome,
    latestChange: pctChange(latestMonthIncome, prevMonthIncome),
  };
}

function hasRealChartData(
  lineData: ChartPoint[],
  clientBars: ClientBar[],
  monthlyBars: { value: number }[],
) {
  const lineHasValues = lineData.some((d) => d.current > 0 || d.previous > 0);
  const barsHaveValues = monthlyBars.some((d) => d.value > 0);
  return lineHasValues || clientBars.length > 0 || barsHaveValues;
}

export function OverviewPerformanceCharts() {
  const { incomes, workExpenses, personalExpenses } = useFinance();
  const [range, setRange] = React.useState<RangeKey>("1mo");

  const monthCount = RANGE_MONTHS[range];
  const currentMonths = React.useMemo(() => buildMonthSeries(monthCount), [monthCount]);
  const monthLabels = React.useMemo(() => currentMonths.map(formatMonthLabel), [currentMonths]);
  const previousMonths = React.useMemo(
    () => buildMonthSeries(monthCount, addMonths(new Date(), -monthCount)),
    [monthCount],
  );

  const incomeByMonth = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of incomes) map[i.month] = (map[i.month] || 0) + (i.gross || 0);
    return map;
  }, [incomes]);

  const expenseByMonth = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of [...workExpenses, ...personalExpenses]) {
      if (!e.date) continue;
      const ym = e.date.slice(0, 7);
      map[ym] = (map[ym] || 0) + (e.amount || 0);
    }
    return map;
  }, [workExpenses, personalExpenses]);

  const lineData: ChartPoint[] = React.useMemo(
    () =>
      currentMonths.map((ym, idx) => ({
        label: formatMonthLabel(ym),
        current: incomeByMonth[ym] || 0,
        previous: incomeByMonth[previousMonths[idx]] || 0,
      })),
    [currentMonths, previousMonths, incomeByMonth],
  );

  const netLineData: ChartPoint[] = React.useMemo(
    () =>
      currentMonths.map((ym, idx) => {
        const curIncome = incomeByMonth[ym] || 0;
        const curExp = expenseByMonth[ym] || 0;
        const prevYm = previousMonths[idx];
        const prevIncome = incomeByMonth[prevYm] || 0;
        const prevExp = expenseByMonth[prevYm] || 0;
        return {
          label: formatMonthLabel(ym),
          current: curIncome - curExp,
          previous: prevIncome - prevExp,
        };
      }),
    [currentMonths, previousMonths, incomeByMonth, expenseByMonth],
  );

  const currentIncomeTotal = lineData.reduce((s, d) => s + d.current, 0);
  const previousIncomeTotal = lineData.reduce((s, d) => s + d.previous, 0);
  const incomeChange = pctChange(currentIncomeTotal, previousIncomeTotal);

  const currentNetTotal = netLineData.reduce((s, d) => s + d.current, 0);
  const previousNetTotal = netLineData.reduce((s, d) => s + d.previous, 0);
  const netChange = pctChange(currentNetTotal, previousNetTotal);

  const clientBars: ClientBar[] = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const ym of currentMonths) {
      for (const i of incomes.filter((inc) => inc.month === ym)) {
        const name = i.client || "ไม่ระบุ";
        map[name] = (map[name] || 0) + (i.gross || 0);
      }
    }
    const sorted = Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value], idx) => ({ name, value, highlight: idx === 0 }));
    return sorted;
  }, [incomes, currentMonths]);

  const monthlyBars = React.useMemo(
    () =>
      currentMonths.map((ym) => ({
        label: formatMonthLabel(ym),
        value: incomeByMonth[ym] || 0,
      })),
    [currentMonths, incomeByMonth],
  );

  const avgMonthlyIncome =
    monthlyBars.length > 0 ? monthlyBars.reduce((s, d) => s + d.value, 0) / monthlyBars.length : 0;

  const latestMonthIncome = monthlyBars.at(-1)?.value ?? 0;
  const prevMonthIncome = monthlyBars.at(-2)?.value ?? 0;
  const latestChange = pctChange(latestMonthIncome, prevMonthIncome);

  const realHasData = hasRealChartData(lineData, clientBars, monthlyBars);
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";
  const showSampleCharts = !realHasData && isDemoMode;
  const mock = React.useMemo(
    () => buildMockChartData(monthLabels, monthCount),
    [monthLabels, monthCount],
  );
  const isDemo = showSampleCharts;

  const display = isDemo
    ? mock
    : {
        lineData,
        netLineData,
        clientBars,
        monthlyBars,
        currentIncomeTotal,
        previousIncomeTotal,
        incomeChange,
        currentNetTotal,
        previousNetTotal,
        netChange,
        avgMonthlyIncome,
        latestMonthIncome,
        latestChange,
      };

  if (!realHasData && !isDemoMode) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Performance Analytics</h2>
          <p className="text-xs text-muted-foreground">กราฟรายได้ รายจ่าย และลูกค้าชั้นนำ</p>
        </div>
        <Card className="border-border/60 border-dashed shadow-none">
          <CardContent className="py-10 text-center space-y-2">
            <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm font-medium">ยังไม่มีข้อมูลรายได้สำหรับแสดงกราฟ</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              บันทึกรายได้หรือปิดงานใบเสนอราคาแล้ว ข้อมูลจะปรากฏที่นี่อัตโนมัติ
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Performance Analytics</h2>
          <p className="text-xs text-muted-foreground">กราฟรายได้ รายจ่าย และลูกค้าชั้นนำ</p>
        </div>
        <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5">
          {RANGE_LABELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                range === key
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <KpiChartCard
          title="รายได้รวม"
          icon={<TrendingUp className="h-4 w-4" />}
          current={`฿${formatTHB(display.currentIncomeTotal)}`}
          previous={`฿${formatTHB(display.previousIncomeTotal)}`}
          change={display.incomeChange}
          changeLabel="เทียบช่วงก่อนหน้า"
          demo={isDemo}
        >
          <DualLineChart data={display.lineData} />
        </KpiChartCard>

        <KpiChartCard
          title="กำไรสุทธิ (รายได้ − รายจ่าย)"
          icon={<Wallet className="h-4 w-4" />}
          current={`฿${formatTHB(display.currentNetTotal)}`}
          previous={`฿${formatTHB(display.previousNetTotal)}`}
          change={display.netChange}
          changeLabel="เทียบช่วงก่อนหน้า"
          demo={isDemo}
        >
          <DualLineChart data={display.netLineData} />
        </KpiChartCard>

        <KpiChartCard
          title="รายได้ตามลูกค้า"
          icon={<Users className="h-4 w-4" />}
          current={`${display.clientBars.length} ราย`}
          previous="Top 5"
          change={display.clientBars[0] ? 100 : 0}
          changeLabel={display.clientBars[0]?.name ?? "—"}
          hideChangeBadge
          demo={isDemo}
        >
          <HorizontalBarChart data={display.clientBars} />
        </KpiChartCard>

        <KpiChartCard
          title="รายได้เฉลี่ยต่อเดือน"
          icon={<Receipt className="h-4 w-4" />}
          current={`฿${formatTHB(Math.round(display.avgMonthlyIncome))}`}
          previous={`฿${formatTHB(display.latestMonthIncome)}`}
          change={display.latestChange}
          changeLabel="เทียบเดือนก่อน"
          demo={isDemo}
        >
          <VerticalBarWithAvg data={display.monthlyBars} avg={display.avgMonthlyIncome} />
        </KpiChartCard>
      </div>
    </section>
  );
}

function KpiChartCard({
  title,
  icon,
  current,
  previous,
  change,
  changeLabel,
  hideChangeBadge,
  demo,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  current: string;
  previous: string;
  change: number;
  changeLabel: string;
  hideChangeBadge?: boolean;
  demo?: boolean;
  children: React.ReactNode;
}) {
  const positive = change >= 0;

  return (
    <Card className={cn("border-border/60 shadow-card overflow-hidden", demo && "opacity-95")}>
      <CardHeader className="pb-2 space-y-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary-soft text-primary p-1.5">{icon}</span>
          <CardTitle className="text-sm font-semibold flex-1">{title}</CardTitle>
          {demo && (
            <span className="text-[9px] font-semibold uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              mock
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              ช่วงที่เลือก
            </p>
            <p className="text-lg font-semibold num">{current}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">อ้างอิง</p>
            <p className="text-sm num text-muted-foreground">{previous}</p>
          </div>
          {!hideChangeBadge && (
            <span
              className={cn(
                "text-xs font-semibold rounded-full px-2 py-0.5",
                positive ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {fmtPct(change)} {changeLabel}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[180px]">{children}</div>
      </CardContent>
    </Card>
  );
}

function DualLineChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
            name === "current" ? "ช่วงนี้" : "ช่วงก่อน",
          ]}
        />
        <Line
          type="monotone"
          dataKey="current"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="previous"
          stroke="oklch(0.85 0.08 70)"
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 4"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function HorizontalBarChart({ data }: { data: ClientBar[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, max * 1.1]}
          tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmtCompact}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            background: "var(--color-card)",
            fontSize: 12,
          }}
          formatter={(v: number) => [`฿${formatTHB(v)}`, "รายได้"]}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.highlight ? "var(--color-primary)" : "var(--color-muted-foreground)"}
              fillOpacity={entry.highlight ? 1 : 0.35}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function VerticalBarWithAvg({
  data,
  avg,
}: {
  data: { label: string; value: number }[];
  avg: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
          formatter={(v: number) => [`฿${formatTHB(v)}`, "รายได้"]}
        />
        <ReferenceLine
          y={avg}
          stroke="var(--color-primary)"
          strokeDasharray="4 4"
          strokeOpacity={0.7}
          label={{
            value: "Avg",
            position: "insideTopRight",
            fontSize: 10,
            fill: "var(--color-primary)",
          }}
        />
        <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
