import { CheckCircle2, XCircle } from "lucide-react";
import type { HealthProbeResult } from "@/lib/infra-monitor-types";

export function SiteHealthCards({ probes }: { probes: HealthProbeResult[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {probes.map((p) => (
        <div
          key={p.name}
          className={`rounded-xl border bg-white p-4 shadow-sm ${
            p.ok ? "border-emerald-200" : "border-red-200"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink">{p.name}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted">{p.url}</p>
            </div>
            {p.ok ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-red-600" />
            )}
          </div>
          <div className="mt-3 flex gap-3 text-xs text-muted">
            <span>
              HTTP <strong className="text-ink">{p.status || "—"}</strong>
            </span>
            <span>
              {p.latencyMs}ms
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
