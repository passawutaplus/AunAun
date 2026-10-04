import { createHandler, readJsonBody } from "../lib/vault-api-shared.mjs";
import { engineConfig } from "../lib/engine/config.mjs";
import { rpcQuiet } from "../lib/engine/discover-read.mjs";

const TYPES = new Set(["view", "save", "skip", "open"]);

/** Anonymous, aggregate-only usage signal for Discover (no user id, no session id, no IP stored). */
export default createHandler({
  methods: ["POST"],
  requireToken: false,
  limit: { name: "signal", limit: 120, windowMs: 60_000 },
  fallbackMessage: "ok",
  async handle(req, res) {
    const body = await readJsonBody(req);
    if (engineConfig.LEARN_CAPTURE && TYPES.has(body?.type) && /^[0-9a-f-]{36}$/i.test(String(body?.itemId || ""))) {
      const tagIds = Array.isArray(body.tagIds) ? body.tagIds.filter(t => typeof t === "string" && t.length < 60).slice(0, 12) : null;
      await rpcQuiet("log_item_signal", { p_item: body.itemId, p_type: body.type, p_tag_ids: tagIds });
    }
    res.statusCode = 204;
    res.end();
  },
});
