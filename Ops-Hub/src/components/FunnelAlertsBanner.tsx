import { AlertTriangle } from "lucide-react";
import { getFunnelAlerts, type FunnelAlert } from "@/lib/funnel-alerts";
import type { EcosystemFunnelData } from "@/hooks/useEcosystemFunnel";

function AlertCard({ alert }: { alert: FunnelAlert }) {
  const style =
    alert.severity === "high"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${style}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">{alert.title}</p>
          <p className="mt-0.5 text-xs opacity-80">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

export function FunnelAlertsBanner({ funnel }: { funnel: EcosystemFunnelData | undefined }) {
  const alerts = getFunnelAlerts(funnel);
  if (alerts.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-ink">แจ้งเตือน Flywheel</h2>
      <div className="grid gap-2 md:grid-cols-2">
        {alerts.map((a) => (
          <AlertCard key={a.id} alert={a} />
        ))}
      </div>
    </section>
  );
}
