import { useState } from "react";
import {
  Users,
  Crown,
  UserPlus,
  Ticket,
  Rocket,
  FileText,
  FolderKanban,
  Briefcase,
  Handshake,
  Flag,
  Wallet,
  ShieldCheck,
  Shield,
  MessageSquare,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useHubAuth } from "@/hooks/useHubAuth";
import { useHubAlertWatcher } from "@/hooks/useHubAlertWatcher";
import { filterAlerts, useHubMetrics, type HubView } from "@/hooks/useHubMetrics";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { AlertQueue } from "@/components/AlertQueue";
import { KpiCard } from "@/components/KpiCard";
import { DeepLinks } from "@/components/DeepLinks";

export default function DashboardPage() {
  const { user, signOut } = useHubAuth();
  const { data, isLoading, isFetching, refetch, error } = useHubMetrics();
  const [view, setView] = useState<HubView>("all");
  useHubAlertWatcher(!!user);

  const alerts = filterAlerts(data?.alerts ?? [], view);

  const showSo1o = view === "all" || view === "so1o";
  const showAn1hem = view === "all" || view === "an1hem";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">S1</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-an1hem text-xs font-bold text-white">a1</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">So1o Ops Hub</p>
              <p className="text-[10px] text-muted">Ecosystem Mission Control</p>
            </div>
          </div>
          <ViewSwitcher value={view} onChange={setView} />
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-border p-2 text-muted hover:text-ink"
              title="รีเฟรช"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <span className="hidden text-xs text-muted sm:inline">{user?.email}</span>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface"
            >
              <LogOut className="h-3.5 w-3.5" /> ออก
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            โหลดข้อมูลไม่สำเร็จ: {(error as Error).message}
          </div>
        ) : null}

        <AlertQueue alerts={alerts} />

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">ตัวชี้วัด</h2>
          {isLoading ? (
            <p className="text-sm text-muted">กำลังโหลด...</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {showSo1o && (
                <>
                  <KpiCard label="สมาชิก (So1o)" value={data?.so1o.totalUsers ?? "—"} icon={Users} />
                  <KpiCard label="Pro" value={data?.so1o.proUsers ?? "—"} icon={Crown} accent />
                  <KpiCard label="สมัครใหม่ 24ชม." value={data?.so1o.newUsers24h ?? "—"} icon={UserPlus} />
                  <KpiCard label="ตั๋วเปิด" value={data?.so1o.openTickets ?? "—"} icon={Ticket} accent={!!data?.so1o.openTickets} />
                  <KpiCard label="Early Access ค้าง" value={data?.so1o.earlyAccessPending ?? "—"} icon={Rocket} accent={!!data?.so1o.earlyAccessPending} />
                  <KpiCard label="ใบเสนอราคา 7วัน" value={data?.so1o.quotations7d ?? "—"} icon={FileText} />
                </>
              )}
              {showAn1hem && (
                <>
                  <KpiCard label="ผลงาน Published" value={data?.an1hem.publishedProjects ?? "—"} icon={FolderKanban} />
                  <KpiCard label="งานเปิด" value={data?.an1hem.openJobs ?? "—"} icon={Briefcase} />
                  <KpiCard label="คำขอจ้าง" value={data?.an1hem.pendingHiring ?? "—"} icon={Handshake} accent={!!data?.an1hem.pendingHiring} />
                  <KpiCard label="รายงานเนื้อหา" value={data?.an1hem.openReports ?? "—"} icon={Flag} accent={!!data?.an1hem.openReports} />
                  <KpiCard label="ถอน Pixel" value={data?.an1hem.pendingCashouts ?? "—"} icon={Wallet} accent={!!data?.an1hem.pendingCashouts} />
                  <KpiCard label="KYC ค้าง" value={data?.an1hem.pendingKyc ?? "—"} icon={ShieldCheck} accent={!!data?.an1hem.pendingKyc} />
                  <KpiCard label="AML" value={data?.an1hem.openAml ?? "—"} icon={Shield} accent={!!data?.an1hem.openAml} />
                  <KpiCard label="ฟีดแบ็กใหม่" value={data?.an1hem.openFeedback ?? "—"} icon={MessageSquare} />
                </>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">เปิด Admin ลึก</h2>
          <DeepLinks view={view} />
        </section>

        <p className="text-center text-[10px] text-muted">
          รีเฟรชอัตโนมัติทุก 30 วินาที · ข้อมูลจาก Supabase rvnzjiskqliexysicfmh
        </p>
      </main>
    </div>
  );
}
