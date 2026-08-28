import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WithdrawPinPad } from "@/components/earnings/WithdrawPinPad";
import {
  lockRetryLabel,
  normalizeWithdrawPin,
  saveWithdrawPin,
  verifyWithdrawPin,
  WITHDRAW_PIN_LENGTH,
  withdrawPinFormatError,
} from "@/lib/payments/withdrawPin";

export type WithdrawPinEditorMode = "setup" | "change" | "recover";

type Step = "current" | "create" | "confirm";

type Props = {
  open: boolean;
  mode: WithdrawPinEditorMode;
  ownerKey: string;
  onClose: () => void;
  onSaved: () => void;
};

function startStep(mode: WithdrawPinEditorMode): Step {
  return mode === "change" ? "current" : "create";
}

function titleFor(mode: WithdrawPinEditorMode, step: Step): string {
  if (step === "current") return "ใส่ PIN เดิม";
  if (step === "create") {
    if (mode === "change") return "ตั้ง PIN ใหม่";
    if (mode === "recover") return "ตั้ง PIN ใหม่";
    return "ตั้ง PIN 6 ตัว";
  }
  return "ใส่ PIN อีกครั้ง";
}

function descriptionFor(mode: WithdrawPinEditorMode, step: Step): string {
  if (step === "current") return "ยืนยัน PIN ที่ใช้ถอนเงินอยู่ตอนนี้";
  if (step === "create") {
    if (mode === "recover") return "หลังยืนยันบัญชีแล้ว ตั้งชุดใหม่สำหรับตอนถอนเงิน";
    return "ใช้ยืนยันทุกครั้งที่ถอนเงินเข้าบัญชี — อย่าบอกใคร";
  }
  return "ใส่ชุดเดิมเพื่อยืนยันว่าจำได้";
}

/** Set, change, or replace withdraw PIN after account verification. */
export function WithdrawPinEditorDialog({ open, mode, ownerKey, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>(startStep(mode));
  const [current, setCurrent] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(startStep(mode));
    setCurrent("");
    setFirst("");
    setSecond("");
    setError(null);
    setPending(false);
  }, [open, mode]);

  const active = step === "current" ? current : step === "create" ? first : second;

  const setActive = (value: string) => {
    const next = normalizeWithdrawPin(value);
    if (step === "current") setCurrent(next);
    else if (step === "create") setFirst(next);
    else setSecond(next);
    setError(null);
  };

  const close = () => {
    setError(null);
    onClose();
  };

  const submit = async () => {
    const pin = normalizeWithdrawPin(active);
    if (pin.length !== WITHDRAW_PIN_LENGTH) {
      setError("ใส่ PIN 6 ตัว");
      return;
    }

    if (step === "current") {
      setPending(true);
      setError(null);
      try {
        const result = await verifyWithdrawPin(ownerKey, pin);
        if (!result.ok) {
          if (result.reason === "locked") {
            setError(`ลองผิดหลายครั้ง — ${lockRetryLabel(result.retryAt)}`);
          } else if (result.reason === "mismatch") {
            setError(`PIN ไม่ถูกต้อง · เหลือ ${result.remaining} ครั้ง`);
            setCurrent("");
          } else {
            setError("ยังไม่ได้ตั้ง PIN");
          }
          return;
        }
        setStep("create");
        setFirst("");
        setSecond("");
      } finally {
        setPending(false);
      }
      return;
    }

    if (step === "create") {
      const formatError = withdrawPinFormatError(pin);
      if (formatError) {
        setError(formatError);
        return;
      }
      setFirst(pin);
      setSecond("");
      setStep("confirm");
      setError(null);
      return;
    }

    if (pin !== first) {
      setError("PIN ไม่ตรงกัน — ใส่ใหม่อีกครั้ง");
      setSecond("");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await saveWithdrawPin(ownerKey, pin);
      toast.success(mode === "change" ? "เปลี่ยน PIN แล้ว" : "ตั้ง PIN แล้ว");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึก PIN ไม่สำเร็จ");
    } finally {
      setPending(false);
    }
  };

  const back = () => {
    if (step === "confirm") {
      setStep("create");
      setSecond("");
      setError(null);
      return;
    }
    if (step === "create" && mode === "change") {
      setStep("current");
      setFirst("");
      setError(null);
      return;
    }
    close();
  };

  const primaryLabel =
    step === "confirm" ? "บันทึก PIN" : step === "current" ? "ถัดไป" : "ถัดไป";
  const secondaryLabel = step === "current" || (step === "create" && mode !== "change") ? "ยกเลิก" : "กลับ";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{titleFor(mode, step)}</DialogTitle>
          <DialogDescription className="text-left">{descriptionFor(mode, step)}</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <WithdrawPinPad
            id={`settings-pin-${mode}-${step}`}
            value={active}
            onChange={setActive}
            disabled={pending}
            autoFocus
          />
          {error ? (
            <p className="mt-3 text-center text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : step === "create" ? (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              อย่าใช้ 123456 หรือตัวเลขซ้ำทั้ง 6 ตัว
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={back} disabled={pending}>
            {secondaryLabel}
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={pending || active.length !== WITHDRAW_PIN_LENGTH}
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
