import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";
import { TITLES } from "@/lib/i18n/pageTitles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/ui/PasswordField";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { passwordChangeFormError } from "@/lib/passwordChange";
import { userFacingError } from "@/lib/userFacingError";

/** First sign-in of an account the team created from a creator invitation: replace the one-time password. */
export default function SetFirstPasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const formError = passwordChangeFormError({ current: "", next: password, confirm, needsCurrent: false });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (formError) {
      toast.error(formError);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
      if (error) toast.error(userFacingError(error));
      else {
        toast.success("ตั้งรหัสผ่านแล้ว ยินดีต้อนรับสู่ SAMECOR");
        navigate("/portfolio", { replace: true });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main-content" className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <SeoHead title={TITLES.setPassword} path="/account/set-password" noindex />
      <h1 className="font-display text-3xl font-semibold tracking-tight">ตั้งรหัสผ่านของคุณ</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        คุณเข้าด้วยรหัสผ่านชั่วคราวจากอีเมล ตั้งรหัสใหม่ที่จำได้ก่อนใช้งานต่อ
        {user?.email ? <span className="block break-all text-foreground">{user.email}</span> : null}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
          <PasswordField id="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required showStrength />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">ยืนยันรหัสผ่าน</Label>
          <PasswordField
            id="confirm-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            invalid={touched && !!confirm && confirm !== password}
            error={touched && confirm && confirm !== password ? "รหัสผ่านสองช่องไม่ตรงกัน" : null}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
          บันทึกรหัสผ่าน
        </Button>
      </form>
    </main>
  );
}
