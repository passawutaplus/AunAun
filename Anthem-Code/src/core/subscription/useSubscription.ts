import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalizePlanId } from "@/lib/tierMembership";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
}

export type Tier = "free" | "pro" | "pro_plus" | "inhouse";

/** Stripe env: live when VITE_STRIPE_MODE=live, else sandbox (matches So1o). */
export function getStripeEnvironment(): "sandbox" | "live" {
  const mode = import.meta.env.VITE_STRIPE_MODE as string | undefined;
  return mode === "live" ? "live" : "sandbox";
}

/**
 * Reads the same subscription_tier / subscriptions row as So1o My Desk.
 * profiles.user_id === auth user id on the unified backend.
 */
export function useSubscription() {
  const { user } = useAuth();
  const env = getStripeEnvironment();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["subscription", userId, env],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: sub }, { data: profile }, { data: credits }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId!)
          .eq("environment", env)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("subscription_tier, subscription_seats")
          .eq("user_id", userId!)
          .maybeSingle(),
        supabase
          .from("user_credits")
          .select("balance")
          .eq("user_id", userId!)
          .eq("environment", env)
          .maybeSingle(),
      ]);

      return {
        subscription: (sub as SubscriptionRow | null) ?? null,
        profileTier: (profile?.subscription_tier as Tier | undefined) ?? "free",
        seats: profile?.subscription_seats ?? 1,
        credits: credits?.balance ?? 0,
      };
    },
  });

  useEffect(() => {
    if (!userId) return;
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ["subscription", userId, env] });
    const topic = `subs-${userId}-${Math.random().toString(36).slice(2, 10)}`;
    const ch = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_credits", filter: `user_id=eq.${userId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
        invalidate,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, env, queryClient]);

  const sub = query.data?.subscription ?? null;
  const profileTier = query.data?.profileTier ?? "free";
  const credits = query.data?.credits ?? 0;

  const now = Date.now();
  const periodEndMs = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;

  const isActive =
    !!sub &&
    ((["active", "trialing", "past_due"].includes(sub.status) &&
      (!periodEndMs || periodEndMs > now)) ||
      (sub.status === "canceled" && periodEndMs && periodEndMs > now));

  const rawTier: Tier = profileTier !== "free" ? profileTier : isActive ? "pro" : "free";
  const tier: Tier = normalizePlanId(rawTier);
  const isPro = tier === "pro" || tier === "pro_plus" || tier === "inhouse";

  return {
    subscription: sub,
    tier,
    isPro,
    isActive,
    credits,
    seats: query.data?.seats ?? 1,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
