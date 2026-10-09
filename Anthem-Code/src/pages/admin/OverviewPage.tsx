import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Eye,
  FolderKanban,
  Gift,
  HandshakeIcon,
  Heart,
  Layers3,
  MessageCircle,
  MessageSquare,
  UserPlus,
  Users,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import BriefcaseIcon from "../../components/icons/BriefcaseIcon";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import { BRAND_NAME } from "@/lib/brandConfig";
import { ADMIN_TONE } from "@/lib/admin/adminTone";
import { adminDbGapForPath } from "@/lib/admin/adminDbGaps";
import { adminNavGroups, adminStatValue, type AdminNavGroup, type AdminNavItem } from "@/lib/admin/adminNavigation";
import {
  useAdminPresenceStats,
  useAdminProductLoopStats,
  useAdminStats,
  useAdminTimeline,
  useLiveActivity,
} from "@/hooks/admin/useAdminData";
import { useAdminAlertCounts } from "@/hooks/admin/useAdminAlerts";
import { useAdminQueue } from "@/hooks/admin/useAdminQueue";
import { cn } from "@/lib/utils";

const typeIcon = {
  user: UserPlus,
  project: FolderKanban,
  job: BriefcaseIcon,
  hire: HandshakeIcon,
  collab: HandshakeIcon,
  studio: Building2,
};

