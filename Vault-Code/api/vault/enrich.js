import { createHandler, readJsonBody } from "../../lib/vault-api-shared.mjs";
import { resolveAuthContext } from "../../lib/vault-api-auth.mjs";
import { enrichPreview } from "../../lib/engine/enrich.mjs";

const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");

// For local-first (browser-only) items: returns analysis fields (palette, colours, taxonomy tags); stores nothing.
// Signed-in only: the server fetches the image URL itself with the SSRF-safe fetcher (never trusts client pixels).
export default createHandler({
  methods: ["POST"],
  limit: { name: "enrich", limit: 30, windowMs: 60_000 },
  fallbackMessage: "Could not analyse this item.",
  async handle(req) {
    const auth = await resolveAuthContext(req);
    if (!auth.userId) {
      const error = new Error("กรุณาเข้าสู่ระบบก่อน");
      error.status = 401;
      throw error;
    }
    const body = await readJsonBody(req);
    const item = {
      type: body?.type === "image" ? "image" : body?.type === "link" ? "link" : "note",
      title: clip(body?.title, 300),
      note: clip(body?.note, 2000),
      previewUrl: clip(body?.previewUrl, 2048),
      thumbnailUrl: clip(body?.thumbnailUrl, 2048),
      assetUrl: clip(body?.assetUrl, 2048),
      captureContext: { quickTags: Array.isArray(body?.quickTags) ? body.quickTags.filter(t => typeof t === "string").slice(0, 8) : [], pageTitle: clip(body?.pageTitle, 300) },
      analysis: { locked: body?.locked === true },
    };
    return { success: true, analysis: await enrichPreview(item) };
  }
});
