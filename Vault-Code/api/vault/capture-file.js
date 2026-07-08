import { buildCaptureResponse, buildVaultItem, parseMultipart } from "../../lib/vault-capture-core.mjs";
import { findDuplicateCapture } from "../../lib/vault-capture-core.mjs";
import { readCaptures, uploadCaptureFile, writeCapture } from "../../lib/vault-capture-store.mjs";
import { applyCors, readRawBody, sendJson } from "../../lib/vault-api-shared.mjs";
import { bearerFromRequest, resolveAuthContext } from "../../lib/vault-api-auth.mjs";

export const config = {
  api: {
    bodyParser: false
  }
};

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
    const parts = parseMultipart(await readRawBody(req), req.headers["content-type"] || "");
    const file = parts.file;
    const payload = JSON.parse(parts.payload || "{}");
    if (!file || !file.buffer || !file.buffer.length) throw new Error("Missing snapshot file.");

    const contentType = file.contentType || "image/png";
    const item = buildVaultItem(payload);
    const extension = /\.jpe?g$/i.test(file.filename || "") ? "jpg" : "png";
    const signedUrl = await uploadCaptureFile(file.buffer, contentType, item.id, extension);
    payload.assetUrl = signedUrl;
    payload.previewUrl = signedUrl;
    payload.thumbnailUrl = signedUrl;
    if (!payload.type || payload.captureContext?.method === "extension_snapshot") payload.type = "image";
    payload.captureContext = Object.assign({}, payload.captureContext || {}, {
      imageUrl: signedUrl,
      method: payload.captureContext?.method || "extension_snapshot"
    });

    const built = buildVaultItem(payload);
    built.id = item.id;
    built.assetUrl = signedUrl;
    built.previewUrl = signedUrl;
    built.thumbnailUrl = signedUrl;
    built.captureContext = payload.captureContext;

    const existingRows = await readCaptures(auth);
    const duplicate = findDuplicateCapture(built, existingRows);
    await writeCapture({
      objectId: built.id,
      item: built,
      payload: Object.assign({}, payload, { assetUrl: signedUrl }),
      createdAt: new Date().toISOString()
    }, auth);
    return sendJson(res, 200, buildCaptureResponse(built, duplicate, Object.assign({}, payload, { assetUrl: signedUrl })));
  } catch (error) {
    const status = /not configured/i.test(error.message || "") ? 503 : 400;
    return sendJson(res, status, {
      success: false,
      message: error.message || "Could not save this snapshot."
    });
  }
}
