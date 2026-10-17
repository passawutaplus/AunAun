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

  const usesGoogle = user.identities?.some((i) => i.provider === "google") ?? false;

  return (
    <section id="settings-password" className="scroll-mt-24 rounded-2xl glass-panel p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-foreground">เข้าสู่ระบบ</h2>
      </div>

      <div className="divide-y divide-border/50 rounded-xl border border-border/60">
        <Row label="อีเมล" value={email || "—"}>
          {verified ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              ยืนยันแล้ว
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={!email || verifyBusy}
              onClick={() => void sendVerificationEmail()}
            >
              {verifyBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}
              ส่งอีเมลยืนยัน
            </Button>
          )}
        </Row>

        {usesGoogle ? (
          <Row label="Google" value="เข้าสู่ระบบด้วยบัญชี Google">
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              เชื่อมแล้ว
            </span>
          </Row>
        ) : null}

        <Row
          label="รหัสผ่าน"
          value={hasPassword ? "••••••••" : usesGoogle ? "ยังไม่ได้ตั้ง (ไม่บังคับ)" : "ยังไม่ได้ตั้ง"}
        >
          {hasPassword ? (
            <Button
              type="button"
              variant={showPasswordForm ? "secondary" : "outline"}
              size="sm"
              className="rounded-full"
              disabled={!email}
              onClick={() => setShowPasswordForm((open) => !open)}
            >
              {showPasswordForm ? "ปิด" : "เปลี่ยนรหัสผ่าน"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={!email || resetBusy}
              onClick={() => void sendPasswordResetEmail()}
            >
              {resetBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <MailCheck className="mr-1.5 h-4 w-4" />}
              {usesGoogle ? "ตั้งรหัสผ่านเพิ่ม" : "ตั้งรหัสผ่าน"}
            </Button>
          )}
        </Row>
      </div>

      {showPasswordForm && hasPassword && (
        <form onSubmit={submitPasswordChange} className="max-w-md space-y-3">
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
              {saveBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึกรหัสผ่านใหม่
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
              disabled={resetBusy}
              onClick={() => void sendPasswordResetEmail()}
            >
              จำรหัสเดิมไม่ได้? ส่งลิงก์ทางอีเมล
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function Row({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
