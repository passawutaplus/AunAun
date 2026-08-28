import { Banknote, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import { satangToThb } from "@/lib/payments/fees";
import { cn } from "@/lib/utils";

type Props = {
  availableSatang: number;
  onWithdraw: () => void;
  canWithdraw: boolean;
  withdrawHint?: string;
  isPreview?: boolean;
  onResetPreview?: () => void;
  bankName?: string;
  accountLast4?: string;
  /** Tighter height for a dashboard column. */
  compact?: boolean;
};

function withdrawDestinationLabel(bankName?: string, accountLast4?: string) {
  const name = bankName?.trim();
  const last4 = accountLast4?.trim();
  if (name && last4) return `ถอนเข้า ${name} •••• ${last4}`;
  if (name) return `ถอนเข้า ${name}`;
  return "ถอนเข้าบัญชีธนาคาร";
}

/** Available hire THB still in the wallet — primary withdraw CTA. */
export function EarningsHireBalanceCard({
  availableSatang,
  onWithdraw,
  canWithdraw,
  withdrawHint,
  isPreview = false,
  onResetPreview,
  bankName,
  accountLast4,
  compact = false,
}: Props) {
  const destination = withdrawDestinationLabel(bankName, accountLast4);

  return (
    <section
      data-testid="hire-wallet-card"
      className="overflow-hidden rounded-[1.75rem] border border-primary/15 bg-white shadow-[0_12px_32px_-20px_rgb(16_16_16_/_0.35)]"
    >
      <div className={cn("px-5", compact ? "pb-3 pt-4" : "pb-4 pt-5")}>
        <p
          className={cn(
            "inline-flex items-center gap-2 font-semibold tracking-tight text-zinc-950",
            compact ? "text-base" : "text-lg sm:text-xl",
          )}
        >
          <Wallet className={cn("shrink-0 text-zinc-500", compact ? "h-4 w-4" : "h-5 w-5")} aria-hidden />
          กระเป๋า
        </p>
        <p className="mt-0.5 truncate text-sm text-zinc-500">{destination}</p>
      </div>

      <div
        className={cn(
          "hire-wallet-mesh rounded-t-[1.35rem] px-5 pb-5 pt-5",
          compact ? "min-h-[8rem]" : "min-h-[10.5rem] sm:min-h-[11.5rem]",
        )}
      >
        <div
          className={cn(
            "relative z-[1] flex flex-col justify-end",
            compact ? "min-h-[6.5rem]" : "min-h-[8.5rem] sm:min-h-[9.5rem]",
          )}
        >
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  "font-semibold tabular-nums tracking-tight text-white [text-shadow:0_1px_2px_hsl(12_80%_18%/0.28),0_8px_24px_hsl(12_80%_18%/0.18)]",
                  compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl",
                )}
              >
                {formatMoneyLabel(satangToThb(availableSatang), "THB")}
              </p>
              <p className="mt-1 text-sm text-zinc-600">ยอดในกระเป๋า</p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={onWithdraw}
              disabled={!canWithdraw}
              title={!canWithdraw ? withdrawHint : "ถอนเงิน"}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 shadow-none ring-offset-0",
                canWithdraw
                  ? "border-transparent bg-[linear-gradient(180deg,hsl(22_100%_58%)_0%,hsl(18_100%_46%)_100%)] text-white hover:brightness-110 hover:bg-[linear-gradient(180deg,hsl(22_100%_58%)_0%,hsl(18_100%_46%)_100%)]"
                  : "border-zinc-200 bg-zinc-100 text-zinc-400 hover:bg-zinc-100",
              )}
            >
              <Banknote className="h-4 w-4" />
              ถอนเงิน
            </Button>
          </div>
          {isPreview ? (
            <p className="mt-2 text-[11px] text-amber-800">
              ข้อมูลตัวอย่าง — กดถอนได้เพื่อทดลอง ไม่โอนเข้าบัญชีจริง
              {onResetPreview ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="underline decoration-amber-800/50 underline-offset-2 hover:text-zinc-950 hover:no-underline"
                    onClick={onResetPreview}
                  >
                    รีเซ็ตตัวอย่าง
                  </button>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
