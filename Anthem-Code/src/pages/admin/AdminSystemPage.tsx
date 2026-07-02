import { useState } from "react";
import { Link } from "react-router-dom";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import AdminSupabaseUsagePanel from "@/components/admin/AdminSupabaseUsagePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, Database, Zap, Shield, HardDrive, ScrollText } from "lucide-react";
import { useAdminStats } from "@/hooks/admin/useAdminData";

export default function AdminSystemPage() {
  const [tab, setTab] = useState("health");
  const { data, isFetching, dataUpdatedAt } = useAdminStats();

  return (
    <div>
      <SectionHeader eyebrow="system" title="สุขภาพระบบ" description="สถานะการเชื่อมต่อ การใช้งาน Supabase และลิงก์ด่วน" />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="bg-admin-surface border border-admin-border flex-wrap h-auto">
          <TabsTrigger value="health">สุขภาพ</TabsTrigger>
          <TabsTrigger value="supabase">Supabase Usage</TabsTrigger>
          <TabsTrigger value="links">ลิงก์ด่วน</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="mt-4 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Database" value="ONLINE" accent icon={Database} />
            <KpiCard label="Realtime" value="ONLINE" accent icon={Zap} />
            <KpiCard label="Auth" value="ONLINE" accent icon={Shield} />
            <KpiCard label="Stats refresh" value={isFetching ? "LIVE" : "IDLE"} icon={Activity} />
          </div>
          <div className="border border-admin-border bg-admin-surface p-4 rounded-sm font-mono text-xs text-admin-muted">
            <p>last-stats-update: {dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : "—"}</p>
            <p>counters: users={data?.totalUsers ?? "—"} · studios={data?.totalStudios ?? "—"} · projects={data?.publishedProjects ?? "—"}</p>
          </div>
        </TabsContent>

        <TabsContent value="supabase" className="mt-4">
          <AdminSupabaseUsagePanel />
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              to="/admin/storage"
              className="flex items-center gap-3 border border-admin-border bg-admin-surface rounded-sm p-4 hover:border-admin-fg transition-colors"
            >
              <HardDrive className="w-5 h-5 text-admin-muted shrink-0" />
              <div>
                <p className="font-medium text-sm text-admin-fg">พื้นที่เก็บไฟล์</p>
                <p className="text-xs text-admin-muted">จัดการ storage buckets และ usage ในแอป</p>
              </div>
            </Link>
            <Link
              to="/admin/audit"
              className="flex items-center gap-3 border border-admin-border bg-admin-surface rounded-sm p-4 hover:border-admin-fg transition-colors"
            >
              <ScrollText className="w-5 h-5 text-admin-muted shrink-0" />
              <div>
                <p className="font-medium text-sm text-admin-fg">บันทึกการใช้งาน</p>
                <p className="text-xs text-admin-muted">audit log การกระทำของแอดมิน</p>
              </div>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
