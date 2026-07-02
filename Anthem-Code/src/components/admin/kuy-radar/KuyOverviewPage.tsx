import {
  BarChart3,
  Briefcase,
  LineChart,
  Megaphone,
  Radar,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useKuyRadarContext } from "@/hooks/admin/KuyRadarContext";
import { useKuyRadarBusinesses } from "@/hooks/admin/useKuyRadarBusinesses";
import { useKuyRadarLeads } from "@/hooks/admin/useKuyRadarLeads";
import { useKuyRadarCompetitors } from "@/hooks/admin/useKuyRadarCompetitors";
import { DEMO_METRICS, PROMPT_TASK_LABELS } from "@/lib/kuy-radar/demo-data";
import { KUY_APLUS1_METRICS } from "@/lib/kuy-radar/aplus1";
import { kuyT } from "@/lib/kuy-radar/i18n";
import { KuyComplianceGuard } from "./KuyComplianceGuard";
import { KuyRadarCard } from "./KuyRadarShell";
import { exportRowsToCsv, exportRowsToXlsx, exportHtmlToPdf, rowsToHtmlTable } from "@/lib/kuy-radar/export";
import { useKuyRadarSettings } from "@/hooks/admin/useKuyRadarSettings";
import { CheckCircle2, Bot, Wand2 } from "lucide-react";

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
    tone === "ok" ? "kuy-tone-ok" : tone === "warn" ? "kuy-tone-warn" : "kuy-tone-accent";
  return (
    <KuyRadarCard className="p-4">
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
    </KuyRadarCard>
  );
}

const moduleCards = [
  { title: "Aplus1 Setup", to: "setup", icon: Target },
  { title: "Creator & hire leads", to: "leads", icon: Users },
  { title: "Platform competitors", to: "competitors", icon: Radar },
  { title: "AI Insight", to: "insights", icon: Bot },
  { title: "Ads Planner", to: "ads", icon: Megaphone },
  { title: "Reports", to: "reports", icon: BarChart3 },
];

export default function KuyOverviewPage() {
  const { activeBusinessId } = useKuyRadarBusinesses();
  const { leads } = useKuyRadarLeads(activeBusinessId);
  const { competitors } = useKuyRadarCompetitors(activeBusinessId);
  const { logExport } = useKuyRadarSettings(activeBusinessId);
  const { uiLanguage } = useKuyRadarContext();

  const creatorLeads = leads.filter((l) => (l.tags ?? []).includes("creator")).length;
  const hirerLeads = leads.filter((l) => (l.tags ?? []).includes("hirer")).length;
  const highIntent = leads.filter((l) => (l.lead_score ?? 0) >= 80).length;

  const metrics = [
    {
      label: uiLanguage === "th" ? "Lead รวม" : "Total leads",
      value: String(leads.length || DEMO_METRICS.totalLeads),
      detail: `${highIntent} high intent`,
      icon: Users,
      tone: "accent" as const,
    },
    {
      label: uiLanguage === "th" ? "Creator signals" : "Creator signals",
      value: String(creatorLeads || KUY_APLUS1_METRICS.creatorLeads),
      detail: uiLanguage === "th" ? "มุมสมัคร/โปรไฟล์" : "signup / portfolio",
      icon: Sparkles,
      tone: "ok" as const,
    },
    {
      label: uiLanguage === "th" ? "แบรนด์จ้างงาน" : "Hiring brands",
      value: String(hirerLeads || KUY_APLUS1_METRICS.hiringLeads),
      detail: uiLanguage === "th" ? "ประกาศจ้าง" : "job posts",
      icon: Briefcase,
      tone: "ok" as const,
    },
    {
      label: uiLanguage === "th" ? "คู่แข่งแพลตฟอร์ม" : "Competitors",
      value: String(competitors.length || DEMO_METRICS.competitors),
      detail: "tracked",
      icon: Radar,
      tone: "accent" as const,
    },
    {
      label: uiLanguage === "th" ? "คีย์เวิร์ดชุมชน" : "Community keywords",
      value: String(DEMO_METRICS.trendingKeywords),
      detail: "signals",
      icon: LineChart,
      tone: "warn" as const,
    },
    {
      label: uiLanguage === "th" ? "มุมคอนเทนต์" : "Content angles",
      value: String(DEMO_METRICS.contentOpportunities),
      detail: "feed / inspire",
      icon: Sparkles,
      tone: "ok" as const,
    },
    {
      label: "Outreach",
      value: String(DEMO_METRICS.outreachTasks),
      detail: uiLanguage === "th" ? "คิวติดตาม" : "due",
      icon: Send,
      tone: "warn" as const,
    },
    {
      label: "Compliance",
      value: `${DEMO_METRICS.complianceHealth}%`,
      detail: kuyT(uiLanguage, "publicDataOnly"),
      icon: ShieldCheck,
      tone: "ok" as const,
    },
  ];

  const exportLeads = async (format: "csv" | "xlsx" | "pdf") => {
    const headers = ["lead_name", "platform", "intent", "pain_point", "score", "status", "source_url"];
    const rows = leads.map((l) => [
      l.lead_name,
      l.platform,
      l.intent ?? "",
      l.pain_point ?? "",
      String(l.lead_score ?? ""),
      l.status,
      l.source_url,
    ]);
    const base = `aplus1-kuy-leads-${activeBusinessId ?? "export"}`;
    if (format === "csv") exportRowsToCsv(`${base}.csv`, headers, rows);
    else if (format === "xlsx") await exportRowsToXlsx(`${base}.xlsx`, "Leads", headers, rows);
    else exportHtmlToPdf("Aplus1 Kuy Radar Leads", rowsToHtmlTable(headers, rows));
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <KuyRadarCard className="p-5">
          <p className="kuy-section-label text-xs font-semibold uppercase tracking-wide">Prompt Engine</p>
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
            to="/admin/kuy-radar/insights"
            className="kuy-btn-primary mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Wand2 className="h-4 w-4" />
            {uiLanguage === "th" ? "รันการวิเคราะห์" : "Run analysis"}
          </Link>
        </KuyRadarCard>

        <KuyComplianceGuard onExport={exportLeads} disabled={!leads.length} />
      </div>

      <KuyRadarCard className="p-5">
        <h2 className="text-lg font-semibold text-admin-fg">
          {uiLanguage === "th" ? "โมดูล growth Aplus1" : "Aplus1 growth modules"}
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {moduleCards.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.to} to={`/admin/kuy-radar/${m.to}`} className="kuy-module-tile rounded-lg p-4">
                <div className="flex items-center gap-2 font-semibold text-admin-fg">
                  <Icon className="h-4 w-4 text-admin-accent" />
                  {m.title}
                </div>
              </Link>
            );
          })}
        </div>
      </KuyRadarCard>
    </div>
  );
}
