import { CheckCircle2, Clock, Send, type LucideIcon } from "lucide-react";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import { satangToThb } from "@/lib/payments/fees";
import { cn } from "@/lib/utils";

type Props = {
  pendingSatang: number;
  /** Kept for ledger callers; hire-available is not shown on this row. */
  availableSatang?: number;
  payoutReservedSatang?: number;
  paidOutSatang?: number;
  className?: string;
};

type Row = {
  label: string;
  hint: string;
  satang: number;
  icon: LucideIcon;
  iconClass: string;
};

export default function EarningsBalanceCards({
  pendingSatang,
  payoutReservedSatang = 0,
  paidOutSatang = 0,
  className,
}: Props) {
  const rows: Row[] = [
    {
      label: "รอตรวจสอบ",
      hint: "ผู้จ้างจ่ายแล้ว รอรับงาน",
      satang: pendingSatang,
      icon: Clock,
      iconClass: "text-amber-700 dark:text-amber-400",
    },
    {
      label: "กำลังโอน",
      hint: "กำลังส่งเข้าบัญชี",
      satang: payoutReservedSatang,
      icon: Send,
      iconClass: "text-sky-700 dark:text-sky-400",
    },
    {
      label: "โอนแล้ว",
      hint: "เข้าบัญชีแล้ว",
      satang: paidOutSatang,
      icon: CheckCircle2,
      iconClass: "text-emerald-700 dark:text-emerald-400",
    },
  ];

  return (
    <div className={className ?? "grid grid-cols-1 gap-3 sm:grid-cols-3"}>
      {rows.map((r) => {
        const Icon = r.icon;
        return (
          <div key={r.label} className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-1.5">
              <Icon className={cn("h-3.5 w-3.5 shrink-0", r.iconClass)} aria-hidden />
              <p className="text-xs text-muted-foreground">{r.label}</p>
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatMoneyLabel(satangToThb(r.satang), "THB")}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">{r.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
