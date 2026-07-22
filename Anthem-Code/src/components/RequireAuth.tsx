import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import PageLoader from "@/components/ui/PageLoader";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { isEmailVerifiedForAccess } from "@/lib/authEmail";
import { buildEmailConfirmUrl } from "@/lib/oauthRedirect";
import { signOutApp } from "@/lib/signOutApp";

interface Props {
  children: ReactNode;
  /** ถ้า true จะอนุญาตให้ผู้ใช้ที่ยังไม่ยืนยันอีเมลเข้าถึงได้ */
  allowUnverified?: boolean;
}

const RequireAuth = ({ children, allowUnverified = false }: Props) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Email/password ต้องยืนยันอีเมล — OAuth (เช่น Google) ผ่านได้เลย
  if (!allowUnverified && !isEmailVerifiedForAccess(user)) {
    return <VerifyEmailGate email={user.email ?? ""} />;
  }

  return <>{children}</>;
};

const VerifyEmailGate = ({ email }: { email: string }) => {
  const queryClient = useQueryClient();

  const resend = async () => {
    if (!email) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: buildEmailConfirmUrl() },
    });
    if (error) toast.error(error.message);
    else toast.success("ส่งอีเมลยืนยันใหม่แล้ว ตรวจกล่องจดหมายของคุณ");
  };

  const signOut = async () => {
    await signOutApp(queryClient);
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-app-ambient">
      <div className="glass-panel-strong max-w-md w-full rounded-3xl p-8 text-center">
        <MailCheck className="mx-auto w-9 h-9 text-primary mb-5" />
        <h1 className="text-xl mb-2">ยืนยันอีเมลของคุณ</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          เราส่งลิงก์ยืนยันไปที่
          <br />
          <span className="text-foreground font-medium">{email}</span>
          <br />
          กรุณาเปิดอีเมลแล้วกดลิงก์เพื่อเริ่มใช้งาน
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={resend} className="rounded-xl bg-gradient-brand text-white border-0">
            ส่งอีเมลยืนยันอีกครั้ง
          </Button>
          <Button onClick={signOut} variant="ghost" className="rounded-xl">
            ออกจากระบบ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequireAuth;
