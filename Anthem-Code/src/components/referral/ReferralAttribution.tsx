import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  captureReferralFromLocation,
  clearStoredReferralCode,
  getStoredReferralCode,
} from "@/lib/referralAttribution";

export function ReferralAttribution() {
  const { user } = useAuth();

  useEffect(() => {
    captureReferralFromLocation();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const code = getStoredReferralCode();
    if (!code) return;

    let active = true;
    void supabase
      .rpc("register_referral" as never, { p_code: code } as never)
      .then(({ error }) => {
        if (!active) return;
        const permanentErrors = [
          "SELF_REFERRAL",
          "REFERRAL_WINDOW_EXPIRED",
          "REFERRAL_CODE_NOT_FOUND",
          "INVALID_REFERRAL_CODE",
        ];
        if (!error || permanentErrors.some((value) => error.message.includes(value))) {
          clearStoredReferralCode();
        }
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  return null;
}
