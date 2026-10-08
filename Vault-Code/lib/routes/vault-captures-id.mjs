import { deleteCapture, readCaptureItem, writeCaptureItem } from "../vault-capture-store.mjs";
import { createHandler, readJsonBody } from "../vault-api-shared.mjs";
import { resolveAuthContext } from "../vault-api-auth.mjs";

const clip = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Fields the extension may change after a quick keep ("Add details"). Pure, so it can be unit tested. */
export function applyCaptureEdits(item, body) {
  const next = { ...item, captureContext: { ...(item.captureContext || {}) } };
  if (typeof body?.title === "string") next.title = clip(body.title, 160) || item.title;
  if (typeof body?.note === "string") next.note = String(body.note).trim().slice(0, 4000);
  if (typeof body?.collectionId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(body.collectionId)) {
    next.collectionIds = [body.collectionId];
    next.captureContext.collectionName = body.collectionId === "all" ? null : clip(body.collectionName, 80) || next.captureContext.collectionName || null;
  }
  next.editedAt = Date.now();
  return next;
}

/** Undo (DELETE) and "Add details" (PATCH) from the extension, owner only (scope = the caller's own token). */
export default createHandler({
  methods: ["DELETE", "PATCH"],
  limit: { name: "capture-delete", limit: 60, windowMs: 60_000 },
  fallbackMessage: "Could not change this save.",
  async handle(req) {
    const auth = await resolveAuthContext(req);
    const id = req.query?.id || new URL(req.url || "/", "http://localhost").pathname.split("/").filter(Boolean).pop();
    if (!/^[a-z0-9]{6,64}$/i.test(String(id || ""))) {
      const error = new Error("Invalid id.");
      error.status = 400;
      throw error;
    }
    if (req.method === "PATCH") {
      const body = await readJsonBody(req);
      const item = await readCaptureItem(id, auth);
      if (!item) {
        const error = new Error("Nothing to edit.");
        error.status = 404;
        throw error;
      }
      const next = applyCaptureEdits(item, body);
      await writeCaptureItem(id, next, auth);
      return { success: true, objectId: id, item: { title: next.title, note: next.note, collectionIds: next.collectionIds, editedAt: next.editedAt } };
    }
    const removed = await deleteCapture(id, auth);
    if (!removed) {
      const error = new Error("Nothing to undo.");
      error.status = 404;
      throw error;
    }
    return { success: true, objectId: id };
  },
});
