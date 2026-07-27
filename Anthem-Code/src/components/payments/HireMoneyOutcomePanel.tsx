import { satangToThb } from "@/lib/payments/fees";
import type { HireMoneyOutcome } from "@/lib/payments/hireMoneyOutcome";
import { cn } from "@/lib/utils";

function thb(satang: number): string {
  const n = satangToThb(satang);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ฿`;
}

type Props = {
  outcome: HireMoneyOutcome;
  /** admin | legal — slight density differences */
  variant?: "admin" | "legal";
  className?: string;
};

/** Shared 4-party money outcome panel (admin finance + legal demos). */
export function HireMoneyOutcomePanel({ outcome, variant = "admin", className }: Props) {
  const rows = [
    { key: "buyer", title: "ผู้จ้าง", party: outcome.parties.buyer },
    { key: "seller", title: "ครีเอเตอร์", party: outcome.parties.seller },
    { key: "aplus1", title: "Aplus1", party: outcome.parties.aplus1 },
    { key: "payso", title: "Payso", party: outcome.parties.payso },
  ] as const;

  return (
    <div
      className={cn(
        "rounded-lg border space-y-3",
        variant === "admin"
          ? "border-admin-border bg-admin-hover/20 p-3"
          : "border-border/60 bg-muted/20 p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={cn("font-medium", variant === "admin" ? "text-xs" : "text-sm")}>
            {outcome.label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {outcome.outcome === "completed" ? "งานจบสำเร็จ" : "งานยกเลิก"}
            {outcome.cancelTerms ? ` · ${outcome.cancelTerms}` : ""}
            {" · "}
            {outcome.method}
          </p>
        </div>
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border",
            outcome.checks.balanced
              ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/40 text-destructive",
          )}
        >
          {outcome.checks.balanced ? "ตรวจสมดุลผ่าน" : "ตรวจสมดุลไม่ผ่าน"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map(({ key, title, party }) => (
          <div
            key={key}
            className={cn(
              "rounded-md border px-2.5 py-2 space-y-1",
              variant === "admin" ? "border-admin-border/80 bg-admin-surface/50" : "border-border/50 bg-background/50",
            )}
          >
            <p className="text-xs font-medium">{title}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{party.label}</p>
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                party.netSatang > 0 && "text-emerald-600 dark:text-emerald-400",
                party.netSatang < 0 && "text-destructive",
              )}
            >
              สุทธิ {thb(party.netSatang)}
            </p>
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              {party.paidSatang > 0 ? <p>จ่าย {thb(party.paidSatang).replace(/^\+/, "")}</p> : null}
              {party.refundedSatang > 0 ? <p>คืน {thb(party.refundedSatang).replace(/^\+/, "")}</p> : null}
              {party.receivedSatang > 0 ? <p>ได้รับ {thb(party.receivedSatang)}</p> : null}
              {party.feesSatang > 0 ? <p>ต้นทุน/ค่าธรรมเนียม {thb(-party.feesSatang)}</p> : null}
            </div>
          </div>
        ))}
      </div>

      {outcome.timeline.length > 0 ? (
        <ol className="space-y-1 border-t border-border/40 pt-2">
          {outcome.timeline.map((t) => (
            <li key={t.step} className="text-[11px] text-muted-foreground flex gap-2">
              <span className="font-medium text-foreground shrink-0">{t.step}</span>
              <span>{t.detail}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {outcome.checks.warnings.length > 0 ? (
        <ul className="space-y-0.5">
          {outcome.checks.warnings.map((w) => (
            <li key={w} className="text-[10px] text-amber-700 dark:text-amber-400">
              ⚠ {w}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
