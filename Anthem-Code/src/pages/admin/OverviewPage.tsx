import { Link } from "react-router-dom";
import { Activity, Building2, FolderKanban, HandshakeIcon, MessageSquare, UserPlus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import BriefcaseIcon from "../../components/icons/BriefcaseIcon";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brandConfig";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import {
  adminNavSectionsForBuild,
  adminPendingQueue,
  adminStatValue,
  type AdminNavItem,
  type AdminNavSection,
} from "@/lib/admin/adminNavigation";
import { useAdminStats, useAdminTimeline, useLiveActivity } from "@/hooks/admin/useAdminData";
import { useAdminAlertCounts } from "@/hooks/admin/useAdminAlerts";

const typeIcon = {
  user: UserPlus,
  project: FolderKanban,
  job: BriefcaseIcon,
  hire: HandshakeIcon,
  collab: HandshakeIcon,
  studio: Building2,
};

function OverviewNavCard({
  item,
  stat,
}: {
  item: AdminNavItem;
  stat?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="group flex flex-col gap-2 rounded-sm border border-admin-border bg-admin-surface p-3 transition hover:border-admin-accent/50 hover:bg-admin-hover/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 shrink-0 text-admin-muted group-hover:text-admin-accent" />
          <span className="truncate text-sm font-medium text-admin-fg">{item.label}</span>
        </div>
        {stat !== undefined ? (
          <span
            className={`shrink-0 font-mono text-lg tabular-nums ${item.accent && stat > 0 ? "text-admin-accent" : "text-admin-fg"}`}
          >
            {stat}
          </span>
        ) : null}
      </div>
      <p className="text-[11px] leading-snug text-admin-muted line-clamp-2">{item.hint}</p>
    </Link>
  );
}

function OverviewSection({
  section,
  stats,
}: {
  section: AdminNavSection;
  stats: ReturnType<typeof useAdminStats>["data"];
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 border-b border-admin-border pb-3">
        <h2 className="text-base font-medium text-admin-fg">{section.title}</h2>
        <p className="mt-0.5 text-xs text-admin-muted">{section.description}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {section.items.map((item) => (
          <OverviewNavCard
            key={`${section.id}-${item.label}-${item.to}`}
            item={item}
            stat={adminStatValue(stats, item.statKey)}
          />
        ))}
      </div>
    </section>
  );
}

