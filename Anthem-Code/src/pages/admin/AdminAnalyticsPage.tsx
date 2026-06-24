import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import { useAdminAnalytics } from "@/hooks/admin/useAdminAnalytics";
import { Users, TrendingUp, Gift, Wallet, RefreshCw } from "lucide-react";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";

const RANGES = [
  { key: 14, label: "14 วัน" },
  { key: 30, label: "30 วัน" },
  { key: 90, label: "90 วัน" },
] as const;

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading } = useAdminAnalytics(days);

  const signupData = (data?.signups ?? []).map((s) => ({
    date: String(s.date).slice(5),
    count: s.count,
  }));

  const engagementData = (data?.engagement ?? []).map((e) => ({
    date: String(e.date).slice(5),
    likes: e.likes,
    comments: e.comments,
    views: e.views,
  }));

  const funnel = data?.funnel;
  const funnelChart = funnel
    ? [
        { name: "จ้างงาน", value: funnel.hiring_requests },
        { name: "คอลแลป", value: funnel.collab_requests },
        { name: "ประกาศงาน", value: funnel.job_posts },
        { name: "สมัครงาน", value: funnel.job_applications },
        { name: "สัญญา", value: funnel.contracts },
      ]
    : [];

  return (
    <div>
      <SectionHeader
        eyebrow="analytics"
        title="Analytics — Funnel & Retention"
        description="ภาพรวมการเติบโตและ conversion"
        actions={
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setDays(r.key)}
                className={`px-3 py-1.5 text-xs font-mono uppercase rounded-sm border ${
                  days === r.key
                    ? "bg-admin-fg text-admin-bg border-admin-fg"
                    : "border-admin-border text-admin-muted hover:text-admin-fg"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <p className="text-sm text-admin-muted py-12 text-center">กำลังโหลด…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Active 7d" value={data?.retention.active_7d ?? "—"} icon={Users} accent />
            <KpiCard label="Active 30d" value={data?.retention.active_30d ?? "—"} icon={TrendingUp} />
            <KpiCard label="Returning (7d)" value={data?.retention.returning_users ?? "—"} icon={RefreshCw} />
            <KpiCard label="Pending apps" value={funnel?.pending_apps ?? "—"} icon={BriefcaseIcon} accent />
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-6">
            <div className="border border-admin-border bg-admin-surface rounded-sm p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted mb-3">สมัครสมาชิกใหม่</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={signupData}>
                    <CartesianGrid stroke="hsl(var(--admin-border))" strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={{ background: "hsl(var(--admin-surface))", border: "1px solid hsl(var(--admin-border))", fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--admin-accent))" strokeWidth={2} dot={false} name="users" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border border-admin-border bg-admin-surface rounded-sm p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted mb-3">Engagement</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementData}>
                    <CartesianGrid stroke="hsl(var(--admin-border))" strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={{ background: "hsl(var(--admin-surface))", border: "1px solid hsl(var(--admin-border))", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="likes" stroke="hsl(var(--admin-accent))" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="comments" stroke="hsl(var(--admin-fg))" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="views" stroke="hsl(var(--admin-muted))" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="border border-admin-border bg-admin-surface rounded-sm p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted mb-3">Hire funnel ({days}d)</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelChart} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid stroke="hsl(var(--admin-border))" strokeDasharray="2 4" horizontal={false} />
                    <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" fontSize={10} tickLine={false} axisLine={false} width={72} />
                    <Tooltip contentStyle={{ background: "hsl(var(--admin-surface))", border: "1px solid hsl(var(--admin-border))", fontSize: 12 }} />
                    <Bar dataKey="value" fill="hsl(var(--admin-accent))" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-admin-muted">
                ค้าง: จ้าง {funnel?.pending_hires ?? 0} · สมัคร {funnel?.pending_apps ?? 0}
              </p>
            </div>

            <div className="border border-admin-border bg-admin-surface rounded-sm p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted mb-3">Revenue (PX, {days}d)</p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <KpiCard label="Gifts" value={data?.revenue.gifts_px?.toLocaleString() ?? "—"} icon={Gift} />
                <KpiCard label="Top-ups" value={data?.revenue.topups_px?.toLocaleString() ?? "—"} icon={Wallet} accent />
                <KpiCard label="Cashouts" value={data?.revenue.cashouts_px?.toLocaleString() ?? "—"} icon={BriefcaseIcon} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
