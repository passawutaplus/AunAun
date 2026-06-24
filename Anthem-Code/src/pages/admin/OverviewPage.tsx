import BriefcaseIcon from "../../components/icons/BriefcaseIcon";
import {
  Users, Building2, FolderKanban, HandshakeIcon, MessageSquare, Bookmark, UserPlus,
  Heart, MessageCircle, Eye, Gift, Flag, Wallet, ShieldCheck, Shield, HeartHandshake,
  Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import KpiCard from "@/components/admin/KpiCard";
import SectionHeader from "@/components/admin/SectionHeader";
import { useAdminStats, useAdminTimeline, useLiveActivity } from "@/hooks/admin/useAdminData";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

const typeIcon = {
  user: UserPlus, project: FolderKanban, job: BriefcaseIcon, hire: HandshakeIcon, collab: HandshakeIcon, studio: Building2,
};

export default function OverviewPage() {
  const { data: stats } = useAdminStats();
  const { data: timeline } = useAdminTimeline(14);
  const events = useLiveActivity();

  return (
    <div>
      <SectionHeader
        eyebrow="overview / live"
        title="ภาพรวมทั้งระบบ"
        description="มอนิเตอร์ทุกความเคลื่อนไหวบนแพลตฟอร์มแบบเรียลไทม์"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Users" value={stats?.totalUsers ?? "—"} icon={Users} />
        <KpiCard label="New 24h" value={stats?.newUsers24h ?? "—"} delta="+live" accent icon={UserPlus} />
        <KpiCard label="Studios" value={stats?.totalStudios ?? "—"} icon={Building2} />
        <KpiCard label="Published" value={stats?.publishedProjects ?? "—"} icon={FolderKanban} />
        <KpiCard label="Open Jobs" value={stats?.openJobs ?? "—"} icon={BriefcaseIcon} />
        <KpiCard label="Pending Hires" value={stats?.pendingHiring ?? "—"} accent icon={HandshakeIcon} />
        <KpiCard label="Pending Collabs" value={stats?.pendingCollabs ?? "—"} accent icon={HeartHandshake} />
        <KpiCard label="Messages 24h" value={stats?.messages24h ?? "—"} icon={MessageSquare} />
        <KpiCard label="Collections" value={stats?.totalCollections ?? "—"} icon={Bookmark} />
        <KpiCard label="Likes 24h" value={stats?.likes24h ?? "—"} icon={Heart} />
        <KpiCard label="Comments 24h" value={stats?.comments24h ?? "—"} icon={MessageCircle} />
        <KpiCard label="Views 24h" value={stats?.views24h ?? "—"} icon={Eye} />
        <KpiCard label="Follows 24h" value={stats?.follows24h ?? "—"} icon={UserPlus} />
        <KpiCard label="Gifts 24h" value={stats?.gifts24h ?? "—"} icon={Gift} />
        <KpiCard label="Open Reports" value={stats?.openReports ?? "—"} accent icon={Flag} />
        <KpiCard label="Pending Cashouts" value={stats?.pendingCashouts ?? "—"} accent icon={Wallet} />
        <KpiCard label="Open Feedback" value={stats?.openFeedback ?? "—"} icon={MessageSquare} />
        <KpiCard label="Pending KYC" value={stats?.pendingKyc ?? "—"} accent icon={ShieldCheck} />
        <KpiCard label="Open AML" value={stats?.openAmlFlags ?? "—"} accent icon={Shield} />
      </div>

      {(stats?.openReports || stats?.pendingCashouts || stats?.pendingHiring || stats?.pendingKyc) ? (
        <div className="mt-4 border border-admin-accent/30 bg-admin-accent/5 rounded-sm p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-admin-accent mb-2">ต้องดูแล</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {(stats?.pendingHiring ?? 0) > 0 && <Link to="/admin/hiring" className="text-admin-fg hover:text-admin-accent">คำขอจ้าง {stats?.pendingHiring}</Link>}
            {(stats?.pendingCollabs ?? 0) > 0 && <Link to="/admin/collabs" className="text-admin-fg hover:text-admin-accent">คอลแลป {stats?.pendingCollabs}</Link>}
            {(stats?.openReports ?? 0) > 0 && <Link to="/admin/reports" className="text-admin-fg hover:text-admin-accent">รายงาน {stats?.openReports}</Link>}
            {(stats?.pendingCashouts ?? 0) > 0 && <Link to="/admin/gifts" className="text-admin-fg hover:text-admin-accent">ถอนเงิน {stats?.pendingCashouts}</Link>}
            {(stats?.pendingKyc ?? 0) > 0 && <Link to="/admin/kyc" className="text-admin-fg hover:text-admin-accent">KYC {stats?.pendingKyc}</Link>}
            {(stats?.openAmlFlags ?? 0) > 0 && <Link to="/admin/aml" className="text-admin-fg hover:text-admin-accent">AML {stats?.openAmlFlags}</Link>}
            <Link to="/admin/activity" className="text-admin-accent font-medium hover:underline inline-flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> ดูกิจกรรมทั้งหมด →
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid md:grid-cols-3 gap-3 mt-6">
        <div className="md:col-span-2 border border-admin-border bg-admin-surface rounded-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted">14-day activity</p>
            <div className="flex gap-3 font-mono text-[10px] uppercase text-admin-muted">
              <span className="flex items-center gap-1"><i className="inline-block w-2 h-2 bg-admin-fg" />users</span>
              <span className="flex items-center gap-1"><i className="inline-block w-2 h-2 bg-admin-accent" />projects</span>
              <span className="flex items-center gap-1"><i className="inline-block w-2 h-2 bg-admin-muted" />jobs</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline ?? []}>
                <CartesianGrid stroke="hsl(var(--admin-border))" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--admin-muted))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--admin-muted))" fontSize={10} tickLine={false} axisLine={false} width={24} />
                <Tooltip contentStyle={{ background: "hsl(var(--admin-surface))", border: "1px solid hsl(var(--admin-border))", fontSize: 12 }} />
                <Line type="monotone" dataKey="users" stroke="hsl(var(--admin-fg))" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="projects" stroke="hsl(var(--admin-accent))" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="jobs" stroke="hsl(var(--admin-muted))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-admin-border bg-admin-surface rounded-sm p-4 max-h-[400px] flex flex-col">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted mb-3">live feed</p>
          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
            {events.length === 0 ? (
              <p className="text-xs text-admin-muted text-center py-8">ยังไม่มีเหตุการณ์</p>
            ) : (
              events.map((e) => {
                const Icon = typeIcon[e.type];
                return (
                  <div key={e.id} className="flex items-start gap-2.5 text-xs border-b border-admin-border last:border-0 pb-2 last:pb-0">
                    <Icon className="w-3.5 h-3.5 mt-0.5 text-admin-muted shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-admin-fg truncate">{e.title}</p>
                      <p className="text-admin-muted truncate">{e.subtitle}</p>
                    </div>
                    <span className="font-mono text-[10px] text-admin-muted shrink-0">
                      {formatDistanceToNow(new Date(e.at), { locale: th, addSuffix: false })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
