/**
 * PromptPay charge for an object order — provider: Payso.
 * POST /api/object-charge
 * Body: { orderId, title? }
 *
 * The Payso API is not wired yet, so this answers 503 payso_not_integrated for signed-in callers.
 * When it lands, the amount must come from the order row (never the client) and the paid state from a
 * verified Payso webhook via markObjectOrderPaidFromCharge (api/object-order-paid.js).
 */

import { json, readEnv, requireSupabaseUser } from "./_helpers.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
    if (readEnv("PAYMENT_PROVIDER") !== "payso") {
      return json(res, 503, { error: "provider_disabled" });
    }
    const user = await requireSupabaseUser(req);
    if (!user) return json(res, 401, { error: "auth_required" });
    return json(res, 503, { error: "payso_not_integrated" });
  } catch (e) {
    return json(res, 500, { error: e instanceof Error ? e.message : "charge_failed" });
  }
}
