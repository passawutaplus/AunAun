import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ConnectionFlowCard } from "@/components/ConnectionFlowCard";
import { FlywheelStrip } from "@/components/FlywheelStrip";
import { FunnelAlertsBanner } from "@/components/FunnelAlertsBanner";
import { CONNECTION_FLOWS } from "@/lib/connection-flows";
import { useEcosystemFunnel, useSsoMetrics } from "@/hooks/useEcosystemFunnel";
import { NAV_LABELS } from "@/lib/labels-th";

export default function ConnectionsPage() {
  const [days, setDays] = useState<7 | 30>(7);
  const { data, isLoading, isError, error, refetch, isFetching } = useEcosystemFunnel(days);
  const sso = useSsoMetrics();

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title={NAV_LABELS.connections}
        subtitle="ศูนย์เชื่อม So1o ↔ an1hem — flywheel, conversion และ SSO baseline"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as 7 | 30)}
              className="rounded-lg border border-border px-2 py-1.5 text-xs"
            >
              <option value={7}>7 วัน</option>
              <option value={30}>30 วัน</option>
            </select>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-border p-2 text-muted hover:text-ink"
              title="รีเฟรช"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      <main className="space-y-8 p-6">
        <div className="rounded-xl border border-border bg-surface/40 px-4 py-3 text-sm leading-relaxed text-muted">
          <strong className="text-ink">หน้านี้ดูอะไร?</strong>{" "}
          ติดตามว่าผู้ใช้ไหลระหว่าง So1o กับ an1hem จริงไหม จาก{" "}
          <code className="text-[10px]">ecosystem_links</code> — click, convert, stuck
        </div>

        <FlywheelStrip />

        <FunnelAlertsBanner funnel={data} />

        {isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error instanceof Error ? error.message : "โหลดไม่สำเร็จ"}
          </div>
        ) : null}

        <section>
          <h2 className="mb-3 text-sm font-semibold">Flywheel flows ({days} วัน)</h2>
          {isLoading ? (
            <p className="text-sm text-muted">กำลังโหลด...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(data?.flows ?? []).map((flow) => (
                <ConnectionFlowCard key={flow.id} flow={flow} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Connection map</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CONNECTION_FLOWS.map((f) => (
              <div key={f.id} className="rounded-xl border border-border bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{f.label}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      f.status === "live"
                        ? "bg-emerald-50 text-emerald-700"
                        : f.status === "partial"
                          ? "bg-amber-50 text-amber-800"
                          : "bg-surface text-muted"
                    }`}
                  >
                    {f.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">SSO & dual-app users</h2>
          {sso.isLoading ? (
            <p className="text-sm text-muted">กำลังโหลด...</p>
          ) : sso.data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-surface/50 px-3 py-2">
                <p className="text-[10px] text-muted">ใช้ทั้ง 2 แอป</p>
                <p className="text-2xl font-bold tabular-nums">{sso.data.dual_app_users}</p>
              </div>
              <div className="rounded-lg bg-surface/50 px-3 py-2">
                <p className="text-[10px] text-muted">Pro + ทั้ง 2 แอป</p>
                <p className="text-2xl font-bold tabular-nums">{sso.data.pro_dual_app_users}</p>
              </div>
              <div className="rounded-lg bg-surface/50 px-3 py-2">
                <p className="text-[10px] text-muted">an1hem อย่างเดียว</p>
                <p className="text-2xl font-bold tabular-nums">{sso.data.anthem_only_users}</p>
              </div>
              <div className="rounded-lg bg-surface/50 px-3 py-2">
                <p className="text-[10px] text-muted">So1o อย่างเดียว</p>
                <p className="text-2xl font-bold tabular-nums">{sso.data.so1o_only_users}</p>
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-muted">
            SSO status: <strong>{sso.data?.sso_status ?? "—"}</strong> — {sso.data?.note}
          </p>
          <p className="mt-1 text-[10px] text-muted">
            SSO ข้ามโดเมนยังอยู่ใน roadmap deferred — ตอนนี้ใช้ unified profiles บน Supabase เดียวกัน
          </p>
        </section>
      </main>
    </div>
  );
}
