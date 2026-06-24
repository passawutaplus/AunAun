import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStripeErrorMessage } from "@/lib/stripe.server";
import { assertAllowedPaymentRedirectUrl } from "@/lib/paymentsApiValidation";
import {
  createCheckoutSessionForUser,
  createConnectOnboardingLinkForUser,
  getSubscriptionDowngradeStateForUser,
  processCashoutTransferForAdmin,
  resumeSubscriptionForUser,
  scheduleSubscriptionCancelForUser,
  scheduleSubscriptionTierDowngradeForUser,
  syncSubscriptionFromStripeForUser,
  upgradeSubscriptionTierForUser,
} from "@/lib/stripePayments.server";
import type { SubscriptionDowngradeState } from "@/lib/subscriptionTiers";

type CheckoutResult = { url: string } | { error: string };
type PortalResult = { url: string } | { error: string };
type ConnectResult = { url: string } | { error: string };
type CashoutResult = { transferId: string } | { error: string };
type DowngradeStateResult = SubscriptionDowngradeState | { error: string };
type DowngradeOkResult = { ok: true; effectiveAt?: string } | { error: string };
type SyncSubscriptionResult =
  | { synced: true; tier: string }
  | { synced: false }
  | { error: string };
type UpgradeTierResult = { ok: true; tier: string } | { error: string };

const envSchema = z.enum(["sandbox", "live"]);
const envOnlyInput = z.object({ environment: envSchema });

const checkoutInput = z.object({
  priceId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/),
  environment: envSchema,
  successUrl: z.string().url().max(500),
  cancelUrl: z.string().url().max(500),
  quantity: z.number().int().min(1).max(50).optional(),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => checkoutInput.parse(data))
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { userId, supabase } = context;
    const { data: userData } = await supabase.auth.getUser();
    return createCheckoutSessionForUser({
      userId,
      email: userData.user?.email ?? undefined,
      priceId: data.priceId,
      environment: data.environment,
      successUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
      quantity: data.quantity,
    });
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        environment: envSchema,
        returnUrl: z.string().url().max(500),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<PortalResult> => {
    try {
      const { supabase, userId } = context;
      const { createStripeClient } = await import("@/lib/stripe.server");
      const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !sub?.stripe_customer_id) {
        return { error: "ไม่พบข้อมูลการสมัครสมาชิก — กรุณาสมัคร Pro ก่อน" };
      }

      const stripe = createStripeClient(data.environment);
      const returnUrl = assertAllowedPaymentRedirectUrl(data.returnUrl);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

const connectInput = z.object({
  environment: envSchema,
  returnUrl: z.string().url().max(500),
  refreshUrl: z.string().url().max(500),
});

export const createConnectOnboardingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => connectInput.parse(data))
  .handler(async ({ data, context }): Promise<ConnectResult> => {
    const { userId, supabase } = context;
    const { data: userData } = await supabase.auth.getUser();
    return createConnectOnboardingLinkForUser({
      userId,
      email: userData.user?.email ?? undefined,
      environment: data.environment,
      returnUrl: data.returnUrl,
      refreshUrl: data.refreshUrl,
    });
  });

const cashoutInput = z.object({
  cashoutId: z.string().uuid(),
  environment: envSchema,
});

export const processCashoutTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => cashoutInput.parse(data))
  .handler(async ({ data, context }): Promise<CashoutResult> => {
    return processCashoutTransferForAdmin({
      adminUserId: context.userId,
      cashoutId: data.cashoutId,
      environment: data.environment,
    });
  });

export const getSubscriptionDowngradeState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => envOnlyInput.parse(data))
  .handler(async ({ data, context }): Promise<DowngradeStateResult> => {
    return getSubscriptionDowngradeStateForUser({
      userId: context.userId,
      environment: data.environment,
    });
  });

export const scheduleSubscriptionCancel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => envOnlyInput.parse(data))
  .handler(async ({ data, context }): Promise<DowngradeOkResult> => {
    return scheduleSubscriptionCancelForUser({
      userId: context.userId,
      environment: data.environment,
    });
  });

export const resumeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => envOnlyInput.parse(data))
  .handler(async ({ data, context }): Promise<DowngradeOkResult> => {
    return resumeSubscriptionForUser({
      userId: context.userId,
      environment: data.environment,
    });
  });

const tierDowngradeInput = z.object({
  environment: envSchema,
  targetTier: z.enum(["pro", "pro_plus"]),
});

export const scheduleSubscriptionTierDowngrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => tierDowngradeInput.parse(data))
  .handler(async ({ data, context }): Promise<DowngradeOkResult> => {
    return scheduleSubscriptionTierDowngradeForUser({
      userId: context.userId,
      environment: data.environment,
      targetTier: data.targetTier,
    });
  });

export const syncSubscriptionFromStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => envOnlyInput.parse(data))
  .handler(async ({ data, context }): Promise<SyncSubscriptionResult> => {
    return syncSubscriptionFromStripeForUser({
      userId: context.userId,
      environment: data.environment,
    });
  });

const upgradeTierInput = z.object({
  environment: envSchema,
  targetTier: z.enum(["pro_plus", "inhouse"]),
  quantity: z.number().int().min(2).max(50).optional(),
});

export const upgradeSubscriptionTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => upgradeTierInput.parse(data))
  .handler(async ({ data, context }): Promise<UpgradeTierResult> => {
    return upgradeSubscriptionTierForUser({
      userId: context.userId,
      environment: data.environment,
      targetTier: data.targetTier,
      quantity: data.quantity,
    });
  });
