import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import type { UpgradeAdvice } from "@/lib/infra-monitor-types";
import { VERDICT_LABEL, VERDICT_STYLE } from "@/lib/infra-monitor-types";
import { getSupabaseProjectInfo, supabaseDashboardPath } from "@/lib/supabaseProject";

export function UpgradeAdviceBanner({ items }: { items: UpgradeAdvice[] }) {
  const worst = items.reduce<(typeof items)[0] | null>((acc, cur) => {
    const order = ["upgrade_required", "upgrade_recommended", "watch", "ok"];
    if (!acc) return cur;
    return order.indexOf(cur.verdict) < order.indexOf(acc.verdict) ? cur : acc;
  }, null);

  if (!worst || worst.verdict === "ok") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Infra usage ยังอยู่ในเกณฑ์ปกติ — ยังไม่จำเป็นต้องอัปเกรด Pro
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${VERDICT_STYLE[worst.verdict]}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-2">
          <p className="font-semibold">
            {VERDICT_LABEL[worst.verdict]} — ตรวจ {items.map((i) => i.service).join(" & ")}
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-xs leading-relaxed">
            {items.flatMap((item) =>
              item.reasons.map((r, i) => (
                <li key={`${item.service}-${i}`}>
                  <span className="font-medium capitalize">{item.service}:</span> {r}
                </li>
              )),
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function UpgradeAdviceCards({ items }: { items: UpgradeAdvice[] }) {
  const { projectRef } = getSupabaseProjectInfo();
  const supabaseBillingHref = supabaseDashboardPath(projectRef, "/settings/billing/usage");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.service}
          className={`rounded-xl border p-4 ${VERDICT_STYLE[item.verdict]}`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold capitalize">{item.service}</p>
            <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-medium">
              {item.currentPlan} · {VERDICT_LABEL[item.verdict]}
            </span>
          </div>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed">
            {item.reasons.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
          {item.thresholds.length > 0 ? (
            <div className="mt-3 space-y-2 border-t border-current/10 pt-2">
              {item.thresholds
                .filter((t) => t.percent > 0)
                .map((t) => (
                  <div key={t.metric} className="flex justify-between text-[10px] font-mono">
                    <span>{t.metric}</span>
                    <span>{t.percent.toFixed(0)}%</span>
                  </div>
                ))}
            </div>
          ) : null}
          {item.service === "supabase" ? (
            <a
              href={supabaseBillingHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs underline"
            >
              Supabase Billing <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <a
              href="https://vercel.com/account/usage"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs underline"
            >
              Vercel Usage <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
