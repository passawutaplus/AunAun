/**
 * Marketing plans — canonical data from Solo-Code, with an1hem overlay.
 * Regenerate base: node ../Solo-Code/scripts/vendor-ecosystem-shared.mjs
 */
import {
  type PlanId,
  type BillingCycle,
  type Plan as VendoredPlan,
  PLANS as VENDORED_PLANS,
  planPrice,
} from "./plans.vendored";
import { applyAnthemPlanOverlay } from "./plans.anthem.overlay";

export type { PlanId, BillingCycle };
export type Plan = Omit<VendoredPlan, "features">;

export const PLANS: Plan[] = applyAnthemPlanOverlay(VENDORED_PLANS).map(
  ({ features: _features, ...plan }) => plan,
);

export { planPrice };
