import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { resetRateLimits } from "../../lib/rate-limit.mjs";
import search from "../../api/search.js";
import similar from "../../api/similar/[id].js";
import signal from "../../api/signal.js";

const realFetch = globalThis.fetch;
let calls;

const row = (id, tags, extra = {}) => ({ id, title: "t" + id, source_url: "https://x", tags_ids: tags, quality_score: 80, tags_json: tags.map(t => ({ id: t, conf: 1 })), palette: [{ hex: "#aa3322", pct: 0.5 }], ...extra });
const ID = n => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;

function mockFetch(rows) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(String(url).includes("/rpc/") ? null : rows), { status: 200 });
  };
}
const fakeRes = () => {
  const headers = {};
  return { statusCode: 200, body: "", writableEnded: false, headers, setHeader(k, v) { headers[k.toLowerCase()] = v; }, getHeader(k) { return headers[k.toLowerCase()]; }, end(c = "") { this.body = String(c); this.writableEnded = true; } };
};
const fakeReq = (url, { method = "GET", body, query } = {}) => {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(body)]);
  return Object.assign(req, { method, url, query, headers: { "user-agent": "Mozilla/5.0 Chrome" }, socket: { remoteAddress: "10.0.0.9" } });
};

describe("search API", () => {
  beforeEach(() => resetRateLimits());
  afterEach(() => { globalThis.fetch = realFetch; });

  it("parses, queries published rows through tags_ids overlap, ranks and strips ranking-only fields", async () => {
    mockFetch([row(ID(1), ["int.bedroom", "sty.minimal"]), row(ID(2), ["int.bedroom"]), row(ID(3), ["gfx.poster"])]);
    const res = fakeRes();
    await search(fakeReq("/api/search?q=" + encodeURIComponent("ห้องนอน minimal")), res);
    const body = JSON.parse(res.body);
    assert.equal(res.statusCode, 200);
    assert.ok(body.chips.some(c => c.id === "int.bedroom"));
    assert.equal(body.items[0].id, ID(1));
    assert.ok(body.items.every(i => !("quality_score" in i) && !("tags_json" in i)));
    assert.ok(body.items[0].matchedTags.includes("sty.minimal"));
    const upstream = calls.find(c => c.url.includes("/rest/v1/discover_items"));
    assert.match(decodeURIComponent(upstream.url), /status=eq\.published/);
    assert.match(decodeURIComponent(upstream.url), /tags_ids=ov\.\{/);
    assert.match(res.headers["cache-control"], /s-maxage/);
  });

  it("an empty or unrecognised query returns no items and never hits the database", async () => {
    mockFetch([]);
    const res = fakeRes();
    await search(fakeReq("/api/search?q=" + encodeURIComponent("qwertyuiop")), res);
    assert.deepEqual(JSON.parse(res.body).items, []);
    assert.equal(calls.filter(c => c.url.includes("discover_items")).length, 0);
  });

  it("makes no external AI call at query time", async () => {
    mockFetch([row(ID(1), ["int.bedroom"])]);
    await search(fakeReq("/api/search?q=bedroom"), fakeRes());
    assert.ok(calls.every(c => !/anthropic|openai/i.test(c.url)));
  });

  it("only GET is allowed", async () => {
    const res = fakeRes();
    await search(fakeReq("/api/search?q=x", { method: "POST" }), res);
    assert.equal(res.statusCode, 405);
  });
});

describe("similar + signal API", () => {
  beforeEach(() => resetRateLimits());
  afterEach(() => { globalThis.fetch = realFetch; });

  it("404 for an unknown or malformed id; excludes the target itself", async () => {
    mockFetch([]);
    const bad = fakeRes();
    await similar(fakeReq("/api/similar/not-a-uuid", { query: { id: "not-a-uuid" } }), bad);
    assert.equal(bad.statusCode, 404);
    const target = row(ID(1), ["int.bedroom", "sty.minimal", "mood.calm"]);
    mockFetch([target, row(ID(2), ["int.bedroom", "sty.minimal", "mood.calm"]), row(ID(3), ["gfx.poster"])]);
    const ok = fakeRes();
    await similar(fakeReq("/api/similar/" + ID(1), { query: { id: ID(1) } }), ok);
    const body = JSON.parse(ok.body);
    assert.equal(ok.statusCode, 200);
    assert.ok(body.items.some(i => i.id === ID(2)));
    assert.ok(!body.items.some(i => i.id === ID(1)));
  });

  it("signal accepts only valid types and returns 204 either way", async () => {
    mockFetch([]);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    const res = fakeRes();
    await signal(fakeReq("/api/signal", { method: "POST", body: JSON.stringify({ type: "view", itemId: ID(5), tagIds: ["a.b"] }) }), res);
    assert.equal(res.statusCode, 204);
    assert.ok(calls.some(c => c.url.includes("/rpc/log_item_signal")));
    calls.length = 0;
    const bad = fakeRes();
    await signal(fakeReq("/api/signal", { method: "POST", body: JSON.stringify({ type: "hack", itemId: "x" }) }), bad);
    assert.equal(bad.statusCode, 204);
    assert.equal(calls.length, 0);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
});
