import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { consumeOAuthRedirect, parseOAuthError } from "@/lib/oauthRedirect";
import { RouteError } from "@/components/RouteError";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "กำลังเข้าสู่ระบบ… — So1o" }, { name: "robots", content: "noindex" }],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
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
      navigate({ to: consumeOAuthRedirect("/dashboard"), replace: true });
    };

    const fail = (msg: string) => {
      if (done) return;
      done = true;
      setError(msg);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-destructive max-w-md">{error}</p>
        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={() =>
            navigate({ to: "/auth", search: { redirect: undefined }, replace: true })
          }
        >
          กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">กำลังเข้าสู่ระบบ…</p>
    </div>
  );
}
