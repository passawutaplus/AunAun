import { readCaptures } from "../../lib/vault-capture-store.mjs";
import { applyCors, sendJson } from "../../lib/vault-api-shared.mjs";
import { bearerFromRequest, resolveAuthContext } from "../../lib/vault-api-auth.mjs";

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "GET") return sendJson(res, 405, { success: false, message: "Method not allowed." });
  if (!bearerFromRequest(req)) return sendJson(res, 401, { success: false, message: "Missing Vault token." });

  try {
    const auth = await resolveAuthContext(req);
    const items = await readCaptures(auth);
    return sendJson(res, 200, { success: true, items });
  } catch (error) {
    const status = /not configured/i.test(error.message || "") ? 503 : 500;
    return sendJson(res, status, {
      success: false,
      message: error.message || "Could not load captures."
    });
  }
}