function ShortcutGroup({ group, stats }: { group: AdminNavGroup; stats: ReturnType<typeof useAdminStats>["data"] }) {
  const tone = ADMIN_TONE[group.tone];
  const Icon = group.icon;
  return (
    <section className="rounded-lg border border-admin-border bg-admin-surface p-4">
      <header className="mb-3 flex items-center gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone.chip)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-admin-fg">{group.title}</h3>
          <p className="truncate text-[11px] text-admin-muted">{group.description}</p>
        </div>
      </header>
      <ul className="space-y-0.5">
        {group.items.map((item: AdminNavItem) => {
          const stat = adminStatValue(stats, item.statKey);
          const gap = adminDbGapForPath(item.to.split("?")[0]);
          return (
            <li key={item.to + item.label}>
              <Link
                to={item.to}
                title={item.hint}
                className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-admin-muted transition-colors hover:bg-admin-hover hover:text-admin-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {gap ? (
                  <span className="rounded border border-admin-border px-1 font-mono text-[9px] uppercase">รอ DB</span>
                ) : stat !== undefined ? (
                  <span className="font-mono text-xs tabular-nums text-admin-fg" title={item.statLabel}>
                    {stat}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function OverviewPage() {
  const { data: stats } = useAdminStats();
  const { data: presence } = useAdminPresenceStats();
  const { data: timeline } = useAdminTimeline(14);
  const { data: loopStats } = useAdminProductLoopStats();
  const events = useLiveActivity();
  const { data: alerts } = useAdminAlertCounts();
  const { entries, total, loading } = useAdminQueue();
  const shortcutGroups = adminNavGroups().filter((g) => g.id !== "home");

  const extraNote = (key: string): string | null => {
    if (key === "reports" && alerts && alerts.urgentReports > 0) return `${alerts.urgentReports} เรื่องด่วน (AI triage)`;
    if (key === "kyc" && alerts && alerts.highRiskKyc > 0) return `${alerts.highRiskKyc} รายความเสี่ยงสูง`;
    return null;
  };

  const today = [
    { label: "สมัครใหม่", value: stats?.newUsers24h ?? "—", icon: UserPlus, accent: true },
    { label: "ข้อความ", value: stats?.messages24h ?? "—", icon: MessageSquare },
    { label: "คอมเมนต์", value: stats?.comments24h ?? "—", icon: MessageCircle },
    { label: "+1 ผลงาน", value: stats?.likes24h ?? "—", icon: Heart },
    { label: "ยอดวิว", value: stats?.views24h ?? "—", icon: Eye },
    { label: "ของขวัญ", value: stats?.gifts24h ?? "—", icon: Gift },
  ];
  const totals = [
    { label: "ผู้ใช้ทั้งหมด", value: stats?.totalUsers ?? "—", icon: Users },
    { label: "ผลงานเผยแพร่", value: stats?.publishedProjects ?? "—", icon: FolderKanban },
    { label: "แพ็กเกจบริการ", value: stats?.totalPackages ?? "—", icon: Layers3 },
    { label: "งานเปิดรับ", value: stats?.openJobs ?? "—", icon: BriefcaseIcon },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow={`${BRAND_NAME} admin`}
        title="ภาพรวมวันนี้"
        description="เริ่มจากงานที่รอคุณ แล้วค่อยดูตัวเลขและกิจกรรม · อัปเดตอัตโนมัติทุก ~30 วินาที"
        actions={
          <div className="flex items-stretch gap-3 rounded-md border border-admin-border bg-admin-surface px-3 py-2" title="ออนไลน์ = มีกิจกรรมภายใน 5 นาทีล่าสุด">
            <div className="min-w-[4.5rem] text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">ออนไลน์</p>
              <p className="mt-0.5 flex items-center justify-end gap-1.5 font-mono text-xl tabular-nums text-admin-fg">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                {presence?.online ?? "—"}
              </p>
            </div>
            <div className="w-px self-stretch bg-admin-border" aria-hidden />
            <div className="min-w-[4.5rem] text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">ออฟไลน์</p>
              <p className="mt-0.5 font-mono text-xl tabular-nums text-admin-muted">{presence?.offline ?? "—"}</p>
            </div>
          </div>
        }
      />

      <section aria-labelledby="queue-title">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="queue-title" className="text-base font-medium text-admin-fg">
            ต้องทำตอนนี้
            {total > 0 ? <span className="ml-2 font-mono text-sm text-admin-accent">{total}</span> : null}
          </h2>
          <p className="text-xs text-admin-muted">เรียงจากเรื่องที่ไวต่อความเสี่ยงที่สุด</p>
        </div>

        {entries.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-admin-fg">{loading ? "กำลังตรวจงานค้าง…" : "เคลียร์หมดแล้ว — ไม่มีงานค้าง"}</p>
              {!loading ? <p className="text-xs text-admin-muted">KYC, รายงานเนื้อหา, ถอนเงิน, AML, คำขอจ้าง และฟีดแบ็กไม่มีรายการรอ</p> : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {entries.map((e) => {
              const tone = ADMIN_TONE[e.group.tone];
              const note = extraNote(e.key);
              return (
                <Link
                  key={e.key}
                  to={e.item.to}
                  className="group relative flex flex-col gap-3 rounded-lg border border-admin-accent/30 bg-admin-surface p-4 transition hover:border-admin-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent"
                >
                  <div className="flex items-start justify-between">
                    <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tone.chip)}>
                      <e.item.icon className="h-5 w-5" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-admin-muted transition group-hover:text-admin-accent" aria-hidden />
                  </div>
                  <div>
                    <p className="font-mono text-3xl tabular-nums text-admin-accent">{e.count}</p>
                    <p className="mt-0.5 text-sm font-medium text-admin-fg">{e.item.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-admin-muted">{e.item.hint}</p>
                    {note ? <p className="mt-1 text-[11px] font-medium text-destructive">{note}</p> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="today-title">
        <h2 id="today-title" className="mb-3 text-base font-medium text-admin-fg">
          ตัวเลข 24 ชั่วโมงล่าสุด
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {today.map((k) => (
            <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} accent={k.accent} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {totals.map((k) => (
            <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} />
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-admin-border bg-admin-surface p-4 md:col-span-2">
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
              <span className="flex items-center gap-1">
                <i className="inline-block h-2 w-2 bg-admin-muted" />
                งาน
              </span>
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
                <Line type="monotone" dataKey="jobs" stroke="hsl(var(--admin-muted))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex max-h-[400px] flex-col rounded-lg border border-admin-border bg-admin-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted">ฟีดสด</p>
            <Link to="/admin/activity" className="text-xs text-admin-accent hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-1">
            {events.length === 0 ? (
              <p className="py-8 text-center text-xs text-admin-muted">ยังไม่มีเหตุการณ์</p>
            ) : (
              events.map((e) => {
                const Icon = typeIcon[e.type];
                return (
                  <div key={e.id} className="flex items-start gap-2.5 border-b border-admin-border pb-2 text-xs last:border-0 last:pb-0">
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

      <section className="mt-8">
        <div className="mb-3">
          <h2 className="text-base font-medium text-admin-fg">ลูปโอกาส</h2>
          <p className="mt-0.5 text-xs text-admin-muted">
            ดูผลงาน → เปิดคุยจากผลงาน → เซฟคอลเลกชัน
            {loopStats && !loopStats.fromProductEvents ? " · ใช้ตัวเลขสำรองจากตารางหลัก (product_events อ่านไม่ได้)" : " · 24 ชม. / 7 วัน"}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="ดูผลงาน 24 ชม." value={loopStats?.projectViews24h ?? "—"} delta={loopStats ? `7 วัน: ${loopStats.projectViews7d}` : undefined} icon={Eye} />
          <KpiCard label="เปิดคุยจ้าง 24 ชม." value={loopStats?.hireOpens24h ?? "—"} delta={loopStats ? `7 วัน: ${loopStats.hireOpens7d}` : undefined} icon={HandshakeIcon} accent />
          <KpiCard label="เซฟคอลเลกชัน 24 ชม." value={loopStats?.collectionSaves24h ?? "—"} delta={loopStats ? `7 วัน: ${loopStats.collectionSaves7d}` : undefined} icon={Layers3} />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="shortcut-title">
        <div className="mb-3">
          <h2 id="shortcut-title" className="text-base font-medium text-admin-fg">
            ทางลัดตามหมวด
          </h2>
          <p className="mt-0.5 text-xs text-admin-muted">กด Ctrl K เพื่อค้นหาเมนูได้จากทุกหน้า</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shortcutGroups.map((g) => (
            <ShortcutGroup key={g.id} group={g} stats={stats} />
          ))}
        </div>
      </section>
    </div>
  );
}
