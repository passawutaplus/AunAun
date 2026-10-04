import { buildCaptureResponse, buildVaultItem, parseMultipart, safeUploadType } from "../../lib/vault-capture-core.mjs";
import { findDuplicateCapture, uploadCaptureFile, writeCapture } from "../../lib/vault-capture-store.mjs";
import { createHandler, readRawBody } from "../../lib/vault-api-shared.mjs";
import { authError, resolveAuthContext } from "../../lib/vault-api-auth.mjs";
import { fireEnrich } from "../../lib/engine/enrich.mjs";
import { probeImageSize } from "../../lib/import/image-probe.mjs";
import { stripImageMetadata } from "../../lib/image-sanitize.mjs";

export const config = {
  api: {
    bodyParser: false
  }
};

export default createHandler({
  methods: ["POST"],
  limit: { name: "capture-file", limit: 20, windowMs: 60_000 },
  fallbackMessage: "Could not save this snapshot.",
  async handle(req) {
    const auth = await resolveAuthContext(req);
    // File storage is account-only so anonymous tokens can't use the bucket as a file host.
    if (!auth.userId) throw authError("Log in to Vault and copy your extension token to upload files.");
    const parts = parseMultipart(await readRawBody(req), req.headers["content-type"] || "");
    const file = parts.file;
    let payload;
    try {
      payload = JSON.parse(parts.payload || "{}");
    } catch {
      throw new Error("Invalid capture payload.");
    }
    if (!file || !file.buffer || !file.buffer.length) throw new Error("Missing snapshot file.");

    const { contentType, extension } = safeUploadType(file.contentType, file.filename);
    const method = payload.captureContext?.method || "extension_snapshot";
    // A user's own upload needs the rights tick; extension snapshots stay private with unknown rights.
    if (/^web_upload/.test(method) && payload.rightsConfirmed !== true) {
      const error = new Error("ต้องยืนยันว่าเป็นเจ้าของหรือได้รับอนุญาตให้เก็บรูปนี้");
      error.status = 400;
      error.code = "RIGHTS_REQUIRED";
      throw error;
    }
    let buffer = file.buffer;
    if (contentType.startsWith("image/")) {
      // Trust the bytes, not the declared type: must really be a decodable-looking image of sane size.
      const size = probeImageSize(buffer);
      if (!size || size.width > 20000 || size.height > 20000) {
        const error = new Error("ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ");
        error.status = 415;
        throw error;
      }
      buffer = Buffer.from(stripImageMetadata(buffer)); // removes EXIF/GPS
    }
    const id = buildVaultItem(payload).id;
    const { path, signedUrl } = await uploadCaptureFile(buffer, contentType, id, extension, auth.userId);
    if (!payload.type || method === "extension_snapshot") payload.type = "image";
    Object.assign(payload, { assetUrl: signedUrl, previewUrl: signedUrl, thumbnailUrl: signedUrl });
    payload.captureContext = Object.assign({}, payload.captureContext || {}, { imageUrl: signedUrl, method });

    const item = Object.assign(buildVaultItem(payload), { id, assetPath: path, mimeType: contentType });
    const duplicate = await findDuplicateCapture(item, auth);
    await writeCapture({ objectId: id, item, payload }, auth);
    await fireEnrich(id, auth);
    return buildCaptureResponse(item, duplicate);
  }
});
