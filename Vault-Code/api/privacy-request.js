import { createHandler, readJsonBody } from "../lib/vault-api-shared.mjs";
import { resolveAuthContext } from "../lib/vault-api-auth.mjs";
import { supabaseRest } from "../lib/supabase-rest.mjs";

const TYPES = new Set(["access", "delete", "rectify", "object", "restrict", "withdraw", "complaint"]);

/** Privacy contact form: creates a dsar_requests row (due in 30 days). Public, rate limited; signed-in users are linked. */
export default createHandler({
  methods: ["POST"],
  requireToken: false,
  limit: { name: "privacy-request", limit: 5, windowMs: 60 * 60_000 },
  fallbackMessage: "Could not send your request.",
  async handle(req) {
    const body = await readJsonBody(req);
    const type = String(body?.type || "");
    const email = String(body?.email || "").trim().slice(0, 200);
    const details = String(body?.details || "").trim().slice(0, 4000);
    if (!TYPES.has(type)) {
      const error = new Error("Choose a request type.");
      error.status = 400;
      throw error;
    }
    let userId = null;
    try { userId = (await resolveAuthContext(req)).userId; } catch { /* anonymous is fine */ }
    if (!userId && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      const error = new Error("Add an email address so we can reply.");
      error.status = 400;
      throw error;
    }
    await supabaseRest("/rest/v1/dsar_requests", { method: "POST", prefer: "return=minimal", body: { user_id: userId, email: email || null, type, details }, feature: "Privacy requests", errorMessage: "Could not save your request." });
    return { success: true, message: "We received your request and will answer within 30 days." };
  },
});
