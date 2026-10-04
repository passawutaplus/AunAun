import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { bangkokDateKey, feedPrefix, rotateFeed, seededRng } from "../../lib/engine/feed.mjs";
import { pickFromPast } from "../../lib/engine/serendipity.mjs";
import { buildDigest, profileFromItems, scoreForProfile, signUnsubscribe, verifyUnsubscribe } from "../../lib/engine/digest.mjs";
import { engineConfig as cfg } from "../../lib/engine/config.mjs";
import { defaultTaxonomy } from "../../lib/engine/enrich.mjs";
import { resetRateLimits } from "../../lib/rate-limit.mjs";
import feed from "../../api/feed.js";
import unsubscribe from "../../api/unsubscribe.js";

const tax = defaultTaxonomy();
const uid = n => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const mk = (n, category, source, extra = {}) => ({ id: uid(n), category, source, license: "cc0", status: "published", title: "T" + n, attribution: "Credit " + n, image_md_path: `m/${n}.webp`, tags_ids: [], ...extra });

describe("daily feed rotation", () => {
  const items = [
    ...Array.from({ length: 6 }, (_, i) => mk(i, "poster", "met")),
    ...Array.from({ length: 6 }, (_, i) => mk(10 + i, "textile", "cma")),
    ...Array.from({ length: 6 }, (_, i) => mk(20 + i, "ceramic", "met")),
  ];
  it("is deterministic per day and different on another day", () => {
    const a = rotateFeed(items, "2026-10-04").map(i => i.id).join();
    assert.equal(a, rotateFeed(items, "2026-10-04").map(i => i.id).join());
    assert.notEqual(a, rotateFeed(items, "2026-10-05").map(i => i.id).join());
  });
  it("mixes categories/sources instead of showing one bucket first", () => {
    const first6 = rotateFeed(items, "2026-10-04").slice(0, 6);
    assert.ok(new Set(first6.map(i => i.category)).size === 3, first6.map(i => i.category).join());
  });
  it("keeps every item exactly once and demotes items the visitor already saw", () => {
    const seen = items.slice(0, 4).map(i => feedPrefix(i.id));
    const out = rotateFeed(items, "2026-10-04", { seenPrefixes: seen });
    assert.equal(out.length, items.length);
    assert.equal(new Set(out.map(i => i.id)).size, items.length);
    const tail = out.slice(-4).map(i => feedPrefix(i.id)).sort();
    assert.deepEqual(tail, [...seen].sort());
  });
  it("Bangkok date key rolls over at local midnight and the rng is stable", () => {
    assert.equal(bangkokDateKey(new Date("2026-10-04T16:59:00Z")), "2026-10-04");
    assert.equal(bangkokDateKey(new Date("2026-10-04T17:01:00Z")), "2026-10-05");
    assert.equal(seededRng("x")(), seededRng("x")());
  });
});

describe("From your past (serendipity)", () => {
  const DAY = 86400000, now = Date.UTC(2026, 9, 4);
  const old = n => ({ id: "i" + n, type: "image", createdAt: now - (31 + n) * DAY, thumbnailUrl: "x" });
  it("picks 3 items saved > 30 days ago, deterministic for the day", () => {
    const items = [...Array.from({ length: 8 }, (_, n) => old(n)), { id: "new", type: "image", createdAt: now - 3 * DAY, thumbnailUrl: "x" }];
    const a = pickFromPast(items, { now, day: "2026-10-04" });
    assert.equal(a.length, 3);
    assert.ok(a.every(i => i.id !== "new"));
    assert.deepEqual(a.map(i => i.id), pickFromPast(items, { now, day: "2026-10-04" }).map(i => i.id));
  });
  it("skips recently opened items and returns nothing when fewer than 3 qualify", () => {
    const items = Array.from({ length: 4 }, (_, n) => old(n));
    const opened = { i0: now - 2 * DAY, i1: now - 2 * DAY };
    assert.deepEqual(pickFromPast(items, { now, opened }), []);
    assert.deepEqual(pickFromPast(items.slice(0, 2), { now }), []);
  });
});

