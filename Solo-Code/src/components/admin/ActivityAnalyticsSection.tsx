import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, LineChart as LineIcon, BarChart3, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
} from "recharts";

interface DauRow {
  day: string;
  active_users: number;
  total_events: number;
}
interface HourRow {
  hour: number;
  events: number;
  unique_users: number;
}
interface TopUserRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  active_days: number;
  total_events: number;
  last_seen: string;
}

type RpcResult<T> = { data: T | null; error: Error | null };
const rpc = <T = unknown,>(fn: string, args?: Record<string, unknown>) =>
  (
    supabase.rpc as unknown as (f: string, a?: Record<string, unknown>) => Promise<RpcResult<T>>
  ).call(supabase, fn, args);

export function ActivityAnalyticsSection() {
  const [days, setDays] = React.useState("30");
  const [topDays, setTopDays] = React.useState("7");
  const [loading, setLoading] = React.useState(true);
  const [dau, setDau] = React.useState<DauRow[]>([]);
  const [hours, setHours] = React.useState<HourRow[]>([]);
  const [top, setTop] = React.useState<TopUserRow[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [d, h, t] = await Promise.all([
        rpc("get_daily_active_users", { _days: Number(days) }),
        rpc("get_hourly_active_distribution", { _days: Number(days) }),
        rpc("get_top_active_users", { _days: Number(topDays), _limit: 20 }),
      ]);
      if (d.error) throw d.error;
      if (h.error) throw h.error;
      if (t.error) throw t.error;
      setDau((d.data ?? []) as DauRow[]);

      // Fill 0-23
      const hMap = new Map<number, HourRow>();
      ((h.data ?? []) as HourRow[]).forEach((r) =>
        hMap.set(Number(r.hour), {
          ...r,
          hour: Number(r.hour),
          events: Number(r.events),
          unique_users: Number(r.unique_users),
        }),
      );
      const filled: HourRow[] = Array.from(
        { length: 24 },
        (_, i) => hMap.get(i) ?? { hour: i, events: 0, unique_users: 0 },
      );
      setHours(filled);
      setTop((t.data ?? []) as TopUserRow[]);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
      toast.error("โหลดสถิติไม่สำเร็จ", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [days, topDays]);

  React.useEffect(() => {
    load();
  }, [load]);

  const totalEvents = dau.reduce((s, r) => s + Number(r.total_events), 0);
  const peakDay = dau.reduce<DauRow | null>(
    (p, r) => (!p || Number(r.active_users) > Number(p.active_users) ? r : p),
    null,
  );
  const peakHour = hours.reduce<HourRow | null>(
    (p, r) => (!p || Number(r.events) > Number(p.events) ? r : p),
    null,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">สถิติการเข้าใช้งาน</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ดูว่า user เข้าใช้งานวันไหน ช่วงเวลาใดบ่อยที่สุด (Asia/Bangkok)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 วัน</SelectItem>
              <SelectItem value="14">14 วัน</SelectItem>
              <SelectItem value="30">30 วัน</SelectItem>
              <SelectItem value="60">60 วัน</SelectItem>
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
            <p className="text-[11px] text-muted-foreground">เหตุการณ์รวม</p>
            <p className="text-2xl font-semibold mt-1 tabular-nums">
              {totalEvents.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">วันที่ active สูงสุด</p>
            <p className="text-base font-semibold mt-1 truncate">
              {peakDay ? `${peakDay.day} · ${peakDay.active_users} คน` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">ช่วงเวลาที่นิยมที่สุด</p>
            <p className="text-base font-semibold mt-1">
              {peakHour
                ? `${String(peakHour.hour).padStart(2, "0")}:00 · ${peakHour.events} เหตุการณ์`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Active Users line chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <LineIcon className="h-4 w-4 text-primary" />
            Daily Active Users · {days} วันล่าสุด
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : dau.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีข้อมูลการใช้งาน
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dau} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="day"
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
                  />
                  <Line
                    type="monotone"
                    dataKey="active_users"
                    name="Active users"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_events"
                    name="Events"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hourly bar chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Peak Time · ชั่วโมงที่ใช้งานสูงสุด (24 ชม.)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hours} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v: number) => `${String(v).padStart(2, "0")}`}
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
                    labelFormatter={(v) => `เวลา ${String(v).padStart(2, "0")}:00`}
                  />
                  <Bar dataKey="events" name="Events" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top active users */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Top Active Users
            </span>
            <Select value={topDays} onValueChange={setTopDays}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 วัน</SelectItem>
                <SelectItem value="14">14 วัน</SelectItem>
                <SelectItem value="30">30 วัน</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : top.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</div>
          ) : (
            <div className="space-y-2">
              {top.map((u, i) => (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Badge
                      variant={i < 3 ? "default" : "secondary"}
                      className="h-6 w-6 p-0 flex items-center justify-center text-[11px] shrink-0"
                    >
                      {i + 1}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.display_name || u.email || u.user_id.slice(0, 8)}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{u.active_days} วัน</p>
                    <p className="text-[10px] text-muted-foreground">
                      {Number(u.total_events).toLocaleString()} เหตุการณ์
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
