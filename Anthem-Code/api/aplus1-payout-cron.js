/**
 * Weekly / EOM payout + reconciliation cron entry (Vercel cron).
 * GET/POST /api/aplus1-payout-cron?kind=weekly|eom|reconcile
 * Protect with CRON_SECRET.
 */

import { json, readEnv, safeBearerMatches } from "./_helpers.js";

export default async function handler(req, res) {
  if (!safeBearerMatches(req, readEnv("CRON_SECRET"))) {
    return json(res, 401, { error: "unauthorized" });
  }

  const url = new URL(req.url || "/", "http://localhost");
  const kind = url.searchParams.get("kind") || "weekly";

  if (kind === "expire-quotes") {
    return json(res, 200, {
      ok: true,
      kind,
      message: "use /api/aplus1-quote-expiry-cron?kind=expire-quotes",
      redirect: "/api/aplus1-quote-expiry-cron?kind=expire-quotes",
    });
  }

  // Paying creators out of collected money needs Payso's written OK for marketplace use first.
  if (readEnv("PAYSO_MARKETPLACE_APPROVED") !== "true") {
    return json(res, 503, { error: "payouts_blocked_until_payso_marketplace_approved", kind });
  }

  // Stub plan — worker should load available balances and queue creator payouts.
  return json(res, 200, {
    ok: true,
    kind,
    message:
      kind === "reconcile"
        ? "compare Payso settlements vs ledger and alert admin — do not auto-adjust"
        : "enqueue payout candidates per Aplus1 payout policy",
  });
}
