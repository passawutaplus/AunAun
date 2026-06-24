import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/store/finance";
import { formatTHB, INCOME_TYPE_META, type IncomeType } from "@/data/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = [
  "var(--color-primary)",
  "oklch(0.78 0.15 65)",
  "oklch(0.7 0.16 200)",
  "oklch(0.72 0.18 320)",
  "oklch(0.74 0.17 145)",
  "oklch(0.76 0.12 30)",
];

export function IncomeBreakdown() {
  const { incomes } = useFinance();

  const data = React.useMemo(() => {
    const map = new Map<IncomeType, number>();
    for (const i of incomes) {
      const t = (i.incomeType ?? "freelance") as IncomeType;
      map.set(t, (map.get(t) ?? 0) + i.gross);
    }
    return Array.from(map.entries())
      .map(([type, value]) => ({
        type,
        value,
        label: INCOME_TYPE_META[type].label,
        section: INCOME_TYPE_META[type].section,
      }))
      .sort((a, b) => b.value - a.value);
  }, [incomes]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">รายได้แยกตามประเภท</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div className="h-[180px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {data.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                    }}
                    formatter={(v: number) => `฿${formatTHB(v)}`}
                  />
                  <Legend wrapperStyle={{ display: "none" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {data.map((d, idx) => {
                const pct = (d.value / total) * 100;
                return (
                  <div key={d.type} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ background: COLORS[idx % COLORS.length] }}
                    />
                    <span className="flex-1 truncate">
                      {d.label}
                      <span className="text-muted-foreground ml-1">{d.section}</span>
                    </span>
                    <span className="num text-muted-foreground">{pct.toFixed(0)}%</span>
                    <span className="num font-medium">฿{formatTHB(d.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