describe("weekly digest (dry run)", () => {
  const userItems = [
    { analysis: { tagIds: ["sty.minimal", "gfx.poster", "mood.calm"], colors: ["#ff3b30"] } },
    { analysis: { tagIds: ["sty.minimal", "gfx.poster"], colors: ["#ff3b30", "#ffffff"] } },
    { analysis: { tagIds: ["sty.minimal"], colors: [] } },
  ];
  const profile = profileFromItems(userItems);
  const candidates = [
    mk(1, "poster", "met", { tags_ids: ["sty.minimal", "gfx.poster"], palette: [{ hex: "#ff4038", pct: 0.5 }] }),
    mk(2, "poster", "met", { tags_ids: ["sty.minimal"] }),
    mk(3, "poster", "met", { tags_ids: ["int.bedroom"] }),
    mk(4, "textile", "cma", { tags_ids: ["sty.minimal", "mood.calm"], license: "cc-by-nc" }), // NC: never allowed
    mk(5, "textile", "cma", { tags_ids: ["sty.minimal", "gfx.poster"], status: "review" }), // not published
  ];
  const input = { user: { id: uid(99), name: "Aun" }, profile, candidates, pastPicks: [{ title: "Old find" }], label: id => tax.label(id), mediaUrl: p => "https://cdn.test/" + p, unsubscribeToken: signUnsubscribe(uid(99), "k") };

  it("builds a Thai digest from matching published, licence-ok items only, best match first", () => {
    const d = buildDigest(input, cfg);
    assert.ok(d.dryRun);
    assert.match(d.subject, /A\+ Vault/);
    assert.deepEqual(d.items.map(i => i.id), [uid(1), uid(2)]);
    assert.ok(!d.items.some(i => [uid(3), uid(4), uid(5)].includes(i.id)));
    assert.ok(d.items[0].reasons.length > 0);
    assert.match(d.text, /Old find/);
  });
  it("always carries unsubscribe (link + RFC 8058 headers) and escapes HTML", () => {
    const d = buildDigest({ ...input, candidates: [mk(1, "poster", "met", { title: "<script>x</script>", tags_ids: ["sty.minimal"] })] }, cfg);
    assert.match(d.html, /ยกเลิกการรับ/);
    assert.ok(!d.html.includes("<script>x"));
    assert.match(d.headers["List-Unsubscribe-Post"], /One-Click/);
    assert.match(d.headers["List-Unsubscribe"], /\/api\/unsubscribe\?t=/);
  });
  it("sends nothing when there is no profile or no matches", () => {
    assert.equal(buildDigest({ ...input, profile: profileFromItems([]) }, cfg), null);
    assert.equal(buildDigest({ ...input, candidates: [mk(3, "x", "y", { tags_ids: ["int.bedroom"] })] }, cfg), null);
  });
  it("profile counts tags and favourite colours; scoring is weighted overlap", () => {
    assert.equal(profile.tags[0].id, "sty.minimal");
    assert.equal(profile.palette[0].hex, "#ff3b30");
    assert.ok(scoreForProfile(candidates[0], profile, cfg).score > scoreForProfile(candidates[1], profile, cfg).score);
  });
  it("unsubscribe tokens verify only for the right user and secret", () => {
    const t = signUnsubscribe(uid(1), "secret");
    assert.equal(verifyUnsubscribe(t, "secret"), uid(1));
    assert.equal(verifyUnsubscribe(t, "other"), null);
    assert.equal(verifyUnsubscribe(t.replace(uid(1), uid(2)), "secret"), null);
    assert.equal(verifyUnsubscribe("garbage", "secret"), null);
  });
});

describe("feed + unsubscribe API", () => {
  const realFetch = globalThis.fetch;
  let calls;
  const fakeRes = () => { const headers = {}; return { statusCode: 200, body: "", writableEnded: false, headers, setHeader(k, v) { headers[k.toLowerCase()] = v; }, getHeader(k) { return headers[k.toLowerCase()]; }, end(c = "") { this.body = String(c); this.writableEnded = true; } }; };
  const fakeReq = (url, method = "GET") => Object.assign(Readable.from([]), { method, url, headers: {}, socket: { remoteAddress: "10.0.0.8" } });
  beforeEach(() => resetRateLimits());
  afterEach(() => { globalThis.fetch = realFetch; delete process.env.DIGEST_UNSUB_SECRET; delete process.env.SUPABASE_SERVICE_ROLE_KEY; });

  it("/api/feed returns a rotated, paginated page of published items without ranking-only fields", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => mk(i, i % 2 ? "poster" : "textile", "met", { quality_score: 80, tags_json: [] }));
    globalThis.fetch = async url => new Response(JSON.stringify(rows), { status: 200 });
    const res = fakeRes();
    await feed(fakeReq("/api/feed?limit=4"), res);
    const body = JSON.parse(res.body);
    assert.equal(body.items.length, 4);
    assert.equal(body.nextOffset, 4);
    assert.ok(body.items.every(i => !("quality_score" in i)));
    assert.match(res.headers["cache-control"], /s-maxage/);
  });

  it("/api/unsubscribe verifies the token, calls the DB once, and never reveals anything for bad tokens", async () => {
    process.env.DIGEST_UNSUB_SECRET = "s3cret";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    calls = [];
    globalThis.fetch = async (url, init) => { calls.push(String(url)); return new Response("null", { status: 200 }); };
    const ok = fakeRes();
    await unsubscribe(fakeReq("/api/unsubscribe?t=" + encodeURIComponent(signUnsubscribe(uid(7))), "POST"), ok);
    assert.equal(ok.statusCode, 200);
    assert.ok(calls.some(c => c.includes("/rpc/digest_unsubscribe")));
    calls.length = 0;
    const bad = fakeRes();
    await unsubscribe(fakeReq("/api/unsubscribe?t=nope"), bad);
    assert.equal(bad.statusCode, 400);
    assert.equal(calls.length, 0);
    assert.match(bad.headers["cache-control"], /no-store/);
  });
});
