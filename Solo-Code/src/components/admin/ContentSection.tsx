import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { CreditCard, ShoppingBag, Layers, Wallet } from "lucide-react";
import { type AdminMetrics, fmtTHB } from "./useAdminMetrics";

export function ContentSection({ m }: { m: AdminMetrics }) {
  const monthlyRecurring = m.subscriptions
    .filter((s) => s.is_active)
    .reduce((s, sub) => {
      const monthly = sub.cycle === "yearly" ? Number(sub.price) / 12 : Number(sub.price);
      return s + monthly;
    }, 0);

  const totalExp = m.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const expByCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    m.expenses.forEach((e) => {
      const k = e.category || "อื่นๆ";
      map.set(k, (map.get(k) ?? 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries())
      .map(([cat, total]) => ({ cat, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [m.expenses]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Subscriptions & Expenses</h2>
        <p className="text-xs text-muted-foreground">
          ค่าสมัครรายเดือนและค่าใช้จ่ายในระบบของผู้ใช้ทั้งหมด
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Subscriptions"
          value={m.subscriptions.length}
          sub={`${m.subscriptions.filter((s) => s.is_active).length} active`}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          label="MRR (รวมในระบบ)"
          value={`฿${fmtTHB(monthlyRecurring)}`}
          sub="ค่าสมัครรายเดือน"
          icon={<ShoppingBag className="h-4 w-4" />}
          accent
        />
        <StatCard
          label="ค่าใช้จ่ายรวม"
          value={`฿${fmtTHB(totalExp)}`}
          sub={`${m.expenses.length} รายการ`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="หมวดที่บันทึก"
          value={expByCategory.length}
          sub="หมวดค่าใช้จ่าย"
          icon={<Layers className="h-4 w-4" />}
        />
      </div>

      <Card className="border-border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">หมวดค่าใช้จ่ายในระบบ</h3>
          {expByCategory.length === 0 ? (
            <p className="text-xs text-muted-foreground">ยังไม่มีค่าใช้จ่ายในระบบ</p>
          ) : (
            <div className="space-y-2">
              {expByCategory.map((e) => {
                const max = expByCategory[0].total;
                const pct = max ? (e.total / max) * 100 : 0;
                return (
                  <div key={e.cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{e.cat}</span>
                      <span className="num text-muted-foreground">฿{fmtTHB(e.total)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-[10px] text-muted-foreground">
            * รายชื่อ Subscription ยอดนิยมดูได้ที่แท็บ <strong>Top Subscriptions</strong> ในเมนู
            Subscriptions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
