import { readExtensionCollections, upsertExtensionCollection } from "../vault-collection-sync.mjs";
import { createHandler, readJsonBody } from "../vault-api-shared.mjs";
import { resolveAuthContext } from "../vault-api-auth.mjs";

export default createHandler({
  methods: ["GET", "POST"],
  limit: { name: "collections", limit: 60, windowMs: 60_000 },
  fallbackMessage: "Could not sync collections.",
  async handle(req) {
    const auth = await resolveAuthContext(req);
    if (req.method === "GET") return { success: true, collections: await readExtensionCollections(auth) };
    return { success: true, collection: await upsertExtensionCollection(auth, await readJsonBody(req)) };
  }
});
