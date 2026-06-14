import { CheckCircle2, Lightbulb, Loader2, Plus } from "lucide-react";
import type { TrackingFeature } from "@/lib/ecosystem-tracking";
import { percentBarColor, percentColor, statusLabel } from "@/lib/ecosystem-tracking";

const STATUS_BADGE: Record<TrackingFeature["status"], string> = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-800 border-amber-200",
  planned: "bg-surface text-muted border-border",
};

type Props = {
  feature: TrackingFeature;
  onCreate?: () => void;
  creating?: boolean;
};

export function TrackingFeatureCard({ feature, onCreate, creating }: Props) {
  const canCreate = feature.improve.length > 0 && onCreate;

  return (
    <article className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-ink">{feature.name}</h4>
          <p className="mt-1 text-sm leading-relaxed text-muted">{feature.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[feature.status]}`}
          >
            {statusLabel(feature.status)}
          </span>
          {canCreate ? (
            <button
              type="button"
              disabled={creating}
              onClick={onCreate}
              className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-brand/5 px-2 py-1 text-[10px] font-medium text-brand transition hover:bg-brand/10 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              สร้างงาน ({feature.improve.length})
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted">ความพร้อม</span>
          <span className={`font-bold tabular-nums ${percentColor(feature.percent)}`}>
            {feature.percent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div
            className={`h-full rounded-full transition-all ${percentBarColor(feature.percent)}`}
            style={{ width: `${feature.percent}%` }}
          />
        </div>
      </div>

      {feature.done.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> ทำแล้ว
          </p>
          <ul className="space-y-0.5 text-xs text-muted">
            {feature.done.map((item) => (
              <li key={item} className="flex gap-1.5">
                <span className="text-emerald-500">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {feature.improve.length > 0 ? (
        <div className="mt-3 rounded-lg bg-amber-50/60 px-3 py-2">
          <p className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-800">
            <Lightbulb className="h-3.5 w-3.5" /> พัฒนาเพิ่มได้
          </p>
          <ul className="space-y-0.5 text-xs text-amber-900/80">
            {feature.improve.map((item) => (
              <li key={item} className="flex gap-1.5">
                <span>→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
