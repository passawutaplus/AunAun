import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { dedupeKeys, findDuplicateCapture, parseMultipart } from "../../lib/vault-capture-core.mjs";
import { findDuplicateCapture as findDuplicateRemote, readCaptures, writeCapture } from "../../lib/vault-capture-store.mjs";
import { readExtensionCollections, upsertExtensionCollection } from "../../lib/vault-collection-sync.mjs";
import { createHandler } from "../../lib/vault-api-shared.mjs";
import { rateLimit, resetRateLimits } from "../../lib/rate-limit.mjs";
import { discoverUpstreamQuery } from "../../api/discover.js";

const userId = "11111111-1111-4111-8111-111111111111";
const realFetch = globalThis.fetch;
let calls;

function mockFetch(responder) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const { status = 200, body = [] } = responder(String(url), init) || {};
    return new Response(body === null ? "" : JSON.stringify(body), { status });
  };
}

function fakeRes() {
  const headers = {};
  return {
    statusCode: 200, body: "", writableEnded: false, headers,
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    getHeader(k) { return headers[k.toLowerCase()]; },
    end(chunk = "") { this.body = String(chunk); this.writableEnded = true; },
  };
}

function fakeReq({ method = "GET", url = "/", headers = {}, body } = {}) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(body)]);
  Object.assign(req, { method, url, headers, socket: { remoteAddress: "10.0.0.1" } });
  return req;
}

describe("capture core", () => {
  it("parses binary multipart parts without corrupting bytes", () => {
    const bytes = Buffer.from([0, 255, 13, 10, 13, 10, 45, 45, 128, 7]);
    const boundary = "----vaultTest";
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="payload"\r\n\r\n{"title":"ไทย"}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: image/png\r\n\r\n`),
      bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const parts = parseMultipart(body, `multipart/form-data; boundary=${boundary}`);
    assert.equal(JSON.parse(parts.payload).title, "ไทย");
    assert.equal(parts.file.contentType, "image/png");
    assert.deepEqual([...parts.file.buffer], [...bytes]);
  });

  it("builds stable dedupe keys and skips data URLs", () => {
    const keys = dedupeKeys({ sourceUrl: "https://a.com/x#frag", previewUrl: "data:image/png;base64,AAAA", captureContext: { pageUrl: "https://a.com/x" } });
    assert.deepEqual(keys, ["https://a.com/x"]);
    assert.ok(findDuplicateCapture({ sourceUrl: "https://a.com/x" }, [{ item: { sourceUrl: "https://a.com/x#top" } }]));
  });
});

describe("capture store", () => {
  afterEach(() => { globalThis.fetch = realFetch; });
  beforeEach(() => { process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"; });

  it("checks duplicates with one indexed overlap query", async () => {
    mockFetch(() => ({ body: [{ object_id: "abc" }] }));
    const dup = await findDuplicateRemote({ sourceUrl: "https://a.com/x" }, { userId });
    assert.equal(dup.objectId, "abc");
    assert.equal(calls.length, 1);
    assert.match(decodeURIComponent(calls[0].url), /dedupe_keys=ov\.\{"https:\/\/a\.com\/x"\}/);
    assert.match(calls[0].url, /limit=1/);
  });

  it("writes with return=minimal and stores dedupe keys", async () => {
    mockFetch(() => ({ status: 201, body: null }));
    await writeCapture({ objectId: "o1", item: { sourceUrl: "https://a.com/y" } }, { userId });
    assert.equal(calls[0].init.headers.prefer, "resolution=merge-duplicates,return=minimal");
    assert.deepEqual(JSON.parse(calls[0].init.body).dedupe_keys, ["https://a.com/y"]);
  });

  it("reads only item columns with a bounded limit", async () => {
    mockFetch(() => ({ body: [{ object_id: "o1", item: { id: "o1" }, created_at: "2026-01-01" }] }));
    const rows = await readCaptures({ userId }, { limit: 9999 });
    assert.match(calls[0].url, /select=object_id,item,created_at/);
    assert.match(calls[0].url, /limit=500/);
    assert.equal(rows[0].item.id, "o1");
  });
});

describe("collection sync", () => {
  afterEach(() => { globalThis.fetch = realFetch; });
  beforeEach(() => { process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"; });

  it("upserts a user collection in a single request", async () => {
    mockFetch(() => ({ status: 201, body: [{ id: "r1", client_key: "c1", name: "Moodboard", system: false }] }));
    const col = await upsertExtensionCollection({ userId }, { id: "c1", name: "Moodboard" });
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /on_conflict=user_id,client_key/);
    assert.deepEqual(col, { id: "c1", name: "Moodboard", system: false });
  });

  it("reads user and extension collections in parallel and de-duplicates", async () => {
    mockFetch(url => ({
      body: url.includes("vault_collections")
        ? [{ id: "r1", client_key: "c1", name: "A", system: false }]
        : [{ client_key: "c1", name: "A-old" }, { client_key: "c2", name: "B" }],
    }));
    const cols = await readExtensionCollections({ userId });
    assert.equal(calls.length, 2);
    assert.deepEqual(cols.map(c => c.name), ["A", "B"]);
  });
});

describe("route wrapper", () => {
  beforeEach(() => resetRateLimits());

  const handler = createHandler({
    methods: ["POST"],
    limit: { name: "t", limit: 2, windowMs: 60_000 },
    handle: async () => ({ success: true }),
  });

  it("answers preflight, rejects wrong methods and missing tokens", async () => {
    const pre = fakeRes();
    await handler(fakeReq({ method: "OPTIONS" }), pre);
    assert.equal(pre.statusCode, 204);
    assert.equal(pre.headers["access-control-allow-origin"], "*");

    const wrong = fakeRes();
    await handler(fakeReq({ method: "GET" }), wrong);
    assert.equal(wrong.statusCode, 405);

    const anon = fakeRes();
    await handler(fakeReq({ method: "POST" }), anon);
    assert.equal(anon.statusCode, 401);
  });

  it("rate limits per token with Retry-After", async () => {
    const statuses = [];
    for (let i = 0; i < 3; i++) {
      const res = fakeRes();
      await handler(fakeReq({ method: "POST", headers: { authorization: "Bearer vault-abc" } }), res);
      statuses.push(res.statusCode);
      if (res.statusCode === 429) assert.ok(Number(res.headers["retry-after"]) > 0);
    }
    assert.deepEqual(statuses, [200, 200, 429]);
  });

  it("rateLimit throws 429 once the window is exhausted", () => {
    rateLimit("k", { limit: 1, windowMs: 1000 });
    assert.throws(() => rateLimit("k", { limit: 1, windowMs: 1000 }), err => err.status === 429);
  });
});

describe("discover edge query", () => {
  it("forces published rows, clamps limit and drops unknown params", () => {
    const q = new URLSearchParams(discoverUpstreamQuery("?select=id,title&status=eq.rejected&limit=99999&evil=1"));
    assert.equal(q.get("status"), "eq.published");
    assert.equal(q.get("limit"), "300");
    assert.equal(q.get("evil"), null);
  });

  it("rejects columns outside the allowlist", () => {
    assert.throws(() => discoverUpstreamQuery("?select=id,reject_reason"), err => err.status === 400);
  });
});
