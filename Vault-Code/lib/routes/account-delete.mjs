import { createHandler, readJsonBody } from "../vault-api-shared.mjs";
import { authError, resolveAuthContext } from "../vault-api-auth.mjs";
import { deleteVaultData } from "../account.mjs";
import { supabaseRest } from "../supabase-rest.mjs";

export const config = { maxDuration: 60 };
export const CONFIRM_TEXT = "DELETE MY VAULT DATA";

/**
 * Deletes the signed-in user's A+ Vault data (items, collections, projects, moodboards, share links, files, extension captures).
 * The login itself is shared with other Aplus apps and is NOT removed here.
 */
export default createHandler({
  methods: ["POST"],
  limit: { name: "account-delete", limit: 3, windowMs: 10 * 60_000 },
  fallbackMessage: "Could not delete your data.",
  async handle(req) {
    const auth = await resolveAuthContext(req);
    if (!auth.userId || auth.token.startsWith("vxt1.") || auth.token.split(".").length !== 3) throw authError("Sign in to Vault to delete your data.");
    const body = await readJsonBody(req);
    if (String(body?.confirm || "").trim() !== CONFIRM_TEXT) {
      const error = new Error(`Type ${CONFIRM_TEXT} to confirm.`);
      error.status = 400;
      throw error;
    }
    const deleted = await deleteVaultData(auth.userId);
    // Keep a record of how the request was handled (no content, just the fact and the time).
    await supabaseRest("/rest/v1/dsar_requests", { method: "POST", prefer: "return=minimal", body: { user_id: auth.userId, type: "delete", details: "Self-service Vault data deletion", status: "done", resolved_at: new Date().toISOString() }, feature: "DSAR", errorMessage: "log failed" }).catch(() => {});
    return { success: true, deleted, note: "Your A+ login is shared with other Aplus apps and was not removed." };
  },
});
