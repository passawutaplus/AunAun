import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { useEcosystemFunnel } from "@/hooks/useEcosystemFunnel";
import { computeFlywheelHealthScore } from "@/lib/funnel-alerts";
import { conversionRate } from "@/lib/connection-flows";

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

function scoreRing(score: number) {
  if (score >= 70) return "border-emerald-200 bg-emerald-50";
  if (score >= 40) return "border-amber-200 bg-amber-50";
  return "border-red-200 bg-red-50";
}

export function FlywheelHealthScore() {
  const { data, isLoading, isError } = useEcosystemFunnel(7);
  const score = computeFlywheelHealthScore(data);
  const rate =
    data && data.totals.clicks_7d > 0
      ? conversionRate(data.totals.clicks_7d, data.totals.converted_7d)
      : 0;

  if (isError) return null;

  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 ${scoreRing(score ?? 0)}`}
          >
            {isLoading ? (
              <span className="text-xs text-muted">…</span>
            ) : (
              <>
                <span className={`text-xl font-bold tabular-nums ${scoreColor(score ?? 0)}`}>
                  {score ?? "—"}
                </span>
                <span className="text-[9px] text-muted">/100</span>
              </>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-semibold">Flywheel Health</h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              Conversion 7d: {rate}% · ค้าง {data?.totals.stuck_48h ?? 0} รายการ
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to="/connections" className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface">
            Connections
          </Link>
          <Link to="/users" className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface">
            User 360
          </Link>
          <Link to="/radar" className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface">
            Radar
          </Link>
          <Link to="/monitor" className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface">
            Monitor
          </Link>
        </div>
      </div>
    </section>
  );
}
