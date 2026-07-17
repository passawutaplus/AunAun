import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import { satangToThb } from "@/lib/payments/fees";

type Props = {
  jobPriceSatang: number;
  buyerPaysSatang: number;
  platformFeePercent: number;
  cardSurchargeSatang?: number;
  methodLabel: string;
  quoteLabel?: string | null;
  className?: string;
};

/** Checkout summary — shows payable THB (+ optional FX label). Avoids escrow/e-wallet wording. */
export default function HireCheckoutSummary({
  jobPriceSatang,
  buyerPaysSatang,
  platformFeePercent,
  cardSurchargeSatang = 0,
  methodLabel,
  quoteLabel,
  className,
}: Props) {
  return (
    <div className={className ?? "space-y-2 text-sm"}>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">ราคางาน</span>
        <span>{formatMoneyLabel(satangToThb(jobPriceSatang), "THB")}</span>
      </div>
      <div className="flex justify-between gap-4 text-muted-foreground">
        <span>ค่าธรรมเนียมแพลตฟอร์ม ({platformFeePercent}%)</span>
        <span>หักจากฝั่งผู้รับงาน</span>
      </div>
      {cardSurchargeSatang > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">ค่าดำเนินการบัตร</span>
          <span>{formatMoneyLabel(satangToThb(cardSurchargeSatang), "THB")}</span>
        </div>
      )}
      <div className="flex justify-between gap-4 font-medium border-t border-border pt-2">
        <span>ยอดชำระ</span>
        <span className="text-right">
          {formatMoneyLabel(satangToThb(buyerPaysSatang), "THB")}
          {quoteLabel ? (
            <span className="block text-xs font-normal text-muted-foreground">≈ {quoteLabel}</span>
          ) : null}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">วิธีจ่าย: {methodLabel}</p>
      <p className="text-xs text-muted-foreground">
        เงินจะโอนให้ผู้รับงานหลังคุณอนุมัติงาน (หรือครบเวลาอนุมัติอัตโนมัติ) — Aplus1 คุ้มครองตามเงื่อนไขแพลตฟอร์ม
      </p>
    </div>
  );
}
