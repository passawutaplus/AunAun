import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Smartphone, Tablet, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface DeviceRow {
  device_type: "mobile" | "tablet" | "desktop";
  sessions: number;
  unique_users: number;
  pct: number;
}
interface BreakdownRow {
  label: string;
  sessions: number;
  unique_users: number;
}

const COLORS: Record<string, string> = {
  desktop: "var(--chart-1)",
  mobile: "var(--chart-2)",
  tablet: "var(--chart-3)",
};
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const rpc = (fn: string, args?: Record<string, unknown>) =>
  (
    supabase.rpc as unknown as (
      f: string,
      a?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  ).call(supabase, fn, args);

export function DeviceAnalyticsSection() {
  const [days, setDays] = React.useState("30");
  const [rows, setRows] = React.useState<DeviceRow[]>([]);
  const [os, setOs] = React.useState<BreakdownRow[]>([]);
  const [browsers, setBrowsers] = React.useState<BreakdownRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        rpc("get_device_usage_stats", { _days: Number(days) }),
        rpc("get_device_breakdown", { _days: Number(days), _by: "os" }),
        rpc("get_device_breakdown", { _days: Number(days), _by: "browser" }),
      ]);
      if (a.error) throw new Error(a.error.message);
      if (b.error) throw new Error(b.error.message);
      if (c.error) throw new Error(c.error.message);
      setRows((a.data as DeviceRow[]) ?? []);
      setOs((b.data as BreakdownRow[]) ?? []);
      setBrowsers((c.data as BreakdownRow[]) ?? []);
    } catch (e) {
      toast.error("โหลดสถิติอุปกรณ์ไม่สำเร็จ", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [days]);

  React.useEffect(() => {
    load();
  }, [load]);

  const totalSessions = rows.reduce((s, r) => s + Number(r.sessions), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">อุปกรณ์ที่ใช้งาน</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            มือถือ / แทปเลต / คอม — ใช้วางแผน UI และพัฒนาฟีเจอร์ตามอุปกรณ์ของผู้ใช้จริง
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 วัน</SelectItem>
              <SelectItem value="30">30 วัน</SelectItem>
              <SelectItem value="90">90 วัน</SelectItem>
              <SelectItem value="365">1 ปี</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["desktop", "tablet", "mobile"] as const).map((dt) => {
          const r = rows.find((x) => x.device_type === dt);
          const Icon = ICONS[dt];
          return (
            <Card key={dt}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground capitalize">{dt}</span>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-semibold tabular-nums">{r ? `${r.pct}%` : "—"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {r
                    ? `${Number(r.sessions).toLocaleString()} sessions · ${Number(r.unique_users).toLocaleString()} คน`
                    : "ยังไม่มีข้อมูล"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">สัดส่วนอุปกรณ์</CardTitle>
          </CardHeader>
          <CardContent>
            {totalSessions === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={rows}
                      dataKey="sessions"
                      nameKey="device_type"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {rows.map((r) => (
                        <Cell
                          key={r.device_type}
                          fill={COLORS[r.device_type] ?? "var(--chart-4)"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--popover-foreground)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <BreakdownCard title="OS ยอดนิยม" rows={os} />
        <BreakdownCard title="Browser ยอดนิยม" rows={browsers} />
      </div>
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const max = rows[0]?.sessions ?? 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => {
              const pct = max > 0 ? (Number(r.sessions) / max) * 100 : 0;
              return (
                <div key={r.label} className="grid grid-cols-12 items-center gap-2 text-xs">
                  <span className="col-span-4 truncate font-medium">{r.label}</span>
                  <div className="col-span-6 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.max(2, pct)}%` }} />
                  </div>
                  <span className="col-span-2 text-right tabular-nums text-muted-foreground">
                    {Number(r.sessions).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
