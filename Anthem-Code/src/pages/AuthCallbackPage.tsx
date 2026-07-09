import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { establishSession } from "@/lib/authSession";
import { consumeOAuthRedirect } from "@/lib/oauthRedirect";
import { HttpErrorPage } from "@/components/HttpErrorPage";

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
