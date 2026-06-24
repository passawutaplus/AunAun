import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Database, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type AdminMetrics } from "./useAdminMetrics";

interface FeatureDataRow {
  table_name: string;
  total_records: number;
}

const TABLE_LABELS: Record<string, string> = {
  quotations: "quotations",
  finance_incomes: "finance_incomes",
  finance_expenses: "finance_expenses",
  finance_subscriptions: "finance_subscriptions",
  saved_clients: "saved_clients",
};

export function HealthSection({ m }: { m: AdminMetrics }) {
  const [tableCounts, setTableCounts] = React.useState<Record<string, number>>({});
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [statsError, setStatsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const { data, error } = await supabase.rpc("get_feature_data_stats" as never);
        if (error) throw error;
        if (cancelled) return;
        const counts: Record<string, number> = {};
        ((data ?? []) as FeatureDataRow[]).forEach((row) => {
          counts[row.table_name] = Number(row.total_records);
        });
        setTableCounts(counts);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "โหลดสถิติตารางไม่สำเร็จ";
        setStatsError(msg);
        toast.error("โหลดสถิติตารางไม่สำเร็จ", { description: msg });
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tables = [
    { name: "profiles", count: m.profiles.length, ok: true },
    { name: "user_roles (admin)", count: m.adminIds.size, ok: m.adminIds.size > 0 },
    ...Object.entries(TABLE_LABELS).map(([key, label]) => ({
      name: label,
      count: tableCounts[key] ?? (statsLoading ? null : 0),
      ok: !statsError,
    })),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">สุขภาพระบบ</h2>
        <p className="text-xs text-muted-foreground">สถานะตารางหลักและการเชื่อมต่อฐานข้อมูล</p>
      </div>

      {m.error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          โหลด metrics ไม่ครบ: {m.error}
        </div>
      )}

      <Card className="border-border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            สถานะฐานข้อมูล
            {statsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {tables.map((t) => (
              <div
                key={t.name}
                className="rounded-lg border border-border bg-card/50 p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                    {t.name}
                  </p>
                  <p className="text-sm font-semibold num">
                    {t.count == null ? "—" : t.count.toLocaleString()}
                  </p>
                </div>
                {t.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            * จำนวนรายการธุรกิจจาก RPC ระบบ (ทั้งผู้ใช้) · profiles จาก admin listing
          </p>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              ไทม์ไลน์กิจกรรม
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              ดูเหตุการณ์ล่าสุดทั้งระบบแบบรวมศูนย์ (ผู้ใช้ ฟีดแบ็ก ธุรกิจ ระบบ)
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
            <Link to="/admin" search={{ section: "activity_feed", q: undefined }}>
              เปิดไทม์ไลน์
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
