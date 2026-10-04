import { deleteCapture } from "../../../lib/vault-capture-store.mjs";
import { createHandler } from "../../../lib/vault-api-shared.mjs";
import { resolveAuthContext } from "../../../lib/vault-api-auth.mjs";

/** Undo from the extension: delete one capture, owner only (scope = the caller's own token). */
export default createHandler({
  methods: ["DELETE"],
  limit: { name: "capture-delete", limit: 60, windowMs: 60_000 },
  fallbackMessage: "Could not undo this save.",
  async handle(req) {
    const auth = await resolveAuthContext(req);
    const id = req.query?.id || new URL(req.url || "/", "http://localhost").pathname.split("/").filter(Boolean).pop();
    if (!/^[a-z0-9]{6,64}$/i.test(String(id || ""))) {
      const error = new Error("Invalid id.");
      error.status = 400;
      throw error;
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
