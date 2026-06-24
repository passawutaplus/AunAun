import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { getStripeEnvironment } from "@/lib/stripe";

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

  // Realtime: refetch on subscription / credits changes.
  // Use a unique channel name per mount so React StrictMode / re-renders never
  // reuse a previously-subscribed channel (which would throw
  // "cannot add postgres_changes callbacks after subscribe()").
  React.useEffect(() => {
    if (!userId) return;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", userId, env] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage", userId] });
    };
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

  // Profile tier wins if active; else fall back to free
  const tier: Tier = profileTier !== "free" ? profileTier : isActive ? "pro" : "free";
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
