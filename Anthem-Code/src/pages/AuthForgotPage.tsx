import { useState, useEffect } from "react";
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
import { readLoginEmailPrefill } from "@/lib/loginEmailPrefill";
import { SETTINGS_PIN_RECOVER_HREF } from "@/lib/settingsNav";

const AuthForgotPage = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const prefill = readLoginEmailPrefill();
    if (prefill) setEmail(prefill);
  }, []);

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
    <div className="relative min-h-screen overflow-hidden bg-[#f5f5f5] text-[#2f2e2c]">
      <BackButton
        to="/auth"
        label="กลับไปเข้าสู่ระบบ"
        className="absolute top-4 left-4 z-30 border-[#e4e1db] bg-white/90 text-[#2f2e2c] hover:bg-white"
      />

      <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <BrandLogo tone="ink" />
          </div>

          <h1 className="mb-2 text-center font-display text-[2.15rem] font-medium leading-tight tracking-tight text-[#2f2e2c]">
            ลืมรหัสผ่าน
          </h1>
          <p className="text-sm text-muted-foreground mb-6 thai-body text-center">
            เราจะส่งลิงก์ไปทางอีเมล จากนั้นใส่รหัสผ่านเดิมเพื่อยืนยันว่าเป็นเจ้าของบัญชี
          </p>

          <div className="rounded-[1.75rem] border border-[#e4e1db] bg-white p-6 sm:p-7">
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
                      className="h-11 rounded-full border-[#e4e1db] bg-[#f5f5f5] pl-9 text-[#2f2e2c] shadow-none"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-full border-0 bg-[#2f2e2c] text-base font-medium text-[#f5f5f5] shadow-none hover:bg-[#2f2e2c]/90"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  ส่งลิงก์รีเซ็ตรหัสผ่าน
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  ลืม PIN ถอนเงินใช้คนละทาง —{" "}
                  <Link to={SETTINGS_PIN_RECOVER_HREF} className="text-[#2f2e2c] underline underline-offset-2">
                    เข้าสู่ระบบแล้วกู้ PIN ที่ตั้งค่าบัญชี
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForgotPage;
