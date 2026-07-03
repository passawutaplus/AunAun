import { Link } from "react-router-dom";
import { Copyright, FileCheck, Flag, Loader2, Shield, Trash2 } from "lucide-react";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import { Button } from "@/components/ui/button";
import { useAdminComplianceOverview } from "@/hooks/useLegalCompliance";

export default function AdminCompliancePage() {
  const { data, isLoading, error, refetch } = useAdminComplianceOverview();

  const queues = [
    {
      to: "/admin/reports",
      label: "รายงานเนื้อหา",
      hint: "สแปม ละเมิด คุกคาม",
      count: data?.open_reports ?? 0,
      icon: Flag,
      accent: (data?.open_reports ?? 0) > 0,
    },
    {
      to: "/admin/compliance/copyright",
      label: "คำร้องลิขสิทธิ์",
      hint: "Notice & takedown",
      count: data?.copyright_new ?? 0,
      icon: Copyright,
      accent: (data?.copyright_new ?? 0) > 0,
    },
    {
      to: "/admin/compliance/privacy",
      label: "คำขอ PDPA",
      hint: "ลบบัญชี / ส่งออกข้อมูล",
      count: data?.privacy_new ?? 0,
      icon: Shield,
      accent: (data?.privacy_new ?? 0) > 0,
    },
  ];

  return (
    <div>
      <SectionHeader
        title="Compliance"
        description="สุขภาพด้านกฎหมายและ PDPA — คิวที่ต้องดูแล"
      />

      {error ? (
        <div className="mt-4 rounded-sm border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">โหลดข้อมูลไม่สำเร็จ — migration อาจยังไม่รัน</p>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => void refetch()}>
            ลองใหม่
          </Button>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Consent 7 วัน" value={isLoading ? "…" : String(data?.consents_7d ?? 0)} />
        <KpiCard label="Cookie log 7 วัน" value={isLoading ? "…" : String(data?.cookie_logs_7d ?? 0)} />
        <KpiCard label="คำขอลบบัญชี" value={isLoading ? "…" : String(data?.privacy_delete ?? 0)} accent={(data?.privacy_delete ?? 0) > 0} />
        <KpiCard label="คิวรวม" value={isLoading ? "…" : String((data?.open_reports ?? 0) + (data?.copyright_new ?? 0) + (data?.privacy_new ?? 0))} accent />
      </div>

      <h2 className="mt-8 text-sm font-medium text-admin-fg">คิวที่ต้องดูแล</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {queues.map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.to}
              to={q.to}
              className="group flex flex-col gap-2 rounded-sm border border-admin-border bg-admin-surface p-4 transition hover:border-admin-accent/50"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-admin-muted group-hover:text-admin-accent" />
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-admin-muted" />
                ) : (
                  <span className={`font-mono text-2xl tabular-nums ${q.accent ? "text-admin-accent" : "text-admin-fg"}`}>
                    {q.count}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-sm text-admin-fg">{q.label}</p>
                <p className="text-[11px] text-admin-muted">{q.hint}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/moderation">Moderation</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/audit">Audit log</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/legal/terms" target="_blank">ดูข้อกำหนด (public)</Link>
        </Button>
      </div>
    </div>
  );
}
