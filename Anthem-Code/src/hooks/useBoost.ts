import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startBoostCheckout } from "@/lib/stripePaymentsApi";

export type BoostPackage = "micro_3" | "micro_7" | "micro_14";
export type BoostTargetType = "project" | "community_post";

export interface PostBoost {
  id: string;
  user_id: string;
  target_type: BoostTargetType;
  target_id: string;
  package: BoostPackage;
  amount_thb: number;
  duration_days: number;
  status: "pending_payment" | "active" | "expired" | "cancelled";
  start_at: string | null;
  end_at: string | null;
  impressions: number;
  clicks: number;
  created_at: string;
}

export interface ActiveBoost {
  boost_id: string;
  target_type: BoostTargetType;
  target_id: string;
  end_at: string;
}

export const BOOST_PACKAGES = [
  {
    id: "micro_3" as const,
    priceId: "boost_99_3d",
    name: "3 วัน",
    priceTHB: 99,
    durationDays: 3,
    perk: "ดันขึ้นต้นฟีด · badge Boosted",
  },
  {
    id: "micro_7" as const,
    priceId: "boost_249_7d",
    name: "7 วัน",
    priceTHB: 249,
    durationDays: 7,
    perk: "มองเห็นมากขึ้น · สถิติแสดง/คลิก",
  },
  {
    id: "micro_14" as const,
    priceId: "boost_499_14d",
    name: "14 วัน",
    priceTHB: 499,
    durationDays: 14,
    perk: "สูงสุด · ครอบคลุม 2 สัปดาห์",
  },
] as const;

const packageToPriceId: Record<BoostPackage, string> = {
  micro_3: "boost_99_3d",
  micro_7: "boost_249_7d",
  micro_14: "boost_499_14d",
};

export const useActiveBoosts = (limit = 80) =>
  useQuery({
    queryKey: ["active-boosts", limit],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_boosts", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as ActiveBoost[];
    },
  });

export const useMyBoosts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-boosts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_boosts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PostBoost[];
    },
  });
};

export const useCreateAndPayBoost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      targetType: BoostTargetType;
      targetId: string;
      package: BoostPackage;
      successPath: string;
      cancelPath?: string;
    }) => {
      const { data, error } = await supabase.rpc("create_post_boost", {
        _target_type: vars.targetType,
        _target_id: vars.targetId,
        _package: vars.package,
      });
      if (error) throw error;
      const row = data as PostBoost;
      await startBoostCheckout({
        boostId: row.id,
        priceId: packageToPriceId[vars.package],
        successPath: vars.successPath,
        cancelPath: vars.cancelPath,
      });
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-boosts"] });
      qc.invalidateQueries({ queryKey: ["active-boosts"] });
    },
  });
};

export function buildBoostedIdSet(boosts: ActiveBoost[] | undefined) {
  const projects = new Set<string>();
  const posts = new Set<string>();
  for (const b of boosts ?? []) {
    if (b.target_type === "project") projects.add(b.target_id);
    else posts.add(b.target_id);
  }
  return { projects, posts };
}

/** target_id → boost_id for analytics */
export function buildBoostTargetMaps(boosts: ActiveBoost[] | undefined) {
  const projects = new Map<string, string>();
  const posts = new Map<string, string>();
  for (const b of boosts ?? []) {
    if (b.target_type === "project") projects.set(b.target_id, b.boost_id);
    else posts.set(b.target_id, b.boost_id);
  }
  return { projects, posts };
}

export async function logBoostEvent(boostId: string, eventType: "impression" | "click") {
  try {
    await supabase.rpc("log_boost_event", { _boost_id: boostId, _event_type: eventType });
  } catch {
    /* non-critical */
  }
}
