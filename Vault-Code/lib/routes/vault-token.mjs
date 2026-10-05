import { createHandler } from "../vault-api-shared.mjs";
import { authError, signVaultToken, supabaseUserFromJwt } from "../vault-api-auth.mjs";

// Exchanges a signed-in Supabase session for a long-lived extension token.
export default createHandler({
  methods: ["POST"],
  limit: { name: "token", limit: 10, windowMs: 60_000 },
  fallbackStatus: 503,
  fallbackMessage: "Extension tokens are unavailable.",
  async handle(_req, _res, { token }) {
    const user = await supabaseUserFromJwt(token);
    if (!user) throw authError("Log in to Vault first.");
    return { success: true, token: signVaultToken(user.id) };
  }
});
