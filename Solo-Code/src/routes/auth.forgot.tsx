import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { RouteError } from "@/components/RouteError";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const Route = createFileRoute("/auth/forgot")({
  head: () => ({
    meta: [
      { title: "ลืมรหัสผ่าน — So1o Freelancer" },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("ส่งลิงก์รีเซ็ตรหัสผ่านไปทางอีเมลแล้ว");
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4 py-10">
      <div className="ambient-blobs" aria-hidden="true" />
      <Link
        to="/auth"
        search={{ redirect: undefined }}
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> กลับไปเข้าสู่ระบบ
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img
            src={logoUrl}
            alt="So1o"
            className="h-14 w-14 rounded-2xl object-cover shadow-elevated"
          />
          <h1 className="mt-3 text-xl font-semibold tracking-tight">ลืมรหัสผ่าน</h1>
          <p className="text-xs text-muted-foreground mt-1">เราจะส่งลิงก์ตั้งรหัสใหม่ไปทางอีเมล</p>
        </div>

        <Card className="glass border-white/40 shadow-elevated">
          <CardContent className="p-6">
            {sent ? (
              <div className="space-y-3 text-center">
                <p className="text-sm">
                  📨 ส่งลิงก์รีเซ็ตไปที่ <span className="font-medium">{email}</span> แล้ว
                </p>
                <p className="text-xs text-muted-foreground">
                  หากไม่เห็นในกล่องจดหมาย ลองดูในโฟลเดอร์ Spam นะครับ
                </p>
                <Button asChild variant="outline" className="w-full mt-3">
                  <Link to="/auth" search={{ redirect: undefined }}>
                    กลับไปเข้าสู่ระบบ
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-xs">
                    อีเมลที่ลงทะเบียน
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11 rounded-lg input-so1o"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full h-11 bg-primary hover:bg-primary/90 rounded-lg"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  ส่งลิงก์รีเซ็ตรหัสผ่าน
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <SiteFooter variant="minimal" />
      <Toaster position="top-center" richColors />
    </div>
  );
}
