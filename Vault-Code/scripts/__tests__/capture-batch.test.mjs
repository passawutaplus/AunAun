import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { resetRateLimits } from "../../lib/rate-limit.mjs";
import { buildVaultItem, sanitizeCredit } from "../../lib/vault-capture-core.mjs";

process.env.VAULT_EXTENSION_TOKEN_SECRET = "test-secret-for-signed-extension-tokens";
const { signVaultToken } = await import("../../lib/vault-api-auth.mjs");
const batch = (await import("../../api/vault/capture-batch.js")).default;
const del = (await import("../../api/vault/captures/[id].js")).default;

const userId = "11111111-1111-4111-8111-111111111111";
const token = signVaultToken(userId);
const realFetch = globalThis.fetch;
let calls;

const fakeRes = () => { const headers = {}; return { statusCode: 200, body: "", writableEnded: false, headers, setHeader(k, v) { headers[k.toLowerCase()] = v; }, getHeader(k) { return headers[k.toLowerCase()]; }, end(c = "") { this.body = String(c); this.writableEnded = true; } }; };
const fakeReq = (url, { method = "POST", body, query } = {}) => Object.assign(Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]), { method, url, query, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, socket: { remoteAddress: "10.0.0.7" } });

function mockFetch(responder) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || "GET" });
    const { status = 200, body = [] } = responder(String(url), init) || {};
    return new Response(body === null ? "" : JSON.stringify(body), { status });
  };
}

describe("credit sanitising", () => {
  it("keeps only data, https urls and short strings; null when nothing useful", () => {
    const c = sanitizeCredit({ creators: ["Jane Doe", "x".repeat(300)], siteName: "Site", licenseUrl: "javascript:alert(1)", pageUrl: "https://a.example/p", licenseText: "CC BY 4.0" });
    assert.equal(c.licenseUrl, "");
    assert.equal(c.pageUrl, "https://a.example/p");
    assert.equal(c.creators[1].length, 120);
    assert.equal(sanitizeCredit({}), null);
    assert.equal(sanitizeCredit("x"), null);
  });
  it("stored with the item and summarised as creditText, never as a granted licence", () => {
    const item = buildVaultItem({ type: "image", assetUrl: "https://x.example/a.jpg", captureContext: { credit: { creators: ["Jane"], siteName: "Behance-like", licenseText: "CC BY" } } });
    assert.equal(item.captureContext.credit.creators[0], "Jane");
    assert.match(item.creditText, /by Jane/);
    assert.equal(item.licenseStatus, "unknown");
    assert.equal(item.visibility, "private");
  });
});

describe("POST /api/vault/capture-batch", () => {
  beforeEach(() => { resetRateLimits(); process.env.SUPABASE_SERVICE_ROLE_KEY = "svc"; });
  afterEach(() => { globalThis.fetch = realFetch; });
  const post = body => { const res = fakeRes(); return batch(fakeReq("/api/vault/capture-batch", { body }), res).then(() => ({ res, json: JSON.parse(res.body) })); };

  it("keeps new items, skips duplicates, reports invalid ones, in one request", async () => {
    mockFetch(url => {
      if (url.includes("dedupe_keys")) return { body: url.includes(encodeURIComponent("https://dup.example/b.jpg")) ? [{ object_id: "olddup1" }] : [] };
      return { body: null };
    });
    const { res, json } = await post({ collectionId: "col1", items: [
      { type: "image", assetUrl: "https://ok.example/a.jpg", sourceUrl: "https://ok.example/page" },
      { type: "image", assetUrl: "https://dup.example/b.jpg" },
      { type: "image", assetUrl: "data:image/png;base64,AAAA" },
    ] });
    assert.equal(res.statusCode, 200);
    assert.deepEqual([json.kept, json.duplicates, json.failed], [1, 1, 1]);
    assert.deepEqual(json.results.map(r => r.status), ["kept", "duplicate", "failed"]);
    assert.equal(calls.filter(c => c.method === "POST" && c.url.includes("/vault_extension_captures")).length, 1);
  });

  it("rejects empty batches and batches over BATCH_MAX with the right status", async () => {
    mockFetch(() => ({ body: [] }));
    assert.equal((await post({ items: [] })).res.statusCode, 400);
    const many = Array.from({ length: 21 }, (_, i) => ({ assetUrl: `https://x.example/${i}.jpg` }));
    assert.equal((await post({ items: many })).res.statusCode, 413);
  });

  it("one item failing in storage does not stop the others", async () => {
    let n = 0;
    mockFetch(url => {
      if (url.includes("dedupe_keys")) return { body: [] };
      if (++n === 1) return { status: 500, body: { message: "boom" } };
      return { body: null };
    });
    const { json } = await post({ items: [{ assetUrl: "https://x.example/1.jpg" }, { assetUrl: "https://x.example/2.jpg" }] });
    assert.deepEqual(json.results.map(r => r.status), ["failed", "kept"]);
  });
});

describe("DELETE /api/vault/captures/:id (Undo)", () => {
  beforeEach(() => { resetRateLimits(); process.env.SUPABASE_SERVICE_ROLE_KEY = "svc"; });
  afterEach(() => { globalThis.fetch = realFetch; });

  it("deletes only within the caller's scope and 404s when nothing matched", async () => {
    mockFetch(() => ({ body: [{ object_id: "abc123", item: {} }] }));
    const ok = fakeRes();
    await del(fakeReq("/api/vault/captures/abc123", { method: "DELETE", query: { id: "abc123" } }), ok);
    assert.equal(ok.statusCode, 200);
    const del1 = calls.find(c => c.method === "DELETE");
    assert.match(decodeURIComponent(del1.url), /object_id=eq\.abc123&bearer_hash=eq\./);
    mockFetch(() => ({ body: [] }));
    const none = fakeRes();
    await del(fakeReq("/api/vault/captures/zzz999", { method: "DELETE", query: { id: "zzz999" } }), none);
    assert.equal(none.statusCode, 404);
  });

  it("rejects malformed ids before touching the database", async () => {
    mockFetch(() => ({ body: [] }));
    const res = fakeRes();
    await del(fakeReq("/api/vault/captures/..%2Fx", { method: "DELETE", query: { id: "../x" } }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
  });
});
