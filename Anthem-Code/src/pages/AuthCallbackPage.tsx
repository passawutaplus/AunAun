import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { consumeOAuthRedirect, parseOAuthError } from "@/lib/oauthRedirect";
import { HttpErrorPage } from "@/components/HttpErrorPage";

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const oauthErr = parseOAuthError();
    if (oauthErr) {
      setError(oauthErr);
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      navigate(consumeOAuthRedirect("/"), { replace: true });
    };

    const fail = (msg: string) => {
      if (done) return;
      done = true;
      setError(msg);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        subscription.unsubscribe();
        finish();
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        subscription.unsubscribe();
        fail(sessionError.message);
        return;
      }
      if (session) {
        subscription.unsubscribe();
        finish();
      }
    });

    const timer = window.setTimeout(() => {
      subscription.unsubscribe();
      fail("เข้าสู่ระบบไม่สำเร็จ — ลองใหม่อีกครั้ง");
    }, 15000);

    return () => {
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    return (
      <HttpErrorPage
        kind="token"
        errorMessage={error}
        extraAction={{ labelTh: "กลับไปเข้าสู่ระบบ", labelEn: "Back to sign in", to: "/auth" }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">กำลังเข้าสู่ระบบ…</p>
    </div>
  );
};

export default AuthCallbackPage;
