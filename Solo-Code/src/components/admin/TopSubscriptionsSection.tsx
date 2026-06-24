import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CreditCard, Trophy, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubRow {
  name: string;
  category: string | null;
  user_count: number;
  total_subscriptions: number;
  avg_price: number;
  total_monthly_value: number;
}

const fmtTHB = (n: number) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);

export function TopSubscriptionsSection() {
  const [rows, setRows] = React.useState<SubRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: SubRow[] | null; error: Error | null }>
      )("get_top_subscriptions", { _limit: 50 });
      if (error) throw error;
      setRows((data ?? []) as SubRow[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("โหลดข้อมูลไม่สำเร็จ", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const maxUsers = rows[0]?.user_count ?? 0;
  const totalUsers = rows.reduce((s, r) => s + Number(r.user_count), 0);
  const totalMonthly = rows.reduce((s, r) => s + Number(r.total_monthly_value), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
            แอป/บริการที่ user Subscribe มากที่สุด
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            จัดอันดับจากจำนวน user ที่ active ใช้บริการแต่ละตัว (Subscriber Tracker)
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">บริการทั้งหมด</p>
            <p className="text-2xl font-semibold mt-1">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Subscriptions รวม
            </p>
            <p className="text-2xl font-semibold mt-1">
              {rows.reduce((s, r) => s + Number(r.total_subscriptions), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3" /> มูลค่ารวม/เดือน
            </p>
            <p className="text-2xl font-semibold mt-1">฿{fmtTHB(totalMonthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3" /> อันดับ 1
            </p>
            <p className="text-base font-semibold mt-1 truncate">{rows[0]?.name ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            อันดับความนิยม
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีข้อมูล Subscriptions ในระบบ
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => {
                const pct = maxUsers > 0 ? (Number(r.user_count) / maxUsers) * 100 : 0;
                const sharePct =
                  totalUsers > 0 ? ((Number(r.user_count) / totalUsers) * 100).toFixed(1) : "0";
                return (
                  <div
                    key={r.name}
                    className="relative rounded-xl border border-border bg-card overflow-hidden"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/15 to-primary/5"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                    <div className="relative px-3 py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Badge
                          variant={i < 3 ? "default" : "secondary"}
                          className="h-6 w-6 p-0 flex items-center justify-center text-[11px] shrink-0"
                        >
                          {i + 1}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {r.category || "ไม่ระบุหมวด"} · เฉลี่ย ฿{fmtTHB(Number(r.avg_price))}
                            /เดือน
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">
                          {Number(r.user_count).toLocaleString()} คน
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {sharePct}% · ฿{fmtTHB(Number(r.total_monthly_value))}/ด.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
