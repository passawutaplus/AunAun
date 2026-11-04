import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { clearSelfSignup, pendingSelfSignup } from "@/lib/creatorInvite";

export const SET_PASSWORD_PATH = "/account/set-password";

/**
 * Creator Invitation side effects for signed-in users:
 *  - "I'll create my profile": link the account to the invitation once (no profile is created for them).
 *  - Accounts the team created on publish sign in with a one-time password and must set their own first.
 */
export function CreatorInviteAccountGuards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const linking = useRef(false);

  useEffect(() => {
    if (!user?.id || linking.current) return;
    const token = pendingSelfSignup();
    if (!token) return;
    linking.current = true;
    void (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
      "creator_invite_link_signup",
      { _token: token },
    ).then(({ data, error }) => {
      if (!error) {
        clearSelfSignup();
        if (data === true) toast.success("ผูกบัญชีกับคำเชิญ SAMECOR แล้ว · ลงผลงานแรกได้เลย");
      }
      linking.current = false;
    });
  }, [user?.id]);

  const mustChange = user?.user_metadata?.must_change_password === true;
  useEffect(() => {
    if (!mustChange) return;
    if (pathname === SET_PASSWORD_PATH || pathname.startsWith("/auth") || pathname.startsWith("/legal")) return;
    navigate(SET_PASSWORD_PATH, { replace: true });
  }, [mustChange, pathname, navigate]);

  return null;
}
