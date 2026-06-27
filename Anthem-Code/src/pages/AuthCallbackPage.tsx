import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  consumeOAuthRedirect,
  formatOAuthCallbackError,
  parseOAuthError,
} from "@/lib/oauthRedirect";
import { HttpErrorPage } from "@/components/HttpErrorPage";

async function establishSession(): Promise<string | null> {
  const oauthErr = parseOAuthError();
  if (oauthErr) return formatOAuthCallbackError(oauthErr);

  const { data: { session: existing }, error: existingErr } = await supabase.auth.getSession();
  if (existingErr) return existingErr.message;
  if (existing) return null;

  const code = new URLSearchParams(window.location.search).get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return formatOAuthCallbackError(error.message);
    return null;
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return formatOAuthCallbackError(error.message);
    return null;
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) return sessionError.message;
  if (session) return null;

  return "เข้าสู่ระบบไม่สำเร็จ — ลองใหม่อีกครั้ง";
}

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void establishSession().then((msg) => {
      if (cancelled) return;
      if (msg) {
        setError(msg);
        return;
      }
      navigate(consumeOAuthRedirect("/"), { replace: true });
    });

    return () => {
      cancelled = true;
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
