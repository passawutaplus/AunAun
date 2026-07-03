import {
  BarChart3,
  Briefcase,
  Heart,
  LineChart,
  Megaphone,
  Radar,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMarketingContext } from "@/hooks/admin/MarketingContext";
import { useMarketingBusinesses } from "@/hooks/admin/useMarketingBusinesses";
import { useMarketingLeads } from "@/hooks/admin/useMarketingLeads";
import { useMarketingCompetitors } from "@/hooks/admin/useMarketingCompetitors";
import { useMarketingPlatformKpis } from "@/hooks/admin/useMarketingPlatformKpis";
import { DEMO_METRICS, PROMPT_TASK_LABELS } from "@/lib/marketing/demo-data";
import { marketingT } from "@/lib/marketing/i18n";
import { MarketingComplianceGuard } from "./MarketingComplianceGuard";
import { MarketingCard } from "./MarketingShell";
import { exportRowsToCsv, exportRowsToXlsx, exportHtmlToPdf, rowsToHtmlTable } from "@/lib/marketing/export";
import { useMarketingSettings } from "@/hooks/admin/useMarketingSettings";
import { CheckCircle2, Bot, Wand2 } from "lucide-react";

function isDemoFallbackAllowed(): boolean {
  return import.meta.env.VITE_DEMO_MODE === "true";
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "accent",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "accent" | "ok" | "warn";
}) {
  const toneClass =
    tone === "ok" ? "marketing-tone-ok" : tone === "warn" ? "marketing-tone-warn" : "marketing-tone-accent";
  return (
    <MarketingCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-admin-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-admin-fg">{value}</p>
        </div>
        <span className={`rounded-lg p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xs text-admin-muted">{detail}</p>
    </MarketingCard>
  );
}

const moduleCards = [
  { title: "Aplus1 Setup", to: "setup", icon: Target },
  { title: "In-app signals", to: "signals", icon: Radio },
  { title: "Creator & hire leads", to: "leads", icon: Users },
  { title: "Platform competitors", to: "competitors", icon: Radar },
  { title: "AI Insight", to: "insights", icon: Bot },
  { title: "Ads Planner", to: "ads", icon: Megaphone },
  { title: "Reports", to: "reports", icon: BarChart3 },
];

export default function MarketingOverviewPage() {
  const { activeBusinessId } = useMarketingBusinesses();
  const { leads } = useMarketingLeads(activeBusinessId);
  const { competitors } = useMarketingCompetitors(activeBusinessId);
  const { logExport } = useMarketingSettings(activeBusinessId);
  const { uiLanguage } = useMarketingContext();
  const platform = useMarketingPlatformKpis();

  const internalLeads = leads.filter(
    (l) => l.lead_origin === "internal" || (l.tags ?? []).includes("internal"),
  );
  const externalLeads = leads.filter(
    (l) => l.lead_origin !== "internal" && !(l.tags ?? []).includes("internal"),
  );
  const creatorPipeline = leads.filter((l) => (l.tags ?? []).includes("creator")).length;
  const hirerPipeline = leads.filter((l) => (l.tags ?? []).includes("hirer")).length;
  const highIntent = leads.filter((l) => (l.lead_score ?? 0) >= 80).length;
  const allowDemo = isDemoFallbackAllowed();

  const platformMetrics = [
    {
      label: uiLanguage === "th" ? "สมัครใหม่ 24ชม." : "New users 24h",
      value: String(platform.creator.newUsers24h),
      detail: uiLanguage === "th" ? "Creator funnel" : "Creator funnel",
      icon: Sparkles,
      tone: "ok" as const,
    },
    {
      label: uiLanguage === "th" ? "ผลงาน Published" : "Published projects",
      value: String(platform.creator.publishedProjects),
      detail: `${platform.creator.follows24h} follows 24h`,
      icon: Target,
      tone: "accent" as const,
    },
    {
      label: uiLanguage === "th" ? "งานเปิด" : "Open jobs",
      value: String(platform.hirer.openJobs),
      detail: `${platform.hirer.pendingHiring} hiring ค้าง`,
      icon: Briefcase,
      tone: "ok" as const,
    },
    {
      label: uiLanguage === "th" ? "ใบสมัครงาน" : "Job applications",
      value: String(platform.hirer.jobApplications),
      detail: `${platform.hirer.pendingApps} pending`,
      icon: LineChart,
      tone: "warn" as const,
    },
    {
      label: uiLanguage === "th" ? "Engagement 24ชม." : "Engagement 24h",
      value: String(platform.community.likes24h + platform.community.comments24h),
      detail: `${platform.community.views24h} views`,
      icon: Heart,
      tone: "accent" as const,
    },
    {
      label: uiLanguage === "th" ? "Active 7d / 30d" : "Active 7d / 30d",
      value: `${platform.retention.active7d} / ${platform.retention.active30d}`,
      detail: `${platform.retention.returningUsers} returning`,
      icon: Users,
      tone: "ok" as const,
    },
  ];

  const pipelineMetrics = [
    {
      label: uiLanguage === "th" ? "Lead รวม" : "Total leads",
      value: String(leads.length || (allowDemo ? DEMO_METRICS.totalLeads : 0)),
      detail: `${internalLeads.length} in-app · ${externalLeads.length} external`,
      icon: Users,
      tone: "accent" as const,
    },
    {
      label: uiLanguage === "th" ? "Creator (pipeline)" : "Creator (pipeline)",
      value: String(creatorPipeline || (allowDemo ? DEMO_METRICS.totalLeads : 0)),
      detail: `${highIntent} high intent`,
      icon: Sparkles,
      tone: "ok" as const,
    },
    {
      label: uiLanguage === "th" ? "Hirer (pipeline)" : "Hirer (pipeline)",
      value: String(hirerPipeline || (allowDemo ? 0 : 0)),
      detail: uiLanguage === "th" ? "จาก sync/import" : "from sync/import",
      icon: Briefcase,
      tone: "ok" as const,
    },
    {
      label: uiLanguage === "th" ? "คู่แข่ง" : "Competitors",
      value: String(competitors.length || (allowDemo ? DEMO_METRICS.competitors : 0)),
      detail: "tracked",
      icon: Radar,
      tone: "accent" as const,
    },
    {
      label: "Outreach",
      value: String(allowDemo ? DEMO_METRICS.outreachTasks : highIntent),
      detail: uiLanguage === "th" ? "qualified / due" : "qualified / due",
      icon: Send,
      tone: "warn" as const,
    },
    {
      label: "Compliance",
      value: `${allowDemo ? DEMO_METRICS.complianceHealth : 100}%`,
      detail: marketingT(uiLanguage, "publicDataOnly"),
      icon: ShieldCheck,
      tone: "ok" as const,
    },
  ];

  const exportLeads = async (format: "csv" | "xlsx" | "pdf") => {
    const headers = ["lead_name", "platform", "intent", "pain_point", "score", "status", "origin", "source_url"];
    const rows = leads.map((l) => [
      l.lead_name,
      l.platform,
      l.intent ?? "",
      l.pain_point ?? "",
      String(l.lead_score ?? ""),
      l.status,
      l.lead_origin ?? ((l.tags ?? []).includes("internal") ? "internal" : "external"),
      l.lead_origin === "internal" ? "[admin link]" : l.source_url,
    ]);
    const base = `aplus1-marketing-leads-${activeBusinessId ?? "export"}`;
    if (format === "csv") exportRowsToCsv(`${base}.csv`, headers, rows);
    else if (format === "xlsx") await exportRowsToXlsx(`${base}.xlsx`, "Leads", headers, rows);
    else exportHtmlToPdf("Aplus1 Marketing Leads", rowsToHtmlTable(headers, rows));
    if (activeBusinessId) {
      await logExport({
        export_format: format,
        report_type: "leads",
        row_count: rows.length,
        compliance_confirmed: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-admin-muted">
            {uiLanguage === "th" ? "แพลตฟอร์ม (ข้อมูลจริง)" : "Platform (live KPIs)"}
          </h2>
          <div className="flex gap-2 text-xs">
            <Link to="/admin/analytics" className="text-admin-accent hover:underline">
              Analytics
            </Link>
            <Link to="/admin/users" className="text-admin-accent hover:underline">
              Users
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {platformMetrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-admin-muted">
          {uiLanguage === "th" ? "Marketing pipeline (kuy_leads)" : "Marketing pipeline (kuy_leads)"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pipelineMetrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <MarketingCard className="p-5">
          <p className="marketing-section-label text-xs font-semibold uppercase tracking-wide">Prompt Engine</p>
          <h2 className="mt-1 text-lg font-semibold text-admin-fg">
            {uiLanguage === "th" ? "งาน AI สำหรับ growth Aplus1" : "AI tasks for Aplus1 growth"}
          </h2>
          <div className="mt-4 grid gap-2">
            {PROMPT_TASK_LABELS.map((task) => (
              <div
                key={task}
                className="flex items-center gap-2 rounded-lg border border-admin-border bg-admin-hover/40 px-3 py-2 text-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-admin-accent" />
                <span className="flex-1 text-admin-fg">{task}</span>
                <span className="text-xs text-admin-muted">AI</span>
              </div>
            ))}
          </div>
          <Link
            to="/admin/marketing/insights"
            className="marketing-btn-primary mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Wand2 className="h-4 w-4" />
            {uiLanguage === "th" ? "รันการวิเคราะห์" : "Run analysis"}
          </Link>
        </MarketingCard>

        <MarketingComplianceGuard onExport={exportLeads} disabled={!leads.length} />
      </div>

      <MarketingCard className="p-5">
        <h2 className="text-lg font-semibold text-admin-fg">
          {uiLanguage === "th" ? "โมดูล growth Aplus1" : "Aplus1 growth modules"}
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {moduleCards.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.to} to={`/admin/marketing/${m.to}`} className="marketing-module-tile rounded-lg p-4">
                <div className="flex items-center gap-2 font-semibold text-admin-fg">
                  <Icon className="h-4 w-4 text-admin-accent" />
                  {m.title}
                </div>
              </Link>
            );
          })}
        </div>
      </MarketingCard>
    </div>
  );
}
