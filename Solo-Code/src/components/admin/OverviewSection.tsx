import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Users,
  Wallet,
  FileText,
  Layers,
  TrendingUp,
  Activity,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Tablet,
  Monitor,
  Ticket,
  MessageSquareHeart,
} from "lucide-react";
import { useAllTickets } from "@/store/supportTickets";
import { useAllBetaFeedback } from "@/store/betaFeedback";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type AdminMetrics, fmtTHB, groupByDay, activeUserIds } from "./useAdminMetrics";

interface DeviceRow {
  device_type: string;
  sessions: number;
  pct: number;
}

export function OverviewSection({ m }: { m: AdminMetrics }) {
  const { tickets, newCount } = useAllTickets();
  const { items: betaItems } = useAllBetaFeedback();
  const [devices, setDevices] = React.useState<DeviceRow[]>([]);
  const [deviceError, setDeviceError] = React.useState<string | null>(null);
  const openTickets = tickets.filter((t) => !["closed", "wont_fix"].includes(t.status)).length;
  const betaToday = betaItems.filter(
    (b) => b.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10),
  ).length;
  React.useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (
          supabase.rpc as unknown as (
            fn: string,
            args?: Record<string, unknown>,
          ) => Promise<{ data: DeviceRow[] | null; error: { message: string } | null }>
        ).call(supabase, "get_device_usage_stats", { _days: 30 });
        if (error) throw new Error(error.message);
        setDevices(data ?? []);
        setDeviceError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "โหลดสถิติอุปกรณ์ไม่สำเร็จ";
        setDeviceError(msg);
        toast.error("โหลดสถิติอุปกรณ์ไม่สำเร็จ", { description: msg });
      }
    })();
  }, []);
  const dev = (k: string) => devices.find((d) => d.device_type === k);
  const totalGross = m.incomes.reduce((s, r) => s + Number(r.gross || 0), 0);
  const totalExp = m.expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const active7 = activeUserIds([...m.quotations, ...m.incomes, ...m.expenses], 7).size;
  const newUsers7 = m.profiles.filter(
    (p) => Date.now() - new Date(p.created_at).getTime() < 7 * 86_400_000,
  ).length;

  const signupSeries = groupByDay(m.profiles, 14);
  const incomeSeries = groupByDay(m.incomes, 14, (rs) =>
    rs.reduce((s, r) => s + Number(r.gross || 0), 0),
  );
  const quoteSeries = groupByDay(m.quotations, 14);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">ภาพรวม</h2>
        <p className="text-xs text-muted-foreground">สรุปภาพรวมทั้งระบบใน 7-14 วันล่าสุด</p>
      </div>

      {m.error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          โหลดข้อมูลบางส่วนไม่สำเร็จ — ตัวเลขอาจไม่ครบ: {m.error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="สมาชิกทั้งหมด"
          value={m.profiles.length}
          sub={`+${newUsers7} ใน 7 วัน`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Active Users (7วัน)"
          value={active7}
          sub={`${m.profiles.length ? Math.round((active7 / m.profiles.length) * 100) : 0}% ของฐาน`}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="รายได้รวมในระบบ"
          value={`฿${fmtTHB(totalGross)}`}
          sub={`${m.incomes.length} รายการ`}
          icon={<Wallet className="h-4 w-4" />}
          accent
        />
        <StatCard
          label="ใบเสนอ/บิล"
          value={m.quotations.length}
          sub={`Active subs ${m.subscriptions.filter((s) => s.is_active).length}`}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="ตั๋วเปิดอยู่"
          value={openTickets}
          sub={newCount > 0 ? `ใหม่ ${newCount}` : "Feedback + Support"}
          icon={<Ticket className="h-4 w-4" />}
        />
        <StatCard
          label="ฟีดแบ็กวันนี้"
          value={betaToday}
          sub={`รวม ${betaItems.length} รายการ`}
          icon={<MessageSquareHeart className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="ยอดสมัครสมาชิก"
          sub="14 วัน"
          data={signupSeries}
          color="hsl(var(--primary))"
        />
        <ChartCard
          title="รายได้ในระบบ (฿)"
          sub="รวมทุก user · 14 วัน"
          data={incomeSeries}
          color="hsl(var(--success, 142 70% 45%))"
        />
        <ChartCard
          title="ใบเสนอราคาที่สร้าง"
          sub="14 วัน"
          data={quoteSeries}
          color="hsl(var(--accent, 30 80% 60%))"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          icon={Layers}
          label="Subscriptions"
          value={m.subscriptions.length}
          sub={`${m.subscriptions.filter((s) => s.is_active).length} active`}
        />
        <MiniStat
          icon={TrendingUp}
          label="ค่าใช้จ่ายในระบบ"
          value={`฿${fmtTHB(totalExp)}`}
          sub={`${m.expenses.length} รายการ`}
        />
        <MiniStat
          icon={ShieldCheck}
          label="Admin"
          value={m.adminIds.size}
          sub={`/ ${m.profiles.length} คน`}
        />
        <MiniStat
          icon={Sparkles}
          label="ลูกค้าที่บันทึก"
          value={m.savedClients.length}
          sub="ฐานลูกค้ารวม"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat
          icon={Monitor}
          label="Desktop"
          value={deviceError ? "—" : dev("desktop") ? `${dev("desktop")!.pct}%` : "—"}
          sub={deviceError ? "โหลดไม่สำเร็จ" : `${dev("desktop")?.sessions ?? 0} sessions`}
        />
        <MiniStat
          icon={Tablet}
          label="Tablet"
          value={deviceError ? "—" : dev("tablet") ? `${dev("tablet")!.pct}%` : "—"}
          sub={deviceError ? "โหลดไม่สำเร็จ" : `${dev("tablet")?.sessions ?? 0} sessions`}
        />
        <MiniStat
          icon={Smartphone}
          label="Mobile"
          value={deviceError ? "—" : dev("mobile") ? `${dev("mobile")!.pct}%` : "—"}
          sub={deviceError ? "โหลดไม่สำเร็จ" : `${dev("mobile")?.sessions ?? 0} sessions`}
        />
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="text-lg font-semibold tracking-tight">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  sub,
  data,
  color,
}: {
  title: string;
  sub: string;
  data: { day: string; value: number }[];
  color: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="mb-2">
          <h3 className="text-xs font-semibold tracking-tight">{title}</h3>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 9 }} width={40} />
              <RTooltip
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 11,
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#g-${title})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
