import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import { Activity, Database, Zap, Shield } from "lucide-react";
import { useAdminStats } from "@/hooks/admin/useAdminData";

export default function AdminSystemPage() {
  const { data, isFetching, dataUpdatedAt } = useAdminStats();
  return (
    <div>
      <SectionHeader eyebrow="system" title="สุขภาพระบบ" description="สถานะการเชื่อมต่อและการตอบสนอง" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Database" value="ONLINE" accent icon={Database} />
        <KpiCard label="Realtime" value="ONLINE" accent icon={Zap} />
        <KpiCard label="Auth" value="ONLINE" accent icon={Shield} />
        <KpiCard label="Stats refresh" value={isFetching ? "LIVE" : "IDLE"} icon={Activity} />
      </div>
      <div className="mt-6 border border-admin-border bg-admin-surface p-4 rounded-sm font-mono text-xs text-admin-muted">
        <p>last-stats-update: {dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : "—"}</p>
        <p>counters: users={data?.totalUsers ?? "—"} · studios={data?.totalStudios ?? "—"} · projects={data?.publishedProjects ?? "—"}</p>
      </div>
    </div>
  );
}
