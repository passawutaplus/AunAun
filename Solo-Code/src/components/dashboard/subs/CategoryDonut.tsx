import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronDown } from "lucide-react";
import { formatTHB, type Subscription } from "@/data/mockData";
import { CATEGORY_COLORS } from "./shared";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function CategoryDonut({ subs }: { subs: Subscription[] }) {
  const byCategory = React.useMemo(() => {
    const map: Record<string, { total: number; items: Subscription[] }> = {};
    for (const s of subs) {
      if (!map[s.category]) map[s.category] = { total: 0, items: [] };
      map[s.category].total += s.amount;
      map[s.category].items.push(s);
    }
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        value: v.total,
        items: v.items.sort((a, b) => b.amount - a.amount),
      }))
      .sort((a, b) => b.value - a.value);
  }, [subs]);

  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">สัดส่วนตามหมวด</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] sm:h-[220px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={3}
                stroke="none"
              >
                {byCategory.map((c) => (
                  <Cell key={c.name} fill={CATEGORY_COLORS[c.name] || "var(--color-chart-1)"} />
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
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5 mt-3">
          {byCategory.map((c) => {
            const isOpen = open[c.name] ?? false;
            const color = CATEGORY_COLORS[c.name] || "var(--color-chart-1)";
            return (
              <Collapsible
                key={c.name}
                open={isOpen}
                onOpenChange={(v) => setOpen((p) => ({ ...p, [c.name]: v }))}
              >
                <CollapsibleTrigger className="w-full flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-muted-foreground truncate">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground/70 shrink-0">
                    ({c.items.length})
                  </span>
                  <span className="ml-auto num font-medium shrink-0">฿{formatTHB(c.value)}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div
                    className="pl-6 pr-2 py-1 space-y-1 border-l-2 ml-3 mt-1"
                    style={{ borderColor: color }}
                  >
                    {c.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-[11px]">
                        <span className="truncate flex-1">{item.name}</span>
                        <span className="num text-muted-foreground shrink-0">
                          ฿{formatTHB(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
