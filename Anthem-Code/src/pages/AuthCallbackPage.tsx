import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { establishSession } from "@/lib/authSession";
import { consumeOAuthRedirect, isOAuthPopupWindow } from "@/lib/oauthRedirect";
import { HttpErrorPage } from "@/components/HttpErrorPage";

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const isPopup = isOAuthPopupWindow();

  useEffect(() => {
    let cancelled = false;

    void establishSession().then((msg) => {
      if (cancelled) return;
      if (msg) {
        setError(msg);
        // The opener tab is polling supabase.auth.getSession() itself, so this
        // popup has nothing more useful to do — close it after a short delay
        // so the error is still readable if the user glances at it.
        if (isPopup) window.setTimeout(() => { try { window.close(); } catch { /* noop */ } }, 2000);
        return;
      }
      if (isPopup) {
        try { window.close(); } catch { /* noop */ }
        return;
      }
      navigate(consumeOAuthRedirect("/"), { replace: true });
    });

    return () => {
      cancelled = true;
    };
  }, [navigate, isPopup]);

  if (error) {
    if (isPopup) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-destructive">
          <p>{error}</p>
          <button type="button" className="underline text-muted-foreground" onClick={() => window.close()}>
            ปิดหน้านี้
          </button>
        </div>
      );
    }
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
