import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  email: string;
  onSignOut: () => void;
};

export function EmailVerificationGate({ email, onSignOut }: Props) {
  const [sending, setSending] = React.useState(false);

  async function resend() {
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("ส่งอีเมลยืนยันอีกครั้งแล้ว — ตรวจกล่องจดหมาย");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งอีเมลไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold">ยืนยันอีเมลก่อนใช้งาน</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          เราส่งลิงก์ยืนยันไปที่ <strong className="text-foreground">{email}</strong> แล้ว
          กรุณาคลิกลิงก์ในอีเมล แล้วกลับมารีเฟรชหน้านี้
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => window.location.reload()} className="w-full">
            ฉันยืนยันแล้ว — รีเฟรช
          </Button>
          <Button variant="outline" onClick={resend} disabled={sending} className="w-full">
            {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            ส่งอีเมลยืนยันอีกครั้ง
          </Button>
          <Button variant="ghost" onClick={onSignOut} className="w-full text-muted-foreground">
            ออกจากระบบ
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          มีปัญหา?{" "}
          <a href="mailto:hello@solofreelancer.com" className="text-primary hover:underline">
            ติดต่อเรา
          </a>
          {" · "}
          <Link to="/" className="text-primary hover:underline">
            กลับหน้าแรก
          </Link>
        </p>
      </div>
    </div>
  );
}
