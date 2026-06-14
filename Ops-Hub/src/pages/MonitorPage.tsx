import { RefreshCw, Database, Cloud, Bot, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { useInfraMonitor } from "@/hooks/useInfraMonitor";
import { SiteHealthCards } from "@/components/infra/SiteHealthCards";
import { UsageBar } from "@/components/infra/UsageBar";
import {
  UpgradeAdviceBanner,
  UpgradeAdviceCards,
} from "@/components/infra/UpgradeAdviceBanner";
import { MonitoringChecklistSection } from "@/components/infra/MonitoringChecklistSection";
import { CrossAppSmokeSection } from "@/components/CrossAppSmokeSection";
import { PlaybooksSection } from "@/components/PlaybooksSection";
import { fmtBytes, fmtNum, fmtWhen } from "@/lib/format-infra";
import { VERDICT_LABEL } from "@/lib/infra-monitor-types";

export default function MonitorPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useInfraMonitor();

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="มอนิเตอร์"
        subtitle="สุขภาพเว็บ, Supabase/Vercel usage และคำแนะนำอัปเกรด Pro — อัปเดตทุก 60 วินาที"
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-border p-2 text-muted hover:text-ink"
            title="รีเฟรช"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        }
      />

      <main className="space-y-8 p-6">
        <div className="rounded-xl border border-border bg-surface/40 px-4 py-3 text-sm leading-relaxed text-muted">
          <strong className="text-ink">หน้านี้ดูอะไร?</strong>{" "}
          ตรวจว่า So1o, an1hem และ Ops Hub ยังเปิดได้ไหม ใช้ Supabase/Vercel ไปถึงไหนแล้ว
          และควรซื้อ Pro plan หรือยัง — ข้อมูลจาก edge function{" "}
          <code className="text-[10px]">ops-infra-monitor</code>
          {data ? ` · อัปเดต ${fmtWhen(data.generated_at)}` : null}
        </div>

        {isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            โหลดไม่สำเร็จ: {error instanceof Error ? error.message : "unknown"} — deploy{" "}
            <code className="text-[10px]">ops-infra-monitor</code> ก่อน
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted">กำลังโหลดข้อมูล infra...</p>
        ) : data ? (
          <>
            <UpgradeAdviceBanner items={data.upgrade_advice} />

            <section>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-ink">สถานะเว็บ (Live)</h2>
                <p className="mt-0.5 text-xs text-muted">HTTP probe จาก edge function</p>
              </div>
              <SiteHealthCards probes={data.health} />
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">คำแนะนำอัปเกรด Pro</h2>
                <p className="mt-0.5 text-xs text-muted">
                  สรุป: {VERDICT_LABEL[data.overall_verdict]}
                </p>
              </div>
              <UpgradeAdviceCards items={data.upgrade_advice} />
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Supabase</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    โปรเจกต์ {data.supabase.project_ref} · latency {data.supabase.latency_ms}ms
                  </p>
                </div>
                <a
                  href={data.supabase.console_links.usage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                >
                  Billing Usage <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {!data.supabase.platform.managementConfigured &&
              data.supabase.platform.managementNote ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {data.supabase.platform.managementNote}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Plan"
                  value={data.supabase.platform.organization?.planLabel ?? "—"}
                  icon={Database}
                  accent
                  href={data.supabase.console_links.dashboard}
                />
                <KpiCard
                  label="ขนาด DB"
                  value={
                    data.supabase.platform.database?.bytes
                      ? fmtBytes(data.supabase.platform.database.bytes)
                      : "—"
                  }
                  icon={Database}
                />
                <KpiCard
                  label="Storage (สแกน)"
                  value={fmtBytes(data.supabase.storage.total_bytes)}
                  icon={Database}
                  href={data.supabase.console_links.storage}
                />
                <KpiCard
                  label="Auth users"
                  value={
                    data.supabase.counts.auth_users != null
                      ? fmtNum(data.supabase.counts.auth_users)
                      : "—"
                  }
                  icon={Database}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                  <UsageBar
                    percent={data.supabase.platform.database?.percentOfLimit}
                    label={`Database เทียบ ${data.supabase.platform.limits?.databaseGb ?? "?"} GB`}
                  />
                </div>
                <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                  <UsageBar
                    percent={
                      data.supabase.storage.total_bytes > 0 &&
                      data.supabase.platform.limits?.storageGb
                        ? (data.supabase.storage.total_bytes /
                            (data.supabase.platform.limits.storageGb * 1024 ** 3)) *
                          100
                        : null
                    }
                    label={`Storage เทียบ ${data.supabase.platform.limits?.storageGb ?? "?"} GB`}
                  />
                </div>
              </div>

              {data.supabase.platform.apiUsage7d ? (
                <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                  <p className="mb-3 text-xs font-medium text-muted">API requests (7 วัน)</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <div>
                      <p className="text-[10px] text-muted">REST</p>
                      <p className="font-mono text-sm">{fmtNum(data.supabase.platform.apiUsage7d.rest)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted">Auth</p>
                      <p className="font-mono text-sm">{fmtNum(data.supabase.platform.apiUsage7d.auth)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted">Storage</p>
                      <p className="font-mono text-sm">{fmtNum(data.supabase.platform.apiUsage7d.storage)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted">Realtime</p>
                      <p className="font-mono text-sm">{fmtNum(data.supabase.platform.apiUsage7d.realtime)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted">รวม</p>
                      <p className="font-mono text-sm font-semibold">
                        {fmtNum(data.supabase.platform.apiUsage7d.total)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Vercel</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Projects: 1px-demo (an1hem) · solo-demo-liart (So1o)
                  </p>
                </div>
                <a
                  href={data.vercel.console_links.usage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                >
                  Vercel Usage <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {data.vercel.note ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {data.vercel.note}
                </p>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-2">
                {data.vercel.projects.map((p) => (
                  <div
                    key={p.slug}
                    className="rounded-xl border border-border bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink">{p.label}</p>
                        <p className="text-[10px] text-muted">{p.slug}</p>
                      </div>
                      <Cloud className="h-4 w-4 text-muted" />
                    </div>
                    <p className="mt-2 text-xs text-muted">{p.prodUrl}</p>
                    {p.error ? (
                      <p className="mt-2 text-xs text-red-600">{p.error}</p>
                    ) : p.latestDeployment ? (
                      <div className="mt-3 space-y-1 text-xs">
                        <p>
                          Deploy ล่าสุด:{" "}
                          <span
                            className={
                              p.latestDeployment.state === "READY"
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }
                          >
                            {p.latestDeployment.state}
                          </span>
                        </p>
                        <p className="text-muted">{fmtWhen(p.latestDeployment.createdAt)}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted">ไม่มี deployment ล่าสุด</p>
                    )}
                    <a
                      href={p.dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-brand hover:underline"
                    >
                      Dashboard <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>

              {data.vercel.billing && data.vercel.billing.services.length > 0 ? (
                <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-medium text-muted">Billing period นี้</p>
                  <p className="font-mono text-lg font-semibold">
                    ${data.vercel.billing.totalCost.toFixed(2)}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">AI / Gemini</h2>
                <p className="mt-0.5 text-xs text-muted">สรุปจาก ai_credit_ledger</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard
                  label="Gemini probe"
                  value={
                    !data.ai.gemini.configured
                      ? "ไม่ได้ตั้ง key"
                      : data.ai.gemini.reachable
                        ? "OK"
                        : "FAIL"
                  }
                  icon={Bot}
                  accent={data.ai.gemini.reachable}
                />
                <KpiCard
                  label="Credits 7 วัน"
                  value={fmtNum(data.ai.summary.creditsDebited7d)}
                  icon={Bot}
                />
                <KpiCard
                  label="ประมาณ THB 7 วัน"
                  value={`฿${data.ai.summary.estCostThb7d.toFixed(2)}`}
                  icon={Bot}
                />
              </div>
            </section>

            <MonitoringChecklistSection health={data.health} />

            <CrossAppSmokeSection />

            <PlaybooksSection />
          </>
        ) : null}
      </main>
    </div>
  );
}
