import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { readFileSync } from "node:fs";
import { defaultTaxonomy } from "../../lib/engine/enrich.mjs";
import { engineConfig as cfg } from "../../lib/engine/config.mjs";
import { parseQuery } from "../../lib/engine/parser.mjs";
import { rankItems } from "../../lib/engine/ranking.mjs";
import { BOOST_DEFAULTS, aliasLine, applyBoost, behaviorRate, boostRanked, captureQuery, isBot, langMix, learnedFile, looksPersonal, newSessionId, optedOut, suggestTerm, tuningReport } from "../../lib/engine/learning.mjs";
import { loadTaxonomy } from "../../lib/engine/taxonomy.mjs";
import signal from "../../lib/routes/signal.mjs";
import { resetRateLimits } from "../../lib/rate-limit.mjs";
import { resetKillSwitchCache } from "../../lib/engine/kill-switch.mjs";

const tax = defaultTaxonomy();
const DAY = 86400000;

describe("capture privacy", () => {
  it("drops text that looks like an email, phone number or URL, keeps normal queries", () => {
    for (const bad of ["mail me a@b.co", "call 081-234-5678", "https://x.com/a", "www.site.com poster", "see example.com"]) assert.equal(captureQuery(bad), null, bad);
    assert.equal(captureQuery("  minimal   poster "), "minimal poster");
    assert.equal(looksPersonal("ห้องนอน minimal"), false);
    assert.equal(captureQuery("a"), null);
  });
  it("detects language mix, bots and opt-out headers", () => {
    assert.equal(langMix("ห้องนอน minimal"), "mixed");
    assert.equal(langMix("ห้องนอน"), "th");
    assert.equal(langMix("poster"), "en");
    assert.equal(isBot("Googlebot/2.1"), true);
    assert.equal(isBot("Mozilla/5.0 Chrome"), false);
    assert.equal(optedOut({ dnt: "1" }), true);
    assert.equal(optedOut({ "sec-gpc": "1" }), true);
    assert.equal(optedOut({}), false);
  });
  it("session ids are random per call and can never equal a user uuid", () => {
    const a = newSessionId(), b = newSessionId();
    assert.notEqual(a, b);
    assert.match(a, /^s-[a-z0-9]{16}$/);
    assert.ok(!/^[0-9a-f-]{36}$/.test(a));
  });
});

describe("dictionary growth", () => {
  it("suggests the nearest existing term for a typo (Latin), nothing for gibberish", () => {
    assert.equal(suggestTerm("minimalizm", tax)?.id, "sty.minimal");
    assert.equal(suggestTerm("qzxwvk", tax), null);
  });
  it("aliasLine/learnedFile write lines the dictionary build understands, deterministic and deduped", () => {
    assert.deepEqual(aliasLine("sty.minimal", "Minimalizm", "en"), { domain: "sty", line: "minimal | minimalizm | " });
    assert.deepEqual(aliasLine("sty.minimal", "มินิมอลๆ", "th"), { domain: "sty", line: "minimal |  | มินิมอลๆ" });
    assert.throws(() => aliasLine("bad", "x"));
    const file = learnedFile([{ term: "minimalizm", lang: "en", term_id: "sty.minimal" }, { term: "minimalizm", lang: "en", term_id: "sty.minimal" }, { term: "ฟอนต์หนา", lang: "th", term_id: "typ.bold" }]);
    assert.match(file, /@dom sty\nminimal \| minimalizm \| \n@dom typ/);
    assert.equal(file.split("minimalizm").length - 1, 1);
  });
  it("once an alias is in the taxonomy the mixed query resolves (parser-only, no re-tagging)", () => {
    const base = JSON.parse(readFileSync(new URL("../../taxonomy/taxonomy.json", import.meta.url), "utf8"));
    const withAlias = structuredClone(base);
    withAlias.synonyms["minimalizmx"] = "sty.minimal";
    assert.ok(parseQuery("ห้องนอน minimalizmx", loadTaxonomy(withAlias), cfg).include.some(t => t.id === "sty.minimal"));
    assert.ok(!parseQuery("ห้องนอน minimalizmx", tax, cfg).include.some(t => t.id === "sty.minimal"));
  });
});

