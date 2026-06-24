import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Flame, Activity, ShieldAlert } from "lucide-react";
import { useFinance } from "@/store/finance";
import { formatTHB, type Subscription } from "@/data/mockData";

export function SurvivalMode({ subs }: { subs: Subscription[] }) {
  const { incomes } = useFinance();
  const activeSubs = subs.filter((s) => (s.status ?? "active") === "active");
  const monthly = activeSubs.reduce((a, b) => a + b.amount, 0);

  // average income (last 3 months with data)
  const byMonth = new Map<string, number>();
  for (const i of incomes) byMonth.set(i.month, (byMonth.get(i.month) ?? 0) + i.gross);
  const months = Array.from(byMonth.values()).sort().slice(-3);
  const avgIncome = months.length ? months.reduce((a, b) => a + b, 0) / months.length : 0;

  // current month income
  const ym = new Date().toISOString().slice(0, 7);
  const currentIncome = incomes.filter((i) => i.month === ym).reduce((a, b) => a + b.gross, 0);

  const ratio = avgIncome > 0 ? (monthly / avgIncome) * 100 : 0;
  const shortfall = Math.max(0, monthly - currentIncome);
  const burnMonths = monthly > 0 && avgIncome > 0 ? avgIncome / monthly : 0;

  const ratioStatus = ratio >= 50 ? "danger" : ratio >= 30 ? "warn" : "safe";
  const ratioCls =
    ratioStatus === "danger"
      ? "text-destructive"
      : ratioStatus === "warn"
        ? "text-amber-600"
        : "text-emerald-600";

  return (
    <Card className="animate-fade-up border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" /> Survival Mode · ภาพรวมความเสี่ยง
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {avgIncome === 0 ? (
          <p className="text-xs text-muted-foreground">
            เพิ่มรายได้ในแท็บ "ภาษี & รายได้" เพื่อให้ระบบคำนวณความเสี่ยงให้
          </p>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> ค่าซัพ vs รายได้เฉลี่ย
                </span>
                <span className={`num font-semibold ${ratioCls}`}>{ratio.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(100, ratio)} className="h-2" />
              <p className="text-[11px] text-muted-foreground mt-1">
                {ratioStatus === "danger" && "⚠️ อันตราย — ค่าซัพกินรายได้เกินครึ่ง"}
                {ratioStatus === "warn" && "เตือน — ค่าซัพเริ่มสูง ควรทบทวน"}
                {ratioStatus === "safe" && "ปลอดภัย — ค่าซัพอยู่ในเกณฑ์ดี"}
              </p>
            </div>

            {shortfall > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    Shortfall Alert
                  </p>
                  <p className="text-muted-foreground">
                    ต้องการอีก{" "}
                    <span className="num font-semibold text-foreground">
                      ฿{formatTHB(shortfall)}
                    </span>{" "}
                    เพื่อครอบคลุมค่าใช้จ่ายคงที่ของเดือนนี้
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500 shrink-0" />
              <div className="text-xs flex-1">
                <p className="font-semibold">Burn Rate</p>
                <p className="text-muted-foreground">
                  ถ้าไม่มีรายได้ใหม่ จ่ายค่าซัพได้อีก{" "}
                  <span className="num font-semibold text-foreground">
                    {burnMonths.toFixed(1)} เดือน
                  </span>
                </p>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-2 text-center pt-1">
          <div className="rounded-lg bg-card border border-border p-2">
            <p className="text-[10px] text-muted-foreground">ค่าซัพ/เดือน</p>
            <p className="num text-sm font-semibold">฿{formatTHB(monthly)}</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-2">
            <p className="text-[10px] text-muted-foreground">รายได้เฉลี่ย</p>
            <p className="num text-sm font-semibold">฿{formatTHB(avgIncome)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
