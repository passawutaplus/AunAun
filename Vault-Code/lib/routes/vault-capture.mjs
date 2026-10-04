import { buildCaptureResponse, buildVaultItem } from "../vault-capture-core.mjs";
import { findDuplicateCapture, writeCapture } from "../vault-capture-store.mjs";
import { createHandler, readJsonBody } from "../vault-api-shared.mjs";
import { resolveAuthContext } from "../vault-api-auth.mjs";
import { fireEnrich } from "../engine/enrich.mjs";

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
    await fireEnrich(item.id, auth);
    return buildCaptureResponse(item, duplicate);
  }
});
