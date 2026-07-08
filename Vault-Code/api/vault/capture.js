import { buildCaptureResponse, buildVaultItem, findDuplicateCapture, parseMultipart } from "../../lib/vault-capture-core.mjs";
import { readCaptures, writeCapture } from "../../lib/vault-capture-store.mjs";
import { applyCors, readJsonBody, sendJson } from "../../lib/vault-api-shared.mjs";
import { bearerFromRequest, resolveAuthContext } from "../../lib/vault-api-auth.mjs";

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "POST") return sendJson(res, 405, { success: false, message: "Method not allowed." });
  if (!bearerFromRequest(req)) return sendJson(res, 401, { success: false, message: "Missing Vault token." });

  try {
    const auth = await resolveAuthContext(req);
    const payload = await readJsonBody(req);
    const item = buildVaultItem(payload);
    const existingRows = await readCaptures(auth);
    const duplicate = findDuplicateCapture(item, existingRows);
    await writeCapture({
      objectId: item.id,
      item,
      payload,
      createdAt: new Date().toISOString()
    }, auth);
    return sendJson(res, 200, buildCaptureResponse(item, duplicate));
  } catch (error) {
    const status = /not configured/i.test(error.message || "") ? 503 : 400;
    return sendJson(res, status, {
      success: false,
      message: error.message || "Could not save this object."
    });
  }
}
