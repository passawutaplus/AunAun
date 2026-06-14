import { Link } from "react-router-dom";
import { Activity, AlertTriangle, ChevronRight } from "lucide-react";
import { useInfraMonitor } from "@/hooks/useInfraMonitor";
import { VERDICT_LABEL, VERDICT_STYLE } from "@/lib/infra-monitor-types";

export function InfraSummaryStrip() {
  const { data, isLoading, isError } = useInfraMonitor();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface/30 px-4 py-3 text-xs text-muted">
        กำลังโหลดสถานะ infra...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        โหลด infra monitor ไม่ได้ — deploy <code>ops-infra-monitor</code> หรือ{" "}
        <Link to="/monitor" className="underline">
          เปิดหน้ามอนิเตอร์
        </Link>
      </div>
    );
  }

  const sitesOk = data.health.filter((h) => h.name !== "Supabase REST").every((h) => h.ok);
  const supaPlan = data.supabase.platform.organization?.planLabel ?? "?";
  const dbPct = data.supabase.platform.database?.percentOfLimit;
  const verdict = data.overall_verdict;
  const needsAttention = verdict !== "ok";

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        needsAttention ? VERDICT_STYLE[verdict] : "border-border bg-surface/30"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="font-medium">Infra</span>
          </div>
          <div className="flex items-center gap-1.5">
            {data.health
              .filter((h) => !h.name.includes("Supabase"))
              .map((h) => (
                <span
                  key={h.name}
                  title={`${h.name}: ${h.ok ? "OK" : "FAIL"} (${h.latencyMs}ms)`}
                  className={`h-2.5 w-2.5 rounded-full ${h.ok ? "bg-emerald-500" : "bg-red-500"}`}
                />
              ))}
            <span className="ml-1 text-xs text-muted">{sitesOk ? "เว็บ OK" : "มีเว็บล่ม"}</span>
          </div>
          <span className="text-xs">
            Supabase <strong>{supaPlan}</strong>
            {dbPct != null ? ` · DB ${dbPct.toFixed(0)}%` : null}
          </span>
          <span className="text-xs">
            Vercel{" "}
            <strong>
              {data.vercel.configured
                ? data.vercel.upgrade_advice.currentPlan
                : "—"}
            </strong>
          </span>
          {needsAttention ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              {VERDICT_LABEL[verdict]}
            </span>
          ) : null}
        </div>
        <Link
          to="/monitor"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          ดูรายละเอียด
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
