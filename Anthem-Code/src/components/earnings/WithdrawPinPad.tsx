import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { WITHDRAW_PIN_LENGTH } from "@/lib/payments/withdrawPin";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

/** Six separate boxes for a withdraw PIN. */
export function WithdrawPinPad({ id, value, onChange, disabled, autoFocus }: Props) {
  return (
    <InputOTP
      id={id}
      maxLength={WITHDRAW_PIN_LENGTH}
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoFocus={autoFocus}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="off"
      containerClassName="justify-center gap-0"
    >
      <InputOTPGroup className="gap-2">
        {Array.from({ length: WITHDRAW_PIN_LENGTH }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            className={cn(
              "h-12 w-11 rounded-xl border border-input bg-background text-lg font-semibold tabular-nums",
              "first:rounded-xl first:border-l last:rounded-xl",
            )}
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
