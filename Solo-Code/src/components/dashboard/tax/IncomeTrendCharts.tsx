import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFinance } from "@/store/finance";
import { formatTHB } from "@/data/mockData";
import { TrendingUp, Users, Wallet } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";

type RangeKey = "6" | "12";

const RANGE_OPTIONS: { key: RangeKey; label: string; months: number }[] = [
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
  return new Date(`${ym}-01`).toLocaleDateString("th-TH", { month: "short" });
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
  fontSize: 12,
};

function RangeToggle({
  range,
  onChange,
}: {
  range: RangeKey;
  onChange: (r: RangeKey) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
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
  );
}

export function IncomeCumulativeChart() {
  const { incomes } = useFinance();
  const [range, setRange] = React.useState<RangeKey>("6");
  const monthCount = RANGE_OPTIONS.find((r) => r.key === range)?.months ?? 6;

  const chartData = React.useMemo(() => {
    const series = buildMonthSeries(monthCount);
    const grossByMonth = new Map<string, number>();
    for (const i of incomes) {
      grossByMonth.set(i.month, (grossByMonth.get(i.month) ?? 0) + i.gross);
    }
    let cumulative = 0;
    return series.map((ym) => {
      cumulative += grossByMonth.get(ym) ?? 0;
      return { label: formatMonthLabel(ym), cumulative };
    });
  }, [incomes, monthCount]);

  const hasData = chartData.some((d) => d.cumulative > 0);
  const latest = chartData.at(-1)?.cumulative ?? 0;

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            รายได้สะสม
          </CardTitle>
          {hasData && (
            <p className="text-[11px] text-muted-foreground mt-1">
              รวม <span className="num font-semibold text-foreground">฿{formatTHB(latest)}</span>{" "}
              ในช่วงที่เลือก
            </p>
          )}
        </div>
        <RangeToggle range={range} onChange={setRange} />
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground py-8 text-center">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="h-[180px]">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`฿${formatTHB(v)}`, "สะสม"]}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--color-primary)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function IncomeNetTrendChart() {
  const { incomes } = useFinance();
  const [range, setRange] = React.useState<RangeKey>("6");
  const monthCount = RANGE_OPTIONS.find((r) => r.key === range)?.months ?? 6;

  const chartData = React.useMemo(() => {
    const series = buildMonthSeries(monthCount);
    const grossByMonth = new Map<string, number>();
    const whtByMonth = new Map<string, number>();
    for (const i of incomes) {
      grossByMonth.set(i.month, (grossByMonth.get(i.month) ?? 0) + i.gross);
      whtByMonth.set(i.month, (whtByMonth.get(i.month) ?? 0) + i.withholding);
    }
    return series.map((ym) => {
      const gross = grossByMonth.get(ym) ?? 0;
      const wht = whtByMonth.get(ym) ?? 0;
      return { label: formatMonthLabel(ym), gross, net: gross - wht, wht };
    });
  }, [incomes, monthCount]);

  const hasData = chartData.some((d) => d.gross > 0);

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary shrink-0" />
            รายได้ก่อน/หลังหัก ณ ที่จ่าย
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-1">เทียบเงินรับจริงกับที่ถูกหักไว้</p>
        </div>
        <RangeToggle range={range} onChange={setRange} />
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground py-8 text-center">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="h-[180px]">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [
                    `฿${formatTHB(v)}`,
                    name === "gross" ? "ก่อนหัก" : name === "net" ? "สุทธิ" : "หัก ณ ที่จ่าย",
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="line"
                  wrapperStyle={{ fontSize: 10, paddingBottom: 4 }}
                  formatter={(value) => (value === "gross" ? "ก่อนหัก" : "สุทธิ")}
                />
                <Line
                  type="monotone"
                  dataKey="gross"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "var(--color-primary)" }}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="oklch(0.72 0.17 145)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "oklch(0.72 0.17 145)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function IncomeTopClientsChart() {
  const { incomes } = useFinance();

  const chartData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const i of incomes) {
      const name = i.client.trim() || "ไม่ระบุ";
      map.set(name, (map.get(name) ?? 0) + i.gross);
    }
    return Array.from(map.entries())
      .map(([client, gross]) => ({ client, gross }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 5);
  }, [incomes]);

  const total = chartData.reduce((s, d) => s + d.gross, 0);

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary shrink-0" />
          รายได้ตามลูกค้า
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="h-[180px]">
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtCompact}
                />
                <YAxis
                  type="category"
                  dataKey="client"
                  width={72}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`฿${formatTHB(v)}`, "รายได้"]}
                />
                <Bar dataKey="gross" fill="var(--color-primary)" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
