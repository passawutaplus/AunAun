import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/ui/BackButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { HttpErrorPage } from "@/components/HttpErrorPage";
import { supabase } from "@/integrations/supabase/client";
import { establishSession } from "@/lib/authSession";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setSessionError(null);
        setReady(true);
      }
    });

    void (async () => {
      const msg = await establishSession();
      if (cancelled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
        return;
      }
      const hasAuthParams =
        new URLSearchParams(window.location.search).has("code") ||
        new URLSearchParams(window.location.search).has("token_hash") ||
        window.location.hash.includes("access_token");
      if (msg && hasAuthParams) setSessionError(msg);
      else setReady(true);
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (password !== confirm) {
      toast.error("รหัสผ่านสองช่องไม่ตรงกัน");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) toast.error(error.message);
      else {
        toast.success("ตั้งรหัสผ่านใหม่สำเร็จ!");
        setTimeout(() => navigate("/", { replace: true }), 600);
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
                <div className="relative">
                  <Input
                    id="reset-pass"
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    className="h-11 rounded-xl pr-10 bg-background/60 backdrop-blur border-border/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPass ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reset-confirm" className="text-xs">ยืนยันรหัสผ่านใหม่</Label>
                <div className="relative">
                  <Input
                    id="reset-confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className={cn(
                      "h-11 rounded-xl pr-10 bg-background/60 backdrop-blur border-border/60",
                      confirm && password !== confirm && "border-destructive",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirm ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-xl text-base font-semibold bg-gradient-brand text-white hover:opacity-95 border-0 shadow-md shadow-primary/20"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                ยืนยันรหัสผ่านใหม่
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                <Link to="/auth/forgot" className="text-primary hover:underline">ขอลิงก์ใหม่</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
