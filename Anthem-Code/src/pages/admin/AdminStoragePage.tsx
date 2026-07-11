import { useMemo } from "react";
import { Link } from "react-router-dom";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import DataTable, { Column } from "@/components/admin/DataTable";
import { useAdminSupabaseUsage } from "@/hooks/admin/useAdminSupabaseUsage";
import {
  estimateSupabaseMonthlyCost,
  formatBytes,
  formatThb,
  formatUsd,
} from "@/lib/supabaseCostEstimate";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  HardDrive,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";

type BucketRow = { name: string; objects: number; bytes: number; truncated: boolean };

function UsageBar({ percent, label }: { percent: number; label: string }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const color =
    clamped >= 100 ? "bg-red-500" : clamped >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs gap-2">
        <span className="text-admin-muted">{label}</span>
        <span className="font-mono text-admin-fg shrink-0">{clamped.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-admin-hover overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function statusTone(status: "ok" | "watch" | "over") {
  if (status === "over") return "border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300";
  if (status === "watch") return "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-200";
  return "border-emerald-500/40 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200";
}

export default function AdminStoragePage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminSupabaseUsage();

  const cost = useMemo(() => {
    if (!data) return null;
    return estimateSupabaseMonthlyCost({
      planLabel: data.platform.organization?.planLabel ?? data.upgrade_advice?.currentPlan,
      storageBytes: data.storage.total_bytes,
      dbBytes: data.platform.database?.bytes ?? 0,
      storageLimitGb: data.platform.limits?.storageGb,
      dbLimitGb: data.platform.limits?.databaseGb,
    });
  }, [data]);

  const bucketCols: Column<BucketRow>[] = [
    { key: "name", header: "Bucket", render: (r) => <span className="font-mono text-xs">{r.name}</span> },
    {
      key: "objects",
      header: "ไฟล์",
      render: (r) => (
        <span className="font-mono text-xs">
          {r.objects.toLocaleString("th-TH")}
          {r.truncated ? "+" : ""}
        </span>
      ),
    },
    {
      key: "size",
      header: "ขนาด",
      render: (r) => (
        <span className="font-mono text-xs">
          {formatBytes(r.bytes)}
          {r.truncated ? " ~" : ""}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-admin-muted" />
      </div>
    );
  }

  if (isError || !data || !cost) {
    return (
      <div>
        <SectionHeader
          eyebrow="storage"
          title="Storage & ค่าใช้จ่าย"
          description="มอนิเตอร์พื้นที่เก็บไฟล์และประมาณเงินที่ต้องจ่ายบน Supabase"
        />
        <div className="border border-red-500/30 bg-red-500/5 p-4 rounded-sm text-sm mb-3">
          {error instanceof Error ? error.message : "โหลดไม่สำเร็จ"} — ตรวจว่า deploy edge function{" "}
          <code className="text-xs">admin-supabase-usage</code> และตั้ง{" "}
          <code className="text-xs">MGMT_ACCESS_TOKEN</code> แล้ว
        </div>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  const links = data.console_links;
  const advice = data.upgrade_advice;

  return (
    <div>
      <SectionHeader
        eyebrow="storage"
        title="Storage & ค่าใช้จ่าย"
        description="ดูว่าเว็บใช้พื้นที่เท่าไหร่ เกินลิมิตหรือยัง และประมาณค่าใช้จ่ายต่อเดือน (ลิงก์ตรงไป Supabase)"
        actions={
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
        }
      />

      {/* Status */}
      <div className={`border rounded-sm p-4 mb-5 ${statusTone(cost.status)}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {cost.status === "ok" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-sm">{cost.statusLabelTh}</p>
              <p className="text-xs mt-1 opacity-90">
                แผน {cost.planLabel} · โปรเจกต์ {data.project_ref}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={links.storage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
            >
              เปิด Storage ใน Supabase <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={links.usage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
            >
              Billing Usage <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        {advice?.reasons?.length ? (
          <ul className="mt-3 space-y-1 text-xs list-disc list-inside opacity-95">
            {advice.reasons.slice(0, 4).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="ไฟล์ Storage" value={formatBytes(data.storage.total_bytes)} icon={HardDrive} accent />
        <KpiCard label="ฐานข้อมูล (DB)" value={formatBytes(data.platform.database?.bytes ?? 0)} icon={Database} />
        <KpiCard
          label="ประมาณการ / เดือน"
          value={formatThb(cost.estimatedMonthlyThb)}
          icon={Wallet}
        />
        <KpiCard label="แผนปัจจุบัน" value={cost.planLabel} />
      </div>

      {/* Bars + money */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="border border-admin-border bg-admin-surface rounded-sm p-4 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-admin-muted">การใช้โควต้า</p>
          <UsageBar
            percent={cost.storagePercent}
            label={`Storage ${formatBytes(data.storage.total_bytes)} / ${cost.storageLimitGb} GB`}
          />
          <UsageBar
            percent={cost.dbPercent}
            label={`Database ${formatBytes(data.platform.database?.bytes ?? 0)} / ${cost.dbLimitGb} GB`}
          />
          <p className="text-[11px] text-admin-muted">
            สแกนจาก Storage API (bucket ใหญ่อาจประมาณการถ้าเกิน 5,000 ไฟล์/bucket)
          </p>
        </div>

        <div className="border border-admin-border bg-admin-surface rounded-sm p-4 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-admin-muted">ประมาณค่าใช้จ่าย</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-semibold text-admin-fg tabular-nums">
              {formatThb(cost.estimatedMonthlyThb)}
            </p>
            <p className="text-sm text-admin-muted pb-1">/ เดือน · {formatUsd(cost.estimatedMonthlyUsd)}</p>
          </div>
          <div className="text-xs space-y-1.5 text-admin-muted">
            <p className="flex justify-between gap-2">
              <span>ค่าแผนพื้นฐาน</span>
              <span className="font-mono text-admin-fg">{formatUsd(cost.baseUsd)}</span>
            </p>
            <p className="flex justify-between gap-2">
              <span>Overage Storage</span>
              <span className="font-mono text-admin-fg">{formatUsd(cost.storageOverageUsd)}</span>
            </p>
            <p className="flex justify-between gap-2">
              <span>Overage Database</span>
              <span className="font-mono text-admin-fg">{formatUsd(cost.dbOverageUsd)}</span>
            </p>
            <p className="text-[10px] pt-1">อัตราแลกเปลี่ยนประมาณ 1 USD ≈ {cost.usdToThb} THB</p>
          </div>
          <ul className="text-[11px] text-admin-muted space-y-1 list-disc list-inside">
            {cost.notesTh.slice(0, 3).map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Buckets */}
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-admin-muted mb-2">
          แยกตาม Bucket
        </p>
        <DataTable
          columns={bucketCols}
          rows={data.storage.buckets}
          loading={false}
          rowKey={(r) => r.name}
          empty="ไม่พบ bucket"
        />
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <a href={links.dashboard} target="_blank" rel="noopener noreferrer" className="text-admin-accent hover:underline inline-flex items-center gap-1">
          Dashboard <ExternalLink className="h-3 w-3" />
        </a>
        <a href={links.usage} target="_blank" rel="noopener noreferrer" className="text-admin-accent hover:underline inline-flex items-center gap-1">
          Billing Usage <ExternalLink className="h-3 w-3" />
        </a>
        <a href={links.storage} target="_blank" rel="noopener noreferrer" className="text-admin-accent hover:underline inline-flex items-center gap-1">
          Storage <ExternalLink className="h-3 w-3" />
        </a>
        <Link to="/admin/system" className="text-admin-accent hover:underline">
          สุขภาพระบบ (DB / API ละเอียด)
        </Link>
      </div>
    </div>
  );
}
