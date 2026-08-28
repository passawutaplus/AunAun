import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { passwordChangeFormError } from "@/lib/passwordChange";
import { userHasEmailPassword, verifyUserPassword } from "@/lib/sensitiveActionAuth";
import { buildEmailConfirmUrl, buildResetPasswordUrl } from "@/lib/oauthRedirect";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-xl pr-10 bg-background/60 border-border/60"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function authMethodLabel(user: User, hasPassword: boolean): string {
  const usesGoogle = user.identities?.some((i) => i.provider === "google") ?? false;
  if (usesGoogle && !hasPassword) return "เข้าสู่ระบบด้วย Google";
  if (usesGoogle && hasPassword) return "Google และรหัสผ่าน";
  return "อีเมลและรหัสผ่าน";
}

export function ChangePasswordSection({ user }: { user: User }) {
  const email = user.email?.trim() ?? "";
  const verified = !!user.email_confirmed_at;
  const hasPassword = userHasEmailPassword(user);

  const [verifyBusy, setVerifyBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  const sendVerificationEmail = async () => {
    if (!email) {
      toast.error("บัญชีนี้ไม่มีอีเมล");
      return;
    }
    setVerifyBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: buildEmailConfirmUrl() },
      });
      if (error) toast.error(error.message);
      else toast.success("ส่งอีเมลยืนยันตัวตนแล้ว — ตรวจกล่องจดหมายของคุณ");
    } finally {
      setVerifyBusy(false);
    }
  };

  const sendPasswordResetEmail = async () => {
    if (!email) {
      toast.error("บัญชีนี้ไม่มีอีเมล");
      return;
    }
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildResetPasswordUrl(),
      });
      if (error) toast.error(error.message);
      else {
        toast.success(
          hasPassword ? "ส่งลิงก์เปลี่ยนรหัสผ่านแล้ว" : "ส่งลิงก์ตั้งรหัสผ่านแล้ว",
          { description: email },
        );
      }
    } finally {
      setResetBusy(false);
    }
  };

  const submitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const formError = passwordChangeFormError({
      current,
      next,
      confirm,
      needsCurrent: true,
    });
    if (formError) {
      toast.error(formError);
      return;
    }
    setSaveBusy(true);
    try {
      await verifyUserPassword(email, current);
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) toast.error(error.message);
      else {
        toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
        setCurrent("");
        setNext("");
        setConfirm("");
        setShowPasswordForm(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "รหัสผ่านปัจจุบันไม่ถูกต้อง");
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <section id="settings-password" className="scroll-mt-24 rounded-2xl glass-panel p-6 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">รหัสผ่านเข้าสู่ระบบ</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        ใช้เข้าแอป — ไม่ใช่ PIN ถอนเงิน
      </p>

      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 space-y-2">
        <p className="text-sm text-foreground">
          อีเมลบัญชี: <span className="font-medium">{email || "—"}</span>
        </p>
        <p className="text-xs text-muted-foreground">{authMethodLabel(user, hasPassword)}</p>
        <div className="flex items-center gap-2 text-xs">
          {verified ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300">ยืนยันตัวตนทางอีเมลแล้ว</span>
            </>
          ) : (
            <>
              <MailCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-700 dark:text-amber-300">ยังไม่ได้ยืนยันอีเมล</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={!email || verified || verifyBusy}
          onClick={() => void sendVerificationEmail()}
        >
          {verifyBusy ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ShieldCheck className="h-4 w-4 mr-2" />
          )}
          {verified ? "ยืนยันตัวตนแล้ว" : "ส่งอีเมลยืนยันตัวตน"}
        </Button>

        {hasPassword ? (
          <Button
            type="button"
            variant={showPasswordForm ? "secondary" : "default"}
            size="sm"
            className="rounded-full"
            disabled={!email}
            onClick={() => setShowPasswordForm((open) => !open)}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            {showPasswordForm ? "ปิดฟอร์ม" : "ขอเปลี่ยนรหัสผ่าน"}
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={!email || resetBusy}
          onClick={() => void sendPasswordResetEmail()}
        >
          {resetBusy ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <MailCheck className="h-4 w-4 mr-2" />
          )}
          {hasPassword ? "ลืมรหัสผ่าน" : "ตั้งรหัสผ่านผ่านอีเมล"}
        </Button>
      </div>

      {!verified && (
        <p className="text-xs text-muted-foreground">
          กด <strong>ส่งอีเมลยืนยันตัวตน</strong> แล้วเปิดลิงก์ในอีเมลเพื่อยืนยันบัญชี
        </p>
      )}

      {showPasswordForm && hasPassword && (
        <form onSubmit={submitPasswordChange} className="space-y-3 max-w-md border-t border-border/40 pt-4">
          <PasswordField
            id="settings-current-pass"
            label="รหัสผ่านปัจจุบัน"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />
          <PasswordField
            id="settings-new-pass"
            label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
          />
          <PasswordField
            id="settings-confirm-pass"
            label="ยืนยันรหัสผ่านใหม่"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button type="submit" disabled={saveBusy} size="sm" className="rounded-full">
              {saveBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              บันทึกรหัสผ่านใหม่
            </Button>
            <p className="text-xs text-muted-foreground">
              จำรหัสเดิมไม่ได้? กด <strong>ลืมรหัสผ่าน</strong> ด้านบน
            </p>
          </div>
        </form>
      )}

      {!hasPassword && (
        <p className="text-xs text-muted-foreground">
          ยังไม่มีรหัสผ่านในระบบ — กด <strong>ตั้งรหัสผ่านผ่านอีเมล</strong> แล้วเปิดลิงก์ที่ส่งไป
        </p>
      )}
    </section>
  );
}
