import type { FunnelFlow } from "@/hooks/useEcosystemFunnel";
import { conversionRate, flowHealth } from "@/lib/connection-flows";

const HEALTH_STYLE = {
  good: "border-emerald-200 bg-emerald-50/50",
  warn: "border-amber-200 bg-amber-50/50",
  bad: "border-red-200 bg-red-50/50",
};

export function ConnectionFlowCard({ flow }: { flow: FunnelFlow }) {
  const rate = conversionRate(flow.clicks, flow.converted);
  const health = flowHealth(flow.clicks, flow.converted, flow.stuck);

  return (
    <article className={`rounded-xl border p-4 shadow-sm ${HEALTH_STYLE[health]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{flow.label}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">{flow.direction}</p>
        </div>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold tabular-nums">
          {rate}% convert
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-white/70 px-2 py-1.5">
          <p className="text-muted">Clicks</p>
          <p className="text-lg font-bold tabular-nums">{flow.clicks}</p>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5">
          <p className="text-muted">Converted</p>
          <p className="text-lg font-bold tabular-nums text-emerald-700">{flow.converted}</p>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5">
          <p className="text-muted">Stuck</p>
          <p className="text-lg font-bold tabular-nums text-amber-800">{flow.stuck}</p>
        </div>
      </div>
    </article>
  );
}
