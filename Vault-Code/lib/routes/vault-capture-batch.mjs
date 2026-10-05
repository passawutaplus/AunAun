import { buildVaultItem } from "../vault-capture-core.mjs";
import { findDuplicateCapture, writeCapture } from "../vault-capture-store.mjs";
import { createHandler, readJsonBody } from "../vault-api-shared.mjs";
import { resolveAuthContext } from "../vault-api-auth.mjs";
import { fireEnrich } from "../engine/enrich.mjs";
import { engineConfig } from "../engine/config.mjs";

const httpsUrl = v => {
  try { return new URL(String(v || "")).protocol === "https:"; } catch { return false; }
};

/**
 * Keep All: up to BATCH_MAX items in ONE request (one auth, one rate-limit unit).
 * Saves URLs + source + credit only; thumbnails are fetched server-side later by enrichment (never by the extension).
 * Per-item results: kept | duplicate | failed. `skipDuplicates` (default true) leaves already-kept items alone.
 */
export default createHandler({
  methods: ["POST"],
  limit: { name: "capture-batch", limit: 20, windowMs: 60_000 },
  fallbackMessage: "Could not save these images.",
  async handle(req) {
    const auth = await resolveAuthContext(req);
    const body = await readJsonBody(req);
    const items = Array.isArray(body?.items) ? body.items : null;
    if (!items || !items.length) {
      const error = new Error("No items to keep.");
      error.status = 400;
      throw error;
    }
    if (items.length > engineConfig.BATCH_MAX) {
      const error = new Error(`At most ${engineConfig.BATCH_MAX} items per request.`);
      error.status = 413;
      throw error;
    }
    const skipDuplicates = body?.skipDuplicates !== false;
    const results = [];
    for (let index = 0; index < items.length; index++) {
      const payload = items[index];
      try {
        const url = payload?.assetUrl || payload?.sourceUrl || payload?.previewUrl;
        if (!payload || typeof payload !== "object" || !httpsUrl(url)) {
          results.push({ index, status: "failed", error: "Needs an https image or page URL." });
          continue;
        }
        // Batch items are links to images the user ticked on their own page: always private, collection from the batch.
        const item = buildVaultItem({
          ...payload,
          type: payload.type === "video" ? "video" : "image",
          collectionId: payload.collectionId || body.collectionId,
          collectionName: payload.collectionName || body.collectionName,
          captureContext: { ...(payload.captureContext || {}), method: "extension_keep_all" },
        });
        const duplicate = await findDuplicateCapture(item, auth);
        if (duplicate && skipDuplicates) {
          results.push({ index, status: "duplicate", objectId: duplicate.objectId || null });
          continue;
        }
        await writeCapture({ objectId: item.id, item, payload }, auth);
        await fireEnrich(item.id, auth);
        results.push({ index, status: "kept", objectId: item.id, duplicateOf: duplicate ? duplicate.objectId || null : null });
      } catch (error) {
        results.push({ index, status: "failed", error: String(error?.message || "failed").slice(0, 120) });
      }
    }
    const count = key => results.filter(r => r.status === key).length;
    return { success: true, kept: count("kept"), duplicates: count("duplicate"), failed: count("failed"), results };
  },
});
