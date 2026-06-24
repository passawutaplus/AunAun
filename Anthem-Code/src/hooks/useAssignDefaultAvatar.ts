import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";

const assignRpc = supabase as unknown as {
  rpc: (fn: "assign_my_default_avatar") => Promise<{ error: Error | null }>;
};

/**
 * Assigns a random pool avatar for signed-in users who still have none
 * (e.g. signed up before the pool existed).
 */
export function useAssignDefaultAvatar() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const qc = useQueryClient();
  const tried = useRef(false);

  useEffect(() => {
    if (!user || tried.current) return;
    if (profile?.avatar_url?.trim()) return;

    tried.current = true;
    void assignRpc.rpc("assign_my_default_avatar").then(({ error }) => {
      if (error) {
        tried.current = false;
        return;
      }
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    });
  }, [user, profile?.avatar_url, qc]);
}
