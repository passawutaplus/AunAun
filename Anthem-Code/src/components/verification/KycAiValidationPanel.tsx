import { CheckCircle2, Loader2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import type { KycQualityResult } from "@/lib/kycImageQuality";
import { cn } from "@/lib/utils";

type Props = {
  status: "idle" | "running" | "done" | "failed";
  result?: KycQualityResult | null;
  className?: string;
  /** Keep the grid column even before this slot has a result. */
  keepSlot?: boolean;
};

export function KycAiValidationPanel({ status, result, className, keepSlot }: Props) {
  if (status === "idle") {
    return keepSlot ? <div className="hidden sm:block" aria-hidden /> : null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 space-y-2",
        status === "failed"
          ? "border-destructive/40 bg-destructive/5"
          : status === "done"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-primary/30 bg-primary/5",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {status === "running" ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : status === "done" ? (
          <Sparkles className="w-4 h-4 text-emerald-600" />
        ) : (
          <RefreshCw className="w-4 h-4 text-destructive" />
        )}
        <span className="leading-snug">
          {status === "running"
            ? "กำลังเช็กความถูกต้อง…"
            : status === "done"
              ? "ระบบช่วยเช็คความถูกต้อง · ผ่าน"
              : "ระบบช่วยเช็คความถูกต้อง · ไม่ผ่าน"}
        </span>
      </div>

      {result?.checks?.length ? (
        <ul className="space-y-1">
          {result.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              {c.pass ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              )}
              <span className={cn(c.pass ? "text-muted-foreground" : "text-destructive")}>
                {c.label}
                {c.detail && !c.pass ? ` — ${c.detail}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {status === "failed" && (
        <p className="text-sm font-medium text-destructive pt-1">กรุณาถ่ายใหม่</p>
      )}
    </div>
  );
}

export default KycAiValidationPanel;
