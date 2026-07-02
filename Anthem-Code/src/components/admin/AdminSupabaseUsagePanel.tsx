import KpiCard from "@/components/admin/KpiCard";
import DataTable, { Column } from "@/components/admin/DataTable";
import { useAdminSupabaseUsage } from "@/hooks/admin/useAdminSupabaseUsage";
import { getSupabaseProjectInfo, isProjectConfigConsistent } from "@/lib/supabaseProject";
import {
  Database,
  ExternalLink,
  HardDrive,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function fmtBytes(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function fmtNum(n: number) {
  return n.toLocaleString("th-TH");
}

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function UsageBar({ percent, label }: { percent: number | null | undefined; label: string }) {
  if (percent == null || Number.isNaN(percent)) {
    return <p className="text-xs text-admin-muted">{label}: ไม่มีข้อมูล quota</p>;
  }
  const clamped = Math.min(100, Math.max(0, percent));
  const color =
    clamped >= 90 ? "bg-red-500" : clamped >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-admin-muted">{label}</span>
        <span className="font-mono text-admin-fg">{clamped.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-admin-hover overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

type BucketRow = { name: string; objects: number; bytes: number; truncated: boolean };
type TableRow = { schema: string; table: string; rows: number };

export default function AdminSupabaseUsagePanel() {
  const clientInfo = getSupabaseProjectInfo();
  const configOk = isProjectConfigConsistent(clientInfo);
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminSupabaseUsage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-admin-muted" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <div className="border border-red-500/30 bg-red-500/5 p-4 rounded-sm text-sm">
          {error instanceof Error ? error.message : "unknown"} — deploy{" "}
          <code className="text-xs">admin-supabase-usage</code>
        </div>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  const { platform, storage, counts, top_tables, console_links, latency_ms } = data;
  const mgmtOk = platform.managementConfigured;
  const dbBytes = platform.database?.bytes ?? 0;
  const storageLimitGb = platform.limits?.storageGb ?? 1;
  const storagePercent = storage.total_bytes > 0
    ? (storage.total_bytes / (storageLimitGb * 1024 ** 3)) * 100
    : null;

  const bucketCols: Column<BucketRow>[] = [
    { key: "name", header: "Bucket", render: (r) => <span className="font-mono text-xs">{r.name}</span> },
    { key: "objects", header: "Objects", render: (r) => <span className="font-mono text-xs">{fmtNum(r.objects)}{r.truncated ? "+" : ""}</span> },
    { key: "size", header: "ขนาด", render: (r) => <span className="font-mono text-xs">{fmtBytes(r.bytes)}{r.truncated ? " ~" : ""}</span> },
  ];

  const tableCols: Column<TableRow>[] = [
    { key: "schema", header: "Schema", render: (r) => <span className="font-mono text-xs">{r.schema}</span> },
    { key: "table", header: "Table", render: (r) => <span className="font-mono text-xs">{r.table}</span> },
    { key: "rows", header: "Rows (est.)", render: (r) => <span className="font-mono text-xs">{fmtNum(r.rows)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] text-admin-muted">
          โปรเจกต์ {data.project_ref} · {fmtWhen(data.generated_at)}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-admin-border"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      <div
        className={`border rounded-sm p-4 space-y-3 ${
          configOk ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-admin-fg">
          {configOk ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          Client config
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-admin-hover">ref={clientInfo.projectRef}</span>
          <span className="px-2 py-0.5 rounded bg-admin-hover truncate">{clientInfo.apiHost}</span>
          <span className="px-2 py-0.5 rounded bg-admin-hover">
            key {clientInfo.hasPublishableKey ? "OK" : "MISSING"}
          </span>
          <span className="px-2 py-0.5 rounded bg-admin-hover">latency {latency_ms}ms</span>
        </div>
        {!mgmtOk && platform.managementNote && (
          <p className="text-xs text-amber-700">{platform.managementNote}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <a
            href={console_links.dashboard}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-admin-accent hover:underline"
          >
            Dashboard <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={console_links.usage}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-admin-accent hover:underline"
          >
            Billing Usage <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {platform.project && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Plan"
            value={platform.organization?.planLabel ?? "—"}
            icon={Database}
            accent
          />
          <KpiCard label="Status" value={String(platform.project.status).toUpperCase()} icon={Zap} />
          <KpiCard label="Region" value={platform.project.region} icon={Database} />
          <KpiCard
            label="Backups"
            value={platform.backups ? String(platform.backups.count) : "—"}
            icon={HardDrive}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="border border-admin-border bg-admin-surface rounded-sm p-4 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-admin-muted">Database</p>
          <KpiCard label="ขนาด DB" value={dbBytes ? fmtBytes(dbBytes) : "—"} icon={Database} />
          <UsageBar percent={platform.database?.percentOfLimit} label={`เทียบ limit ${platform.limits?.databaseGb ?? "?"} GB`} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-[10px] text-admin-muted uppercase">Profiles</p>
              <p className="font-mono">{fmtNum(counts.profiles)}</p>
            </div>
            <div>
              <p className="text-[10px] text-admin-muted uppercase">Auth users</p>
              <p className="font-mono">{counts.auth_users != null ? fmtNum(counts.auth_users) : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-admin-muted uppercase">Projects</p>
              <p className="font-mono">{fmtNum(counts.projects)}</p>
            </div>
            <div>
              <p className="text-[10px] text-admin-muted uppercase">Messages</p>
              <p className="font-mono">{fmtNum(counts.messages)}</p>
            </div>
          </div>
        </div>

        <div className="border border-admin-border bg-admin-surface rounded-sm p-4 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-admin-muted">Storage</p>
          <KpiCard label="รวม (สแกน)" value={fmtBytes(storage.total_bytes)} icon={HardDrive} accent />
          <UsageBar percent={storagePercent} label={`เทียบ limit ${storageLimitGb} GB`} />
          <p className="text-[11px] text-admin-muted">
            นับจาก list API — bucket ใหญ่อาจถูก truncate ที่ 5,000 objects
          </p>
        </div>
      </div>

      {platform.apiUsage7d && (
        <div className="border border-admin-border bg-admin-surface rounded-sm p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-admin-muted mb-3">
            API requests (7 วัน)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <KpiCard label="REST" value={fmtNum(platform.apiUsage7d.rest)} icon={Database} />
            <KpiCard label="Auth" value={fmtNum(platform.apiUsage7d.auth)} icon={Users} />
            <KpiCard label="Storage" value={fmtNum(platform.apiUsage7d.storage)} icon={HardDrive} />
            <KpiCard label="Realtime" value={fmtNum(platform.apiUsage7d.realtime)} icon={Zap} />
            <KpiCard label="รวม" value={fmtNum(platform.apiUsage7d.total)} icon={Zap} accent />
          </div>
          {platform.apiUsage7d.daily.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-admin-muted border-t border-admin-border">
                    <th className="text-left p-2 font-mono">วัน</th>
                    <th className="text-right p-2 font-mono">REST</th>
                    <th className="text-right p-2 font-mono">Auth</th>
                    <th className="text-right p-2 font-mono">Storage</th>
                    <th className="text-right p-2 font-mono">Realtime</th>
                  </tr>
                </thead>
                <tbody>
                  {platform.apiUsage7d.daily.map((row) => (
                    <tr key={row.date} className="border-t border-admin-border/50">
                      <td className="p-2 font-mono">{row.date}</td>
                      <td className="p-2 text-right font-mono">{fmtNum(row.rest)}</td>
                      <td className="p-2 text-right font-mono">{fmtNum(row.auth)}</td>
                      <td className="p-2 text-right font-mono">{fmtNum(row.storage)}</td>
                      <td className="p-2 text-right font-mono">{fmtNum(row.realtime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {platform.apiUsageError && mgmtOk && (
        <p className="text-xs text-admin-muted font-mono">{platform.apiUsageError}</p>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-admin-muted mb-2">Storage buckets</p>
          <DataTable
            columns={bucketCols}
            rows={storage.buckets}
            loading={false}
            rowKey={(r) => r.name}
            empty="ไม่พบ bucket"
          />
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-admin-muted mb-2">Top tables</p>
          <DataTable
            columns={tableCols}
            rows={top_tables}
            loading={false}
            rowKey={(r) => `${r.schema}.${r.table}`}
            empty={mgmtOk ? "ไม่มีข้อมูล" : "ต้องตั้ง MGMT_ACCESS_TOKEN"}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <a href={console_links.storage} target="_blank" rel="noopener noreferrer" className="text-admin-accent hover:underline inline-flex items-center gap-1">
          Storage <ExternalLink className="h-3 w-3" />
        </a>
        <a href={console_links.backups} target="_blank" rel="noopener noreferrer" className="text-admin-accent hover:underline inline-flex items-center gap-1">
          Backups <ExternalLink className="h-3 w-3" />
        </a>
        <a href={console_links.functions} target="_blank" rel="noopener noreferrer" className="text-admin-accent hover:underline inline-flex items-center gap-1">
          Edge Functions <ExternalLink className="h-3 w-3" />
        </a>
        <a href={console_links.logs} target="_blank" rel="noopener noreferrer" className="text-admin-accent hover:underline inline-flex items-center gap-1">
          Logs <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
