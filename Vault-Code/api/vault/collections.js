import { readExtensionCollections, storageConfigured, upsertExtensionCollection } from "../../lib/vault-collection-sync.mjs";
import { applyCors, readJsonBody, sendJson } from "../../lib/vault-api-shared.mjs";
import { bearerFromRequest, resolveAuthContext } from "../../lib/vault-api-auth.mjs";

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (!bearerFromRequest(req)) return sendJson(res, 401, { success: false, message: "Missing Vault token." });
  if (!storageConfigured()) {
    return sendJson(res, 503, { success: false, message: "Collection sync API is not configured on the server." });
  }

  try {
    const auth = await resolveAuthContext(req);

    if (req.method === "GET") {
      const collections = await readExtensionCollections(auth);
      return sendJson(res, 200, { success: true, collections });
    }

    if (req.method === "POST") {
      const payload = await readJsonBody(req);
      const collection = await upsertExtensionCollection(auth, payload);
      return sendJson(res, 200, { success: true, collection });
    }

    return sendJson(res, 405, { success: false, message: "Method not allowed." });
  } catch (error) {
    return sendJson(res, 400, {
      success: false,
      message: error.message || "Could not sync collections."
    });
  }
}
