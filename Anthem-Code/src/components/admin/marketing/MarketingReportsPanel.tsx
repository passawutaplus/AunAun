import { useMarketingBusinesses } from "@/hooks/admin/useMarketingBusinesses";
import { useMarketingLeads } from "@/hooks/admin/useMarketingLeads";
import { useMarketingCompetitors } from "@/hooks/admin/useMarketingCompetitors";
import { useMarketingSettings } from "@/hooks/admin/useMarketingSettings";
import { exportRowsToCsv, exportRowsToXlsx, exportHtmlToPdf, rowsToHtmlTable } from "@/lib/marketing/export";
import { MarketingComplianceGuard } from "./MarketingComplianceGuard";
import { MarketingCard } from "./MarketingShell";

const REPORT_TYPES = [
  { id: "leads", label: "Lead report" },
  { id: "competitors", label: "Competitor report" },
  { id: "full", label: "Full marketing snapshot" },
];

export default function MarketingReportsPanel() {
  const { activeBusinessId } = useMarketingBusinesses();
  const { leads } = useMarketingLeads(activeBusinessId);
  const { competitors } = useMarketingCompetitors(activeBusinessId);
  const { logExport } = useMarketingSettings(activeBusinessId);

  const exportAll = async (format: "csv" | "xlsx" | "pdf") => {
    const headers = ["type", "name", "platform", "detail", "url"];
    const rows = [
      ...leads.map((l) => ["lead", l.lead_name, l.platform, l.intent ?? "", l.source_url]),
      ...competitors.map((c) => ["competitor", c.competitor_name, c.platform, c.main_offer ?? "", c.profile_url]),
    ];
    const base = `marketing-report-${activeBusinessId ?? "export"}`;
    if (format === "csv") exportRowsToCsv(`${base}.csv`, headers, rows);
    else if (format === "xlsx") await exportRowsToXlsx(`${base}.xlsx`, "Report", headers, rows);
    else exportHtmlToPdf("Marketing Report", rowsToHtmlTable(headers, rows));
    if (activeBusinessId) {
      await logExport({
        export_format: format,
        report_type: "full",
        row_count: rows.length,
        compliance_confirmed: true,
      });
    }
  };

  return (
    <div className="space-y-4">
      <MarketingCard className="p-5">
        <h2 className="text-lg font-semibold text-admin-fg">Report types</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {REPORT_TYPES.map((r) => (
            <li key={r.id} className="rounded-lg border border-admin-border px-3 py-2">
              {r.label} — {r.id === "leads" ? leads.length : r.id === "competitors" ? competitors.length : leads.length + competitors.length} rows
            </li>
          ))}
        </ul>
      </MarketingCard>
      <MarketingComplianceGuard
        onExport={exportAll}
        disabled={!leads.every((l) => l.source_url) || !competitors.every((c) => c.profile_url)}
      />
    </div>
  );
}
