import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ConnectProfile {
  stripe_connect_account_id: string | null;
  connect_onboarding_complete: boolean;
  connect_payouts_enabled: boolean;
}

export const useConnectProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["connect-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ConnectProfile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("stripe_connect_account_id, connect_onboarding_complete, connect_payouts_enabled")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return {
        stripe_connect_account_id: data?.stripe_connect_account_id ?? null,
        connect_onboarding_complete: data?.connect_onboarding_complete ?? false,
        connect_payouts_enabled: data?.connect_payouts_enabled ?? false,
      };
    },
  });
};