export default function OverviewPage() {
  const { data: stats } = useAdminStats();
  const { data: timeline } = useAdminTimeline(14);
  const events = useLiveActivity();
  const { data: alerts } = useAdminAlertCounts();
  const queue = adminPendingQueue(stats);
  const launchMinimal = isAplus1LaunchMinimal();
  // Overview hub: skip command/ops shortcut grids (still in sidebar)
  const navSections = adminNavSectionsForBuild().filter(
    (s) => s.id !== "command" && s.id !== "ops",
  );

  const headline = launchMinimal
    ? [
        { label: "ผู้ใช้ทั้งหมด", value: stats?.totalUsers ?? "—", icon: UserPlus },
        { label: "ผลงานเผยแพร่", value: stats?.publishedProjects ?? "—", icon: FolderKanban },
        { label: "ข้อความ 24 ชม.", value: stats?.messages24h ?? "—", icon: MessageSquare },
        { label: "สมัครใหม่ 24 ชม.", value: stats?.newUsers24h ?? "—", accent: true },
      ]
    : [
        { label: "ผู้ใช้ทั้งหมด", value: stats?.totalUsers ?? "—", icon: UserPlus },
        { label: "ผลงานเผยแพร่", value: stats?.publishedProjects ?? "—", icon: FolderKanban },
        { label: "งานเปิดรับ", value: stats?.openJobs ?? "—", icon: BriefcaseIcon },
        { label: "สมัครใหม่ 24 ชม.", value: stats?.newUsers24h ?? "—", accent: true },
      ];

  return (
    <div>
      <SectionHeader
        eyebrow={`${BRAND_NAME} admin / live`}
        title="ภาพรวมแพลตฟอร์ม"
        description={`${BRAND_TAGLINE} — จัดกลุ่มตามเมนูด้านซ้าย อัปเดตทุก ~30 วินาที`}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2 rounded-sm border border-admin-border bg-admin-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted">กิจกรรม 14 วัน</p>
            <div className="flex gap-3 font-mono text-[10px] uppercase text-admin-muted">
              <span className="flex items-center gap-1">
                <i className="inline-block h-2 w-2 bg-admin-fg" />
                ผู้ใช้
              </span>
              <span className="flex items-center gap-1">
                <i className="inline-block h-2 w-2 bg-admin-accent" />
                ผลงาน
              </span>
              {!launchMinimal ? (
                <span className="flex items-center gap-1">
                  <i className="inline-block h-2 w-2 bg-admin-muted" />
                  งาน
                </span>
              ) : null}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline ?? []}>
                <CartesianGrid stroke="hsl(var(--admin-border))" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--admin-muted))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--admin-muted))" fontSize={10} tickLine={false} axisLine={false} width={24} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--admin-surface))",
                    border: "1px solid hsl(var(--admin-border))",
                    fontSize: 12,
                    color: "hsl(var(--admin-fg))",
                  }}
                />
                <Line type="monotone" dataKey="users" stroke="hsl(var(--admin-fg))" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="projects" stroke="hsl(var(--admin-accent))" strokeWidth={1.5} dot={false} />
                {!launchMinimal ? (
                  <Line type="monotone" dataKey="jobs" stroke="hsl(var(--admin-muted))" strokeWidth={1.5} dot={false} />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex max-h-[400px] flex-col rounded-sm border border-admin-border bg-admin-surface p-4">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted">ฟีดสด</p>
          <div className="flex-1 space-y-2 overflow-y-auto px-1">
            {events.length === 0 ? (
              <p className="py-8 text-center text-xs text-admin-muted">ยังไม่มีเหตุการณ์</p>
            ) : (
              events.map((e) => {
                const Icon = typeIcon[e.type];
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-2.5 border-b border-admin-border pb-2 text-xs last:border-0 last:pb-0"
                  >
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-admin-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-admin-fg">{e.title}</p>
                      <p className="truncate text-admin-muted">{e.subtitle}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-admin-muted">
                      {formatDistanceToNow(new Date(e.at), { locale: th, addSuffix: false })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {headline.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} accent={kpi.accent} delta="live" />
        ))}
      </div>

      {queue.length > 0 ? (
        <div className="mt-4 rounded-sm border border-admin-accent/30 bg-admin-accent/5 p-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-admin-accent">คิวที่ต้องดูแล</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {queue.map((q) => (
              <Link key={q.to} to={q.to} className="text-admin-fg hover:text-admin-accent">
                {q.label} <span className="font-mono text-admin-accent">{q.count}</span>
              </Link>
            ))}
            <Link to="/admin/activity" className="inline-flex items-center gap-1 font-medium text-admin-accent hover:underline">
              <Activity className="h-3.5 w-3.5" />
              ดูกิจกรรมทั้งหมด →
            </Link>
          </div>
        </div>
      ) : null}

      {alerts && (alerts.urgentReports > 0 || (!launchMinimal && alerts.highRiskKyc > 0)) ? (
        <p className="mt-3 text-xs text-admin-muted">
          AI triage:{" "}
          {alerts.urgentReports > 0 ? `รายงานด่วน ${alerts.urgentReports} ` : ""}
          {!launchMinimal && alerts.highRiskKyc > 0 ? `KYC ความเสี่ยงสูง ${alerts.highRiskKyc}` : ""}
        </p>
      ) : null}

      {navSections.map((section) => (
        <OverviewSection key={section.id} section={section} stats={stats} />
      ))}
    </div>
  );
}
