import { buildCaptureResponse, buildVaultItem } from "../../lib/vault-capture-core.mjs";
import { findDuplicateCapture, writeCapture } from "../../lib/vault-capture-store.mjs";
import { createHandler, readJsonBody } from "../../lib/vault-api-shared.mjs";
import { resolveAuthContext } from "../../lib/vault-api-auth.mjs";

export default createHandler({
  methods: ["POST"],
  limit: { name: "capture", limit: 60, windowMs: 60_000 },
  fallbackMessage: "Could not save this object.",
  async handle(req) {
    const auth = await resolveAuthContext(req);
    const payload = await readJsonBody(req);
    const item = buildVaultItem(payload);
    const duplicate = await findDuplicateCapture(item, auth);
    await writeCapture({ objectId: item.id, item, payload }, auth);
    return buildCaptureResponse(item, duplicate);
  }
});
