import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { userHasEmailPassword, verifyUserPassword } from "@/lib/sensitiveActionAuth";
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
  const hasPassword = userHasEmailPassword(user);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (!hasPassword) {
    return (
      <section className="rounded-2xl glass-panel p-6 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">รหัสผ่าน</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          บัญชีนี้เข้าสู่ระบบด้วย Google — ไม่มีรหัสผ่านในระบบ
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link to="/auth/forgot">ตั้งรหัสผ่านผ่านอีเมล</Link>
        </Button>
      </section>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.email) return;
    if (next.length < 8) {
      toast.error("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (next !== confirm) {
      toast.error("รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }
    setBusy(true);
    try {
      await verifyUserPassword(user.email, current);
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) toast.error(error.message);
      else {
        toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "รหัสผ่านปัจจุบันไม่ถูกต้อง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl glass-panel p-6 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">เปลี่ยนรหัสผ่าน</h2>
      </div>
      <form onSubmit={submit} className="space-y-3 max-w-md">
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
          <Button type="submit" disabled={busy} size="sm" className="rounded-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            บันทึกรหัสผ่านใหม่
          </Button>
          <Link to="/auth/forgot" className="text-xs text-primary hover:underline">
            ลืมรหัสผ่าน?
          </Link>
        </div>
      </form>
    </section>
  );
}
