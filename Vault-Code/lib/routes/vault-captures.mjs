import { readCaptures } from "../vault-capture-store.mjs";
import { createHandler } from "../vault-api-shared.mjs";
import { resolveAuthContext } from "../vault-api-auth.mjs";

export default createHandler({
  methods: ["GET"],
  limit: { name: "captures", limit: 30, windowMs: 60_000 },
  fallbackStatus: 500,
  fallbackMessage: "Could not load captures.",
  async handle(req) {
    const auth = await resolveAuthContext(req);
    const limit = new URL(req.url || "/", "http://localhost").searchParams.get("limit");
    return { success: true, items: await readCaptures(auth, { limit }) };
  }
});
