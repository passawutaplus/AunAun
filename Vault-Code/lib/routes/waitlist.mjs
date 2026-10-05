import { createHandler, readJsonBody } from "../vault-api-shared.mjs";
import { supabaseRest } from "../supabase-rest.mjs";

const EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
const SOURCES = new Set(["welcome-hero", "welcome-apps", "welcome-footer", "welcome"]);

/** Pre-launch waitlist: public, rate limited, idempotent per email. Only the email, source and consent are stored. */
export default createHandler({
  methods: ["POST"],
  requireToken: false,
  limit: { name: "waitlist", limit: 8, windowMs: 60 * 60_000 },
  fallbackMessage: "Could not join the waitlist.",
  async handle(req) {
    const body = await readJsonBody(req);
    const email = String(body?.email || "").trim().toLowerCase().slice(0, 200);
    if (!EMAIL.test(email)) {
      const error = new Error("Enter a valid email address.");
      error.status = 400;
      throw error;
    }
    if (body?.consent !== true) {
      const error = new Error("Please agree to be contacted about the launch.");
      error.status = 400;
      throw error;
    }
    const source = SOURCES.has(String(body?.source)) ? String(body.source) : "welcome";
    await supabaseRest("/rest/v1/vault_waitlist?on_conflict=email", { method: "POST", prefer: "resolution=ignore-duplicates,return=minimal", body: { email, source, consent: true }, feature: "Waitlist", errorMessage: "Could not join the waitlist." });
    return { success: true, message: "You're on the list. We'll email you when A+ Vault opens." };
  },
});
