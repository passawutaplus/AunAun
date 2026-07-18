import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatOfferAmount } from "@/lib/chatOffer";
import { satangToThb } from "@/lib/payments/fees";

type Props = {
  amountSatang: number;
  reference: string;
  /** Seconds before auto-close. Set 0 to disable. */
  autoCloseSeconds?: number;
  onDone: () => void;
};

export default function HirePaySuccessView({
  amountSatang,
  reference,
  autoCloseSeconds = 5,
  onDone,
}: Props) {
  const [remaining, setRemaining] = useState(autoCloseSeconds);

  useEffect(() => {
    if (autoCloseSeconds <= 0) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          onDone();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [autoCloseSeconds, onDone]);

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">ชำระเงินสำเร็จ!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          เงินถูกพักไว้กับ Aplus1 ในฐานะตัวกลาง และจะโอนให้ผู้รับงานหลังคุณอนุมัติงาน
        </p>
      </div>

      <div className="w-full space-y-1.5 rounded-xl border border-border bg-muted/20 p-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">ยอดที่ชำระ</span>
          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatOfferAmount(satangToThb(amountSatang))}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">รหัสชำระ</span>
          <span className="font-mono text-xs text-foreground">{reference}</span>
        </div>
      </div>

      <Button type="button" className="w-full rounded-full" onClick={onDone}>
        เสร็จสิ้น
        {autoCloseSeconds > 0 && remaining > 0 ? ` (${remaining})` : ""}
      </Button>
    </div>
  );
}
