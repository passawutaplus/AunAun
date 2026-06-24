import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, BarChart3, Trophy, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface TrendRow {
  day: string;
  feature: string;
  events: number;
  unique_users: number;
}

interface UsageRow {
  feature: string;
  total_events: number;
  unique_users: number;
  last_used: string | null;
}

const FEATURE_LABELS: Record<string, string> = {
  "dashboard.overview": "ภาพรวม (Dashboard)",
  "dashboard.finance": "Finance",
  "dashboard.planner": "Planner",
  "dashboard.clients": "ลูกค้า",
  "dashboard.suppliers": "Suppliers",
  "dashboard.settings": "ตั้งค่า",
};

function labelFor(key: string) {
  return FEATURE_LABELS[key] ?? key;
}

type Granularity = "day" | "week";

export function FeatureUsageSection() {
  const [rows, setRows] = React.useState<UsageRow[]>([]);
  const [trend, setTrend] = React.useState<TrendRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState("30");
  const [granularity, setGranularity] = React.useState<Granularity>("day");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [{ data, error }, { data: tData, error: tErr }] = await Promise.all([
        supabase.rpc("get_feature_usage_stats", { _days: Number(days) }),
        (
          supabase.rpc as unknown as (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<{ data: TrendRow[] | null; error: Error | null }>
        )("get_feature_usage_trend", { _days: Number(days) }),
      ]);
      if (error) throw error;
      if (tErr) throw tErr;
      setRows((data ?? []) as UsageRow[]);
      setTrend((tData ?? []) as TrendRow[]);
    } catch (e) {
      toast.error("โหลดข้อมูลไม่สำเร็จ", { description: String((e as Error).message) });
    } finally {
      setLoading(false);
    }
  }, [days]);

  React.useEffect(() => {
    load();
  }, [load]);

  const max = rows[0]?.total_events ?? 0;
  const totalEvents = rows.reduce((s, r) => s + Number(r.total_events), 0);

  // Top 5 features for the chart legend (avoid clutter)
  const topFeatures = React.useMemo(() => rows.slice(0, 5).map((r) => r.feature), [rows]);

  // Build chart data: pivot trend rows -> [{ bucket, [feature]: events, ... }]
  const chartData = React.useMemo(() => {
    const bucketKey = (iso: string) => {
      if (granularity === "day") return iso;
      const d = new Date(iso);
      // Week start (Mon)
      const dow = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - dow);
      return d.toISOString().slice(0, 10);
    };
    const map = new Map<string, Record<string, number | string>>();
    trend.forEach((r) => {
      if (!topFeatures.includes(r.feature)) return;
      const k = bucketKey(r.day);
      const row = map.get(k) ?? { bucket: k };
      row[r.feature] = (Number(row[r.feature] ?? 0) as number) + Number(r.events);
      map.set(k, row);
    });
    return Array.from(map.values()).sort((a, b) =>
      String(a.bucket).localeCompare(String(b.bucket)),
    );
  }, [trend, topFeatures, granularity]);

  const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
            ฟีเจอร์ที่ใช้บ่อยที่สุด
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            จัดอันดับฟีเจอร์ตามการเปิดใช้งานของผู้ใช้ทั้งหมด
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">24 ชั่วโมง</SelectItem>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">ฟีเจอร์ที่มีข้อมูล</p>
            <p className="text-2xl font-semibold mt-1">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">เหตุการณ์รวม</p>
            <p className="text-2xl font-semibold mt-1">{totalEvents.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3" /> อันดับ 1
            </p>
            <p className="text-base font-semibold mt-1 truncate">
              {rows[0] ? labelFor(rows[0].feature) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ───────── Trend chart ───────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              แนวโน้มการใช้งาน · Top 5 ฟีเจอร์
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={granularity === "day" ? "default" : "outline"}
                onClick={() => setGranularity("day")}
                className="h-7 px-2 text-[11px]"
              >
                รายวัน
              </Button>
              <Button
                size="sm"
                variant={granularity === "week" ? "default" : "outline"}
                onClick={() => setGranularity("week")}
                className="h-7 px-2 text-[11px]"
              >
                รายสัปดาห์
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีข้อมูลแนวโน้มในช่วงนี้
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--popover-foreground)",
                    }}
                    labelFormatter={(v) =>
                      granularity === "week" ? `สัปดาห์ที่เริ่ม ${v}` : String(v)
                    }
                    formatter={(value, name) => [value, labelFor(String(name))]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => labelFor(String(v))} />
                  {topFeatures.map((feat, i) => (
                    <Line
                      key={feat}
                      type="monotone"
                      dataKey={feat}
                      stroke={palette[i % palette.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            อันดับการใช้งาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีข้อมูลการใช้งานในช่วงนี้
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => {
                const pct = max > 0 ? (Number(r.total_events) / max) * 100 : 0;
                return (
                  <div
                    key={r.feature}
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
                          <p className="text-sm font-medium truncate">{labelFor(r.feature)}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {r.feature}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">
                          {Number(r.total_events).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{r.unique_users} คน</p>
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