describe("bounded behaviour boost", () => {
  const now = Date.UTC(2026, 9, 4);
  const hot = { impressions: 200, saves: 40, opens: 20, last_at: new Date(now - DAY).toISOString() };
  it("needs min impressions; below that the score is untouched", () => {
    assert.equal(behaviorRate({ impressions: 10, saves: 9 }, now).eligible, false);
    assert.equal(applyBoost(0.7, { impressions: 10, saves: 9, last_at: new Date(now).toISOString() }, now), 0.7);
    assert.equal(applyBoost(0.7, undefined, now), 0.7);
  });
  it("never exceeds +15 percent, never lowers a score, never passes 1", () => {
    const b = applyBoost(0.6, hot, now);
    assert.ok(b > 0.6 && b <= 0.6 * (1 + BOOST_DEFAULTS.maxBoost) + 1e-9);
    assert.ok(applyBoost(0.99, hot, now) <= 1);
    const flop = { impressions: 500, saves: 0, opens: 0, last_at: new Date(now).toISOString() };
    assert.equal(applyBoost(0.6, flop, now), 0.6);
  });
  it("evidence decays toward the prior", () => {
    const fresh = behaviorRate(hot, now).rate;
    const old = behaviorRate({ ...hot, last_at: new Date(now - 240 * DAY).toISOString() }, now).rate;
    assert.ok(old < fresh);
  });
  it("boost off gives identical results to phase 06; boost on keeps the same members", () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: "i" + i, tags_ids: ["int.bedroom", i % 2 ? "sty.minimal" : "sty.retro", "mood.calm"], quality_score: 70 }));
    const q = parseQuery("ห้องนอน minimal calm", tax, cfg);
    const plain = rankItems(q, items, tax, cfg, { limit: 30 });
    const off = rankItems(q, items, tax, cfg, { limit: 30, behavior: null });
    assert.deepEqual(plain.items.map(i => i.id), off.items.map(i => i.id));
    const behavior = new Map(items.map(i => [i.id, i.id === "i3" ? hot : undefined]));
    const on = rankItems(q, items, tax, cfg, { limit: 30, behavior, now });
    assert.deepEqual(on.items.map(i => i.id).sort(), plain.items.map(i => i.id).sort());
  });
  it("exploration gives under-exposed items a slot in the first ten", () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({ score: 1 - i * 0.01, item: { id: "e" + i } }));
    const behavior = new Map(entries.slice(0, 15).map(e => [e.item.id, hot]));
    const out = boostRanked(entries, behavior, now);
    assert.equal(out.length, 20);
    assert.ok(out.slice(0, 10).some(e => Number(e.item.id.slice(1)) >= 15));
  });
});

describe("tuning report", () => {
  it("is advice only and waits for enough data", () => {
    assert.match(tuningReport({ searches: 10 }, cfg).advice[0], /Not enough/);
    assert.ok(tuningReport({ searches: 200, relaxRate: 0.5, zeroRate: 0.2 }, cfg).advice.length >= 2);
    assert.match(tuningReport({ searches: 200, relaxRate: 0.01, zeroRate: 0 }, cfg).advice[0], /healthy/);
  });
});

describe("signal API", () => {
  const realFetch = globalThis.fetch;
  const fakeRes = () => ({ statusCode: 200, body: "", headers: {}, writableEnded: false, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, getHeader() {}, end(c = "") { this.body = String(c); this.writableEnded = true; } });
  const fakeReq = (body, headers = {}) => Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), { method: "POST", url: "/api/signal", headers: { "user-agent": "Mozilla/5.0 Chrome", ...headers }, socket: { remoteAddress: "10.1.1.1" } });
  let calls;
  const setup = (kill = false) => {
    resetRateLimits(); resetKillSwitchCache();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
    calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
      if (String(url).includes("seeder_control")) return new Response(JSON.stringify([{ kill_switch: kill }]), { status: 200 });
      if (String(url).includes("log_search_event")) return new Response("42", { status: 200 });
      return new Response("null", { status: 200 });
    };
  };
  const done = () => { globalThis.fetch = realFetch; };

  it("stores a clean search event (no user id) and returns its id", async () => {
    setup();
    const res = fakeRes();
    await signal(fakeReq({ type: "search", sid: "s-abcdefghijkl", q: "ห้องนอน minimal", count: 5, relaxed: true }), res);
    const call = calls.find(c => c.url.includes("log_search_event"));
    assert.equal(JSON.parse(res.body).id, 42);
    assert.equal(call.body.p_lang, "mixed");
    assert.equal(call.body.p_relaxed, true);
    assert.ok(!JSON.stringify(call.body).includes("user"));
    done();
  });
  it("drops PII-like text, bots, opt-out headers, missing and non-clean session ids", async () => {
    setup();
    for (const [body, headers] of [
      [{ type: "search", sid: "s-abcdefghijkl", q: "me@x.co" }, {}],
      [{ type: "search", sid: "s-abcdefghijkl", q: "poster" }, { dnt: "1" }],
      [{ type: "search", sid: "s-abcdefghijkl", q: "poster" }, { "sec-gpc": "1" }],
      [{ type: "search", sid: "s-abcdefghijkl", q: "poster" }, { "user-agent": "Googlebot" }],
      [{ type: "search", sid: "11111111-1111-4111-8111-111111111111", q: "poster" }, {}],
    ]) await signal(fakeReq(body, headers), fakeRes());
    assert.equal(calls.filter(c => c.url.includes("log_search_event")).length, 0);
    done();
  });
  it("ties a save to its search and position; the kill switch stops capture", async () => {
    setup();
    await signal(fakeReq({ type: "save", itemId: "11111111-1111-4111-8111-111111111111", searchEventId: 42, position: 3 }), fakeRes());
    const c = calls.find(x => x.url.includes("log_item_signal"));
    assert.equal(c.body.p_search_event, 42);
    assert.equal(c.body.p_position, 3);
    setup(true);
    await signal(fakeReq({ type: "view", itemId: "11111111-1111-4111-8111-111111111111" }), fakeRes());
    assert.equal(calls.filter(x => x.url.includes("log_item_signal")).length, 0);
    done();
  });
});
