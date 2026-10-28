import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { suggestEmailFix } from "@/lib/emailTypos";
import { userFacingError } from "@/lib/userFacingError";

const RESEND_COOLDOWN_S = 60;
const CODE_LENGTH = 6;

/** "Did you mean …?" nudge under the email field for common domain typos. */
export function EmailTypoHint({ email, onApply }: { email: string; onApply: (fixed: string) => void }) {
  const fix = suggestEmailFix(email);
  if (!fix) return null;
  return (
    <p className="text-xs text-muted-foreground">
      หมายถึง{" "}
      <button type="button" onClick={() => onApply(fix)} className="font-medium text-foreground underline underline-offset-2">
        {fix}
      </button>{" "}
      ใช่ไหม?
    </p>
  );
}

type Props = {
  email: string;
  /** True while the signup request (and the email send) is still in flight. */
  sending?: boolean;
  onChangeEmail: () => void;
  inputClassName?: string;
  buttonClassName?: string;
};

/**
 * Step shown right after signup: the user types the code from the email, so nothing opens in
 * another browser (the WebView app keeps its own session). Typos surface naturally — the
 * address they typed is shown and can be edited.
 */
export function SignupVerifyCode({ email, sending = false, onChangeEmail, inputClassName, buttonClassName }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const lastTried = useRef("");

  // The resend countdown starts once the first email has actually gone out.
  useEffect(() => {
    if (!sending) setCooldown(RESEND_COOLDOWN_S);
  }, [sending]);

  useEffect(() => {
    if (sending || cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown, sending]);

  const verify = async (token: string) => {
    if (busy || sending || token.length < CODE_LENGTH) return;
    lastTried.current = token;
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
      if (error) {
        toast.error(userFacingError(error, "รหัสไม่ถูกต้องหรือหมดอายุ ตรวจสอบรหัสในอีเมลหรือกดส่งรหัสอีกครั้ง"));
        return;
      }
      toast.success("ยืนยันอีเมลแล้ว ยินดีต้อนรับสู่ SAMECOR");
    } finally {
      setBusy(false);
    }
  };

  const onCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setCode(digits);
    if (digits.length === CODE_LENGTH && digits !== lastTried.current) void verify(digits);
  };

  const resend = async () => {
    if (cooldown > 0) return;
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      toast.error(userFacingError(error, "ส่งรหัสไม่สำเร็จ ลองใหม่อีกครั้ง"));
      return;
    }
    lastTried.current = "";
    setCooldown(RESEND_COOLDOWN_S);
    toast.success("ส่งรหัสใหม่แล้ว");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void verify(code);
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-base font-medium">
          {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {sending ? "กำลังส่งรหัสไปที่อีเมลของคุณ…" : "ส่งรหัสไปที่อีเมลของคุณแล้ว"}
        </p>
        <p className="break-all text-sm text-muted-foreground">{email}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-code" className="text-xs">รหัส {CODE_LENGTH} หลักจากอีเมล</Label>
        <Input
          id="signup-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          placeholder="••••••"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          className={cn("text-center text-xl tracking-[0.4em]", inputClassName)}
          disabled={sending}
          autoFocus
        />
      </div>

      <Button type="submit" disabled={busy || sending || code.length < CODE_LENGTH} className={cn("w-full", buttonClassName)}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        ยืนยันและเริ่มใช้งาน
      </Button>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={resend}
          disabled={sending || cooldown > 0}
          className="font-medium text-foreground underline underline-offset-2 disabled:text-muted-foreground disabled:no-underline"
        >
          {sending || cooldown > 0 ? `ส่งรหัสอีกครั้งใน ${sending ? RESEND_COOLDOWN_S : cooldown} วินาที` : "ส่งรหัสอีกครั้ง"}
        </button>
        <button type="button" onClick={onChangeEmail} className="font-medium text-foreground underline underline-offset-2">
          แก้ไขอีเมล
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        ไม่เห็นอีเมล? ตรวจโฟลเดอร์สแปม หรือกด "แก้ไขอีเมล" หากพิมพ์ที่อยู่ผิด
      </p>
    </form>
  );
}
