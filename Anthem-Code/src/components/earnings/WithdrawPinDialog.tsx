import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WithdrawPinPad } from "@/components/earnings/WithdrawPinPad";
import {
  lockRetryLabel,
  normalizeWithdrawPin,
  WITHDRAW_PIN_LENGTH,
  withdrawPinFormatError,
  type VerifyWithdrawPinResult,
} from "@/lib/payments/withdrawPin";

type Props = {
  open: boolean;
  mode: "setup" | "verify";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (pin: string) => Promise<VerifyWithdrawPinResult>;
  onForgotPin?: () => void;
};

/** Confirm withdraw with the 6-digit PIN, or set it the first time. */
export function WithdrawPinDialog({ open, mode, busy, onCancel, onConfirm, onForgotPin }: Props) {
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [first, setFirst] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("create");
    setFirst("");
    setPin("");
    setError(null);
    setPending(false);
  }, [open, mode]);

  const close = () => {
    setPin("");
    setFirst("");
    setStep("create");
    setError(null);
    onCancel();
  };

  const active = mode === "setup" && step === "create" ? first : pin;
  const waiting = pending || busy;
  const setup = mode === "setup";
  const needsNext = setup && step === "create";

  const submit = async () => {
    const next = normalizeWithdrawPin(active);
    if (next.length !== WITHDRAW_PIN_LENGTH) {
      setError("ใส่ PIN 6 ตัว");
      return;
    }
    if (needsNext) {
      const formatError = withdrawPinFormatError(next);
      if (formatError) {
        setError(formatError);
        return;
      }
      setFirst(next);
      setPin("");
      setStep("confirm");
      setError(null);
      return;
    }
    if (setup && next !== first) {
      setError("PIN ไม่ตรงกัน — ใส่ใหม่อีกครั้ง");
      setPin("");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await onConfirm(next);
      if (result.ok) {
        setPin("");
        setFirst("");
        return;
      }
      if (result.reason === "locked") {
        setError(`ลองผิดหลายครั้ง — ${lockRetryLabel(result.retryAt)}`);
      } else if (result.reason === "mismatch") {
        setError(`PIN ไม่ถูกต้อง · เหลือ ${result.remaining} ครั้ง`);
        setPin("");
      } else {
        setError("ยังไม่ได้ตั้ง PIN");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "ยืนยันไม่สำเร็จ");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {setup
              ? step === "create"
                ? "ตั้ง PIN 6 ตัว"
                : "ใส่ PIN อีกครั้ง"
              : "ใส่ PIN เพื่อถอนเงิน"}
          </DialogTitle>
          <DialogDescription className="text-left">
            {setup
              ? step === "create"
                ? "ใช้ยืนยันทุกครั้งที่ถอนเงินเข้าบัญชี — อย่าบอกใคร"
                : "ใส่ชุดเดิมเพื่อยืนยันว่าจำได้"
              : "ยืนยันด้วย PIN 6 ตัวที่ตั้งไว้"}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <WithdrawPinPad
            id={
              setup
                ? step === "create"
                  ? "withdraw-pin-create"
                  : "withdraw-pin-confirm"
                : "withdraw-pin-verify"
            }
            value={active}
            onChange={(value) => {
              const next = normalizeWithdrawPin(value);
              if (needsNext) setFirst(next);
              else setPin(next);
              setError(null);
            }}
            disabled={waiting}
            autoFocus
          />
          {error ? (
            <p className="mt-3 text-center text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : setup && step === "create" ? (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              อย่าใช้ 123456 หรือตัวเลขซ้ำทั้ง 6 ตัว
            </p>
          ) : null}
          {!setup && onForgotPin ? (
            <p className="mt-3 text-center">
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={onForgotPin}
                disabled={waiting}
              >
                ลืม PIN?
              </button>
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (setup && step === "confirm") {
                setStep("create");
                setPin("");
                setError(null);
                return;
              }
              close();
            }}
            disabled={waiting}
          >
            {setup && step === "confirm" ? "กลับ" : "ยกเลิก"}
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={waiting || active.length !== WITHDRAW_PIN_LENGTH}
          >
            {waiting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {needsNext ? "ถัดไป" : setup ? "บันทึกแล้วถอน" : "ยืนยัน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
