import { useMemo, useState } from "react";
import { ExternalLink, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { useKuyRadarContext } from "@/hooks/admin/KuyRadarContext";
import { useKuyRadarBusinesses } from "@/hooks/admin/useKuyRadarBusinesses";
import { parseLeadsCsv, useKuyRadarLeads } from "@/hooks/admin/useKuyRadarLeads";
import { KUY_LEAD_STATUSES, KUY_PLATFORMS, type KuyLeadStatus } from "@/lib/kuy-radar/types";
import { kuyStatusLabel } from "@/lib/kuy-radar/i18n";
import { KuyRadarCard } from "./KuyRadarShell";

export default function KuyLeadTable() {
  const { uiLanguage } = useKuyRadarContext();
  const { activeBusinessId } = useKuyRadarBusinesses();
  const { leads, createLead, bulkUpdateStatus } = useKuyRadarLeads(activeBusinessId);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("All");
  const [selected, setSelected] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [paste, setPaste] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter((l) => {
      const matchPlatform = platform === "All" || l.platform === platform;
      const matchQuery =
        !needle ||
        [l.lead_name, l.platform, l.intent, l.pain_point, l.status].some((v) =>
          (v ?? "").toLowerCase().includes(needle),
        );
      return matchPlatform && matchQuery;
    });
  }, [leads, platform, query]);

  const importCsv = async (text: string) => {
    const rows = parseLeadsCsv(text);
    for (const row of rows) {
      if (!row.source_url) continue;
      await createLead({
        platform: row.platform ?? "Website",
        source_url: row.source_url,
        lead_name: row.lead_name ?? "Imported",
        matched_keyword: row.matched_keyword ?? null,
        intent: row.intent ?? null,
        pain_point: row.pain_point ?? null,
        post_summary: null,
        engagement: row.engagement ?? 0,
        lead_score: row.lead_score ?? null,
        urgency_level: null,
        buying_signal: null,
        suggested_offer: null,
        outreach_message: null,
        status: row.status ?? "new",
        tags: null,
      });
    }
    toast.success(`Imported ${rows.length} rows`);
    setImportOpen(false);
    setPaste("");
  };

  return (
    <KuyRadarCard className="overflow-hidden">
      <div className="border-b border-admin-border p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="kuy-section-label text-xs font-semibold uppercase tracking-wide">Lead Finder</p>
            <h2 className="mt-1 text-lg font-semibold text-admin-fg">Leads ready for outreach</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search leads"
                className="kuy-input h-9 w-56 rounded-lg pl-9 pr-3 text-sm"
              />
            </label>
            <select
              className="h-9 rounded-lg border border-admin-border px-2 text-sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="All">All</option>
              {KUY_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-admin-border px-3 text-sm"
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
          </div>
        </div>
        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {KUY_LEAD_STATUSES.slice(0, 4).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => void bulkUpdateStatus({ ids: selected, status })}
                className="rounded-full border border-admin-border px-3 py-1 text-xs"
              >
                → {kuyStatusLabel(uiLanguage, status)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-admin-border bg-admin-hover/50 text-[11px] uppercase tracking-wide text-admin-muted">
            <tr>
              <th className="px-4 py-3" />
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 font-semibold">Lead</th>
              <th className="px-4 py-3 font-semibold">Intent</th>
              <th className="px-4 py-3 font-semibold">Pain</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead.id} className="kuy-row-hover border-b border-admin-border">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(lead.id)}
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked ? [...s, lead.id] : s.filter((id) => id !== lead.id),
                      )
                    }
                  />
                </td>
                <td className="px-4 py-3 font-medium">{lead.platform}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{lead.lead_name}</p>
                  <p className="text-xs text-admin-muted">{lead.source_url}</p>
                </td>
                <td className="px-4 py-3">{lead.intent}</td>
                <td className="px-4 py-3 text-admin-muted">{lead.pain_point}</td>
                <td className="px-4 py-3 font-semibold tabular-nums">{lead.lead_score ?? "—"}</td>
                <td className="px-4 py-3">{kuyStatusLabel(uiLanguage, lead.status)}</td>
                <td className="px-4 py-3">
                  <a
                    href={lead.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kuy-link inline-flex items-center gap-1 text-xs font-semibold"
                  >
                    Open source
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {importOpen && (
        <div className="border-t border-admin-border p-5">
          <p className="text-sm font-medium">Paste CSV (headers: lead_name, platform, source_url, intent, pain_point)</p>
          <textarea
            className="mt-2 h-32 w-full rounded-lg border border-admin-border p-3 text-sm"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void importCsv(paste)}
              className="kuy-btn-primary rounded-lg px-4 py-2 text-sm"
            >
              Import
            </button>
            <button type="button" onClick={() => setImportOpen(false)} className="rounded-lg border px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
    </KuyRadarCard>
  );
}
