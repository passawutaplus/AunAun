import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/ui/BackButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { buildResetPasswordUrl } from "@/lib/oauthRedirect";
import { toast } from "sonner";

const AuthForgotPage = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: buildResetPasswordUrl(),
      });
      if (error) toast.error(error.message);
      else {
        setSent(true);
        toast.success("ส่งลิงก์รีเซ็ตรหัสผ่านไปทางอีเมลแล้ว");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-30 bg-gradient-brand" />
        <div className="absolute top-1/3 -right-24 w-[380px] h-[380px] rounded-full blur-3xl opacity-25 bg-gradient-brand" />
      </div>

      <BackButton to="/auth" label="กลับไปเข้าสู่ระบบ" className="absolute top-4 left-4 z-30" />

      <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <BrandLogo />
          </div>

          <h1 className="text-2xl font-medium tracking-tight mb-1.5 thai-display text-center">
            ลืมรหัสผ่าน
          </h1>
          <p className="text-sm text-muted-foreground mb-6 thai-body text-center">
            เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปทางอีเมล
          </p>

          <div className="rounded-2xl glass-panel-strong p-6 sm:p-7">
            {sent ? (
              <div className="space-y-3 text-center">
                <p className="text-sm thai-body">
                  ส่งลิงก์รีเซ็ตไปที่{" "}
                  <span className="font-medium text-foreground">{email}</span> แล้ว
                </p>
                <p className="text-xs text-muted-foreground">
                  หากไม่เห็นในกล่องจดหมาย ลองดูในโฟลเดอร์ Spam
                </p>
                <Button asChild variant="outline" className="w-full mt-2 rounded-xl">
                  <Link to="/auth">กลับไปเข้าสู่ระบบ</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-xs">อีเมลที่ลงทะเบียน</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11 rounded-xl bg-background/60 backdrop-blur border-border/60"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full h-11 rounded-xl text-base font-semibold bg-gradient-brand text-white hover:opacity-95 border-0 shadow-md shadow-primary/20"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  ส่งลิงก์รีเซ็ตรหัสผ่าน
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForgotPage;
