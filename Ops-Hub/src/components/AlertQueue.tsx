import { AlertTriangle, ExternalLink } from "lucide-react";
import type { HubAlert } from "@/hooks/useHubMetrics";

const SEVERITY_STYLE: Record<
  HubAlert["severity"],
  { chip: string; badge: string }
> = {
  critical: {
    chip: "border-red-300 bg-red-50 text-red-950 hover:border-red-400 ring-1 ring-red-200/60",
    badge: "bg-red-600 text-white",
  },
  high: {
    chip: "border-red-200 bg-white text-red-800 hover:border-red-300",
    badge: "",
  },
  medium: {
    chip: "border-amber-200 bg-white text-amber-900 hover:border-amber-300",
    badge: "",
  },
};

export function AlertQueue({ alerts }: { alerts: HubAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white px-4 py-6 text-center text-sm text-muted">
        ไม่มีอะไรต้องดูแลด่วน — ทุกอย่างเรียบร้อย ✓
      </div>
    );
  }

  const total = alerts.reduce((s, a) => s + a.count, 0);
  const hasCritical = alerts.some((a) => a.severity === "critical");

  return (
    <div
      className={`rounded-xl border p-4 ${
        hasCritical ? "border-red-200 bg-red-50/40" : "border-brand/25 bg-brand-soft/50"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className={`h-4 w-4 ${hasCritical ? "text-red-600" : "text-brand"}`} />
        <h2 className="text-sm font-semibold">
          ต้องจัดการด่วน ({total} รายการ)
          {hasCritical ? (
            <span className="ml-2 text-xs font-normal text-red-700">มี AI flag ความเสี่ยงสูง</span>
          ) : null}
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {alerts.map((a) => {
          const style = SEVERITY_STYLE[a.severity];
          return (
            <a
              key={a.id}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:shadow-md ${style.chip}`}
            >
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  a.app === "so1o"
                    ? "bg-brand/15 text-brand"
                    : a.app === "an1hem"
                      ? "bg-an1hem/15 text-an1hem"
                      : "bg-ink/10 text-ink"
                } ${style.badge}`}
              >
                {a.app === "so1o" ? "So1o" : a.app === "an1hem" ? "an1hem" : "Eco"}
              </span>
              <span>
                {a.label} <strong>{a.count}</strong>
              </span>
              {a.hint ? (
                <span className="w-full text-xs opacity-80 sm:w-auto">{a.hint}</span>
              ) : null}
              <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
