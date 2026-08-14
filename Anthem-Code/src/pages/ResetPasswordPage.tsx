import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/ui/BackButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { HttpErrorPage } from "@/components/HttpErrorPage";
import { PasswordField } from "@/components/ui/PasswordField";
import { supabase } from "@/integrations/supabase/client";
import { establishSession } from "@/lib/authSession";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let recoveryOk = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") {
        recoveryOk = true;
        setSessionError(null);
        setReady(true);
      }
    });

    void (async () => {
      const msg = await establishSession();
      if (cancelled) return;
      if (recoveryOk) return;
      const hasAuthParams =
        new URLSearchParams(window.location.search).has("code") ||
        new URLSearchParams(window.location.search).has("token_hash") ||
        window.location.hash.includes("access_token") ||
        new URLSearchParams(window.location.search).get("type") === "recovery";
      if (msg && hasAuthParams) {
        setSessionError(msg);
        return;
      }
      // Only recovery links may set a password here — not a normal logged-in session.
      if (!recoveryOk) {
        setSessionError("ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ — ขอลิงก์ใหม่จากหน้าลืมรหัสผ่าน");
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const passError = touched && password.length > 0 && password.length < 8
    ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"
    : null;
  const confirmError =
    touched && confirm.length > 0 && password !== confirm ? "รหัสผ่านสองช่องไม่ตรงกัน" : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (password.length < 8 || password !== confirm) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) toast.error(error.message);
      else {
        toast.success("ตั้งรหัสผ่านใหม่สำเร็จ — กรุณาเข้าสู่ระบบอีกครั้ง");
        await supabase.auth.signOut({ scope: "global" });
        setTimeout(() => navigate("/auth", { replace: true }), 600);
      }
    } finally {
      setBusy(false);
    }
  };

  if (sessionError) {
    return (
      <HttpErrorPage
        kind="token"
        errorMessage={sessionError}
        extraAction={{ labelTh: "ขอลิงก์ใหม่", labelEn: "Request new link", to: "/auth/forgot" }}
      />
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">กำลังตรวจสอบลิงก์…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-30 bg-gradient-brand" />
      </div>

      <BackButton to="/auth" label="กลับไปเข้าสู่ระบบ" className="absolute top-4 left-4 z-30" />

      <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <BrandLogo />
          </div>

          <h1 className="text-2xl font-medium tracking-tight mb-1.5 thai-display text-center">
            ตั้งรหัสผ่านใหม่
          </h1>
          <p className="text-sm text-muted-foreground mb-6 thai-body text-center">
            กรอกรหัสผ่านใหม่ที่คุณจะใช้เข้าสู่ระบบ
          </p>

          <div className="rounded-2xl glass-panel-strong p-6 sm:p-7">
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-pass" className="text-xs">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</Label>
                <PasswordField
                  id="reset-pass"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(true)}
                  minLength={8}
                  showStrength
                  invalid={!!passError}
                  error={passError}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reset-confirm" className="text-xs">ยืนยันรหัสผ่านใหม่</Label>
                <PasswordField
                  id="reset-confirm"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onBlur={() => setTouched(true)}
                  invalid={!!confirmError}
                  error={confirmError}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-xl text-base font-semibold bg-gradient-brand text-white hover:opacity-95 border-0"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                บันทึกรหัสผ่านใหม่
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">
                  กลับไปเข้าสู่ระบบ
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
