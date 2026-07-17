import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import { satangToThb } from "@/lib/payments/fees";
import { PAYOUT_MIN_SATANG } from "@/lib/payments/payoutPolicy";

type Props = {
  pendingSatang: number;
  availableSatang: number;
  payoutReservedSatang?: number;
  paidOutSatang?: number;
  className?: string;
};

export default function EarningsBalanceCards({
  pendingSatang,
  availableSatang,
  payoutReservedSatang = 0,
  paidOutSatang = 0,
  className,
}: Props) {
  const rows = [
    { label: "รอตรวจสอบ", satang: pendingSatang, hint: "หลังชำระ ก่อนอนุมัติงาน" },
    {
      label: "พร้อมถอน",
      satang: availableSatang,
      hint: `ขั้นต่ำ ${formatMoneyLabel(satangToThb(PAYOUT_MIN_SATANG), "THB")}`,
    },
    { label: "กำลังโอน", satang: payoutReservedSatang, hint: "รอบโอนที่คิวอยู่" },
    { label: "โอนแล้ว", satang: paidOutSatang, hint: "เข้าบัญชีที่ยืนยันแล้ว" },
  ];

  return (
    <div className={className ?? "grid grid-cols-2 gap-3 sm:grid-cols-4"}>
      {rows.map((r) => (
        <div key={r.label} className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">{r.label}</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatMoneyLabel(satangToThb(r.satang), "THB")}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{r.hint}</p>
        </div>
      ))}
    </div>
  );
}
