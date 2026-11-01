import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  formatOAuthCallbackError,
  hasAuthErrorParams,
  parseOAuthError,
  stripAuthErrorParams,
} from "@/lib/oauthRedirect";

/**
 * Supabase sends a failed sign-in (expired / reused OAuth state, e.g. after the browser Back button)
 * to the project's Site URL with ?error_code=… in the query. Catch it on any page:
 * already signed in → just drop the error from the URL; otherwise go to /auth with a clear message.
 * /auth/callback handles its own errors.
 */
export function OAuthErrorGate() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (pathname === "/auth/callback") return;
    if (!hasAuthErrorParams(search, hash)) return;
    const message = formatOAuthCallbackError(parseOAuthError() ?? "");
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        navigate(stripAuthErrorParams(pathname, search), { replace: true });
        return;
      }
      toast.message(message || "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง");
      navigate("/auth", { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, search, hash, navigate]);

  return null;
}
