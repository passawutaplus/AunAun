import { createHandler, readJsonBody } from "../lib/vault-api-shared.mjs";
import { engineConfig } from "../lib/engine/config.mjs";
import { rpcQuiet } from "../lib/engine/discover-read.mjs";
import { isKillSwitchOn } from "../lib/engine/kill-switch.mjs";
import { defaultTaxonomy } from "../lib/engine/enrich.mjs";
import { parseQuery } from "../lib/engine/parser.mjs";
import { captureQuery, isBot, langMix, optedOut } from "../lib/engine/learning.mjs";
import { publishableKey, serviceRoleKey, supabaseUrl } from "../lib/supabase-rest.mjs";

const TYPES = new Set(["view", "save", "skip", "open"]);
const UUID = /^[0-9a-f-]{36}$/i;
const SID = /^s-[a-z0-9]{10,36}$/;

async function rpcValue(name, body) {
  try {
    const key = serviceRoleKey();
    if (!key) return null;
    const res = await fetch(`${supabaseUrl()}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Anonymous, aggregate-only usage signals for Discover (no user id, no IP, no account join).
 * Types: view/save/skip/open for an item (optionally tied to the search that showed it), "views" (a batch of impressions),
 * and "search" (one row per Discover search). Dropped when: LEARN_CAPTURE is off, the kill switch is on, DNT/GPC is set,
 * the client looks like a bot, or the text looks like personal data. Private Vault searches are never sent here.
 */
export default createHandler({
  methods: ["POST"],
  requireToken: false,
  limit: { name: "signal", limit: 120, windowMs: 60_000 },
  fallbackMessage: "ok",
  async handle(req, res) {
    const body = await readJsonBody(req);
    const done = out => {
      if (out === undefined) { res.statusCode = 204; res.end(); return; }
      return { success: true, ...out };
    };
    if (!engineConfig.LEARN_CAPTURE || optedOut(req.headers) || isBot(req.headers["user-agent"]) || (await isKillSwitchOn())) return done();
    const sid = SID.test(String(body?.sid || "")) ? body.sid : null;

    if (body?.type === "search") {
      const q = captureQuery(body.q);
      if (!q || !sid) return done();
      const parsed = parseQuery(q, defaultTaxonomy(), engineConfig);
      const id = await rpcValue("log_search_event", {
        p_sid: sid,
        p_query: q,
        p_parsed: { include: parsed.include.map(t => t.id), exclude: parsed.exclude, unknown: parsed.unknown.map(u => u.term).slice(0, 8) },
        p_lang: langMix(q),
        p_results: Number.isFinite(Number(body.count)) ? Math.max(0, Math.min(100000, Number(body.count))) : null,
        p_relaxed: body.relaxed === true,
      });
      return done({ id: typeof id === "number" ? id : null });
    }

    if (body?.type === "views") {
      const ids = (Array.isArray(body.ids) ? body.ids : []).filter(i => UUID.test(String(i))).slice(0, 40);
      const eventId = Number.isInteger(body.searchEventId) ? body.searchEventId : null;
      if (ids.length) await rpcValue("log_item_views", { p_ids: ids, p_search_event: eventId });
      return done();
    }

    if (TYPES.has(body?.type) && UUID.test(String(body?.itemId || ""))) {
      const tagIds = Array.isArray(body.tagIds) ? body.tagIds.filter(t => typeof t === "string" && t.length < 60).slice(0, 12) : null;
      const eventId = Number.isInteger(body.searchEventId) ? body.searchEventId : null;
      const position = Number.isInteger(body.position) ? body.position : null;
      await rpcQuiet("log_item_signal", { p_item: body.itemId, p_type: body.type, p_tag_ids: tagIds, p_search_event: eventId, p_position: position });
    }
    return done();
  },
});

export { publishableKey };
