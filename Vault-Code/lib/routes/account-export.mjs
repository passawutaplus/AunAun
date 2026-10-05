import { createHandler } from "../vault-api-shared.mjs";
import { authError, resolveAuthContext } from "../vault-api-auth.mjs";
import { buildExport, storeExport } from "../account.mjs";

export const config = { maxDuration: 60 };

/** Export all of the signed-in user's Vault data (JSON + their own uploads) as a zip behind a one-hour signed link. */
export default createHandler({
  methods: ["POST"],
  limit: { name: "account-export", limit: 3, windowMs: 10 * 60_000 },
  fallbackMessage: "Could not create your export.",
  async handle(req) {
    const auth = await resolveAuthContext(req);
    // A real login session only: the long-lived extension token must not be able to export an account.
    if (!auth.userId || auth.token.startsWith("vxt1.") || auth.token.split(".").length !== 3) throw authError("Sign in to Vault to export your data.");
    const { zip, counts, fileCount, skipped } = await buildExport(auth.userId);
    const stored = await storeExport(auth.userId, zip);
    return { success: true, url: stored.url, expiresInSeconds: 3600, counts, files: fileCount, skippedLargeFiles: skipped };
  },
});
