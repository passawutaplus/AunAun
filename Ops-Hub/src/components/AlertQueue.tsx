import { AlertTriangle, ExternalLink } from "lucide-react";
import type { HubAlert } from "@/hooks/useHubMetrics";

export function AlertQueue({ alerts }: { alerts: HubAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white px-4 py-6 text-center text-sm text-muted">
        ไม่มีอะไรต้องดูแลด่วน — ทุกอย่างเรียบร้อย ✓
      </div>
    );
  }

  const total = alerts.reduce((s, a) => s + a.count, 0);

  return (
    <div className="rounded-xl border border-brand/25 bg-brand-soft/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold">ต้องจัดการด่วน ({total} รายการ)</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {alerts.map((a) => (
          <a
            key={a.id}
            href={a.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:shadow-md ${
              a.severity === "high"
                ? "border-red-200 bg-white text-red-800 hover:border-red-300"
                : "border-amber-200 bg-white text-amber-900 hover:border-amber-300"
            }`}
          >
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                a.app === "so1o" ? "bg-brand/15 text-brand" : "bg-an1hem/15 text-an1hem"
              }`}
            >
              {a.app === "so1o" ? "So1o" : "an1hem"}
            </span>
            <span>
              {a.label} <strong>{a.count}</strong>
            </span>
            <ExternalLink className="h-3.5 w-3.5 opacity-50" />
          </a>
        ))}
      </div>
    </div>
  );
}
