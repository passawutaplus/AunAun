/**
 * Weekly / EOM payout + reconciliation cron entry (Vercel cron).
 * GET/POST /api/aplus1-payout-cron?kind=weekly|eom|reconcile
 * Protect with CRON_SECRET.
 */

function readEnv(name) {
  return process.env[name] || "";
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  const secret = readEnv("CRON_SECRET");
  const auth = req.headers.authorization || "";
  if (secret && auth !== `Bearer ${secret}`) {
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

  if (readEnv("OMISE_MODE") === "live" && readEnv("OMISE_MARKETPLACE_APPROVED") !== "true") {
    return json(res, 503, { error: "live_blocked", kind });
  }

  // Stub plan — worker should load available balances + call Omise transfers.
  return json(res, 200, {
    ok: true,
    kind,
    message:
      kind === "reconcile"
        ? "compare Omise vs ledger and alert admin — do not auto-adjust"
        : "enqueue payout candidates per Aplus1 payout policy",
  });
}
