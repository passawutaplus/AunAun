import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import AdminSupabaseUsagePanel from "@/components/admin/AdminSupabaseUsagePanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, Database, ExternalLink, KeyRound, Mail, Shield, Zap, HardDrive, ScrollText } from "lucide-react";
import { useAdminStats } from "@/hooks/admin/useAdminData";
import { getSupabaseProjectInfo } from "@/lib/supabaseProject";

const AUTH_HOOK_URL = "https://solofreelancer.com/lovable/email/auth/webhook";

export default function AdminSystemPage() {
  const [tab, setTab] = useState("health");
  const { data, isFetching, dataUpdatedAt } = useAdminStats();
  const supabase = useMemo(() => getSupabaseProjectInfo(), []);
  const authUrlsHref = supabase.projectRef
    ? `${supabase.dashboardUrl}/auth/url-configuration`
    : supabase.dashboardUrl;
  const authHooksHref = supabase.projectRef
    ? `${supabase.dashboardUrl}/auth/hooks`
    : supabase.dashboardUrl;

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

          <div className="rounded-sm border border-admin-border bg-admin-surface p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-admin-accent shrink-0" />
              <p className="text-sm font-medium text-admin-fg">Auth email &amp; รีเซ็ตรหัสผ่าน</p>
              <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                live
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-admin-muted">
              <li>Send Email hook → Resend <span className="font-mono text-admin-fg">noreply@aplus1.app</span></li>
              <li>Recovery link → <span className="font-mono text-admin-fg">/reset-password?token_hash=…</span></li>
              <li>ลืมรหัส → <Link to="/auth/forgot" className="text-admin-accent hover:underline">/auth/forgot</Link></li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={authHooksHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded border border-admin-border px-2.5 py-1 text-[11px] text-admin-fg hover:border-admin-accent"
              >
                Supabase Auth hooks <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={authUrlsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded border border-admin-border px-2.5 py-1 text-[11px] text-admin-fg hover:border-admin-accent"
              >
                Redirect URLs <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={AUTH_HOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded border border-admin-border px-2.5 py-1 text-[11px] text-admin-fg hover:border-admin-accent"
              >
                Hook endpoint <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-[10px] text-admin-muted font-mono break-all">{AUTH_HOOK_URL}</p>
          </div>

          <div className="rounded-sm border border-admin-border bg-admin-surface p-4 space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-admin-muted shrink-0" />
              <p className="text-sm font-medium text-admin-fg">เปลี่ยนรหัส (logged-in)</p>
            </div>
            <p className="text-xs text-admin-muted">
              ผู้ใช้ที่ login แล้วเปลี่ยนรหัสได้ที่ Settings → รหัสผ่าน (ไม่ต้องผ่านอีเมล)
            </p>
          </div>

          <div className="border border-admin-border bg-admin-surface p-4 rounded-sm font-mono text-xs text-admin-muted">
            <p>last-stats-update: {dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : "—"}</p>
            <p>counters: users={data?.totalUsers ?? "—"} · studios={data?.totalStudios ?? "—"} · projects={data?.publishedProjects ?? "—"}</p>
            <p>supabase: {supabase.projectRef || "—"} · {supabase.apiHost || "—"}</p>
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
                <p className="font-medium text-sm text-admin-fg">Storage & ค่าใช้จ่าย</p>
                <p className="text-xs text-admin-muted">พื้นที่ไฟล์ / DB · ประมาณเงิน · ลิงก์ Supabase</p>
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
