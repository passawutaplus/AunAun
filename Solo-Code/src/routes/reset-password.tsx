import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { RouteError } from "@/components/RouteError";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "ตั้งรหัสผ่านใหม่ — So1o Freelancer" },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (password !== confirm) {
      toast.error("รหัสผ่านสองช่องไม่ตรงกัน");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("ตั้งรหัสผ่านใหม่สำเร็จ!");
      setTimeout(() => navigate({ to: "/dashboard" }), 600);
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
          <h1 className="mt-3 text-xl font-semibold tracking-tight">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-xs text-muted-foreground mt-1">
            กรอกรหัสผ่านใหม่ที่คุณจะใช้เข้าสู่ระบบ
          </p>
        </div>

        <Card className="glass border-white/40 shadow-elevated">
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</Label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ยืนยันรหัสผ่านใหม่</Label>
                <PasswordInput
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full h-11 bg-primary hover:bg-primary/90 rounded-lg"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                ยืนยันรหัสผ่านใหม่
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <SiteFooter variant="minimal" />
      <Toaster position="top-center" richColors />
    </div>
  );
}
