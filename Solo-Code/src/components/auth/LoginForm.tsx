import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useAuthLockout } from "@/components/auth/authLockout";
import { cn } from "@/lib/utils";

export type SignInFn = (email: string, password: string) => Promise<{ error: Error | null }>;

export interface LoginFormProps {
  signIn: SignInFn;
  onSwitch?: () => void;
  onSuccess?: () => void;
  compact?: boolean;
  showRemember?: boolean;
  showForgot?: boolean;
  showSignupLink?: boolean;
  idPrefix?: string;
  className?: string;
}

export function LoginForm({
  signIn,
  onSwitch,
  onSuccess,
  compact = false,
  showRemember = true,
  showForgot = true,
  showSignupLink = true,
  idPrefix = "login",
  className,
}: LoginFormProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const lockout = useAuthLockout();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockout.isLocked) return;
    setBusy(true);
    setErrMsg(null);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      lockout.recordFail();
      setErrMsg(
        error.message.toLowerCase().includes("invalid")
          ? "อ๊ะ! รหัสผ่านไม่ถูกต้อง รบกวนเช็กอีกทีนะครับ"
          : error.message,
      );
      setShake(true);
      setTimeout(() => setShake(false), 450);
    } else {
      lockout.reset();
      if (!remember) sessionStorage.setItem("so1o_no_persist", "1");
      toast.success("ยินดีต้อนรับกลับมา!");
      onSuccess?.();
    }
  }

  const emailId = `${idPrefix}-email`;
  const passId = `${idPrefix}-pass`;

  return (
    <form
      onSubmit={onSubmit}
      className={cn("space-y-4", shake && "animate-input-shake", className)}
    >
      <div className="space-y-1.5">
        <Label htmlFor={emailId} className="text-xs">
          อีเมล
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id={emailId}
            data-testid="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn("pl-9 rounded-lg input-so1o", compact ? "h-10" : "h-11")}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={passId} className="text-xs">
          รหัสผ่าน
        </Label>
        <PasswordInput
          id={passId}
          data-testid="login-password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!errMsg}
          className={compact ? "h-10" : undefined}
          required
        />
      </div>

      {errMsg && <p className="text-xs text-destructive">{errMsg}</p>}

      {(showRemember || showForgot) && (
        <div className="flex items-center justify-between">
          {showRemember ? (
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
              จดจำฉันไว้
            </label>
          ) : (
            <span />
          )}
          {showForgot && (
            <Link
              to="/auth/forgot"
              search={{ redirect: undefined }}
              className="text-xs text-primary hover:underline"
            >
              ลืมรหัสผ่าน?
            </Link>
          )}
        </div>
      )}

      <Button
        type="submit"
        data-testid="login-submit"
        disabled={busy || lockout.isLocked}
        className={cn(
          "w-full bg-primary hover:bg-primary/90 rounded-lg font-medium",
          compact ? "h-10 text-sm" : "h-11 text-base",
        )}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {lockout.isLocked ? `ลองใหม่ใน ${lockout.remaining} วินาที` : "เข้าสู่ระบบ"}
      </Button>

      {showSignupLink && onSwitch && (
        <p className="text-center text-xs text-muted-foreground">
          ยังไม่มีบัญชี?{" "}
          <button
            type="button"
            onClick={onSwitch}
            className="text-primary hover:underline font-medium"
          >
            สมัครสมาชิกที่นี่
          </button>
        </p>
      )}
    </form>
  );
}
