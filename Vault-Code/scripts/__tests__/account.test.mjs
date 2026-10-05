import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { resetRateLimits } from "../../lib/rate-limit.mjs";
import { createZip, listZipNames } from "../../lib/zip.mjs";

process.env.VAULT_EXTENSION_TOKEN_SECRET = "test-secret-for-signed-extension-tokens";
const { signVaultToken } = await import("../../lib/vault-api-auth.mjs");
const exportApi = (await import("../../lib/routes/account-export.mjs")).default;
const deleteApi = (await import("../../lib/routes/account-delete.mjs")).default;
const privacyApi = (await import("../../lib/routes/privacy-request.mjs")).default;

const userId = "22222222-2222-4222-8222-222222222222";
// A 3-part string is treated as a Supabase JWT: the auth server mock below accepts it.
const jwt = ["aaa", Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"), "ccc"].join(".");
const realFetch = globalThis.fetch;
let calls;

const fakeRes = () => { const headers = {}; return { statusCode: 200, body: "", writableEnded: false, headers, setHeader(k, v) { headers[k.toLowerCase()] = v; }, getHeader(k) { return headers[k.toLowerCase()]; }, end(c = "") { this.body = String(c); this.writableEnded = true; } }; };
const fakeReq = (url, { body, token = jwt } = {}) => Object.assign(Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]), { method: "POST", url, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" }, socket: { remoteAddress: "10.0.0.5" } });

function mockSupabase(overrides = {}) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url), method = init.method || "GET";
    calls.push({ url: u, method, body: init.body });
    const json = (body, status = 200) => new Response(body === null ? "" : JSON.stringify(body), { status });
    if (u.includes("/auth/v1/user")) return json({ id: userId, email: "u@example.com" });
    if (overrides.handler) { const r = overrides.handler(u, method, init); if (r) return r; }
    if (u.includes("/storage/v1/object/list/")) {
      const prefix = JSON.parse(init.body).prefix;
      if (prefix === userId) return json([{ name: "extension-captures", id: null, metadata: null }, { name: "a.png", id: "1", metadata: { size: 3 } }]);
      if (prefix === `${userId}/extension-captures`) return json([{ name: "b.jpg", id: "2", metadata: { size: 3 } }]);
      return json([]);
    }
    if (u.includes("/storage/v1/object/sign/")) return json({ signedURL: `/object/sign/x?token=t` });
    if (u.includes("/storage/v1/object/vault-assets/") && method === "POST") return json({ Key: "ok" });
    if (u.includes("/object/sign/x")) return new Response(Buffer.from("abc"), { status: 200 });
    if (u.includes("/rest/v1/")) return json(method === "DELETE" ? [{ id: 1 }] : [{ id: "row1", user_id: userId }]);
    return json({});
  };
}

describe("zip", () => {
  it("writes a readable archive with the given names", () => {
    const zip = createZip([{ name: "a/b.txt", data: "hello" }, { name: "c.json", data: Buffer.from("{}") }]);
    assert.deepEqual(listZipNames(zip), ["a/b.txt", "c.json"]);
    assert.equal(zip.readUInt32LE(0), 0x04034b50);
  });
});

describe("account export", () => {
  beforeEach(() => { resetRateLimits(); process.env.SUPABASE_SERVICE_ROLE_KEY = "svc"; });
  afterEach(() => { globalThis.fetch = realFetch; });

  it("needs a real login session: the extension token cannot export an account", async () => {
    mockSupabase();
    const res = fakeRes();
    await exportApi(fakeReq("/api/account/export", { token: signVaultToken(userId) }), res);
    assert.equal(res.statusCode, 401);
    assert.equal(calls.filter(c => c.url.includes("/rest/v1/")).length, 0);
  });

  it("builds a zip with every table and the user's files, stores it in their own folder and returns a signed link", async () => {
    mockSupabase();
    const res = fakeRes();
    await exportApi(fakeReq("/api/account/export"), res);
    const body = JSON.parse(res.body);
    assert.equal(res.statusCode, 200);
    assert.match(body.url, /\/storage\/v1\/object\/sign\/x/);
    assert.equal(body.files, 2);
    const upload = calls.find(c => c.method === "POST" && c.url.includes(`/storage/v1/object/vault-assets/${userId}/exports/`));
    assert.ok(upload, "zip is uploaded under the user's own folder");
    const names = listZipNames(Buffer.from(upload.body));
    for (const n of ["README.txt", "data/vault_items.json", "data/consent_events.json", "files/a.png", "files/extension-captures/b.jpg"]) assert.ok(names.includes(n), n);
    assert.ok(calls.filter(c => c.url.includes("/rest/v1/")).every(c => c.url.includes(`user_id=eq.${userId}`)), "every read is scoped to this user");
  });
});

describe("account deletion", () => {
  beforeEach(() => { resetRateLimits(); process.env.SUPABASE_SERVICE_ROLE_KEY = "svc"; });
  afterEach(() => { globalThis.fetch = realFetch; });

  it("requires the exact confirmation text and a real session", async () => {
    mockSupabase();
    const wrong = fakeRes();
    await deleteApi(fakeReq("/api/account/delete", { body: { confirm: "yes" } }), wrong);
    assert.equal(wrong.statusCode, 400);
    assert.equal(calls.filter(c => c.method === "DELETE").length, 0);
    const ext = fakeRes();
    await deleteApi(fakeReq("/api/account/delete", { body: { confirm: "DELETE MY VAULT DATA" }, token: signVaultToken(userId) }), ext);
    assert.equal(ext.statusCode, 401);
  });

  it("deletes files and rows scoped to the user, never the auth user, and logs the request", async () => {
    mockSupabase();
    const res = fakeRes();
    await deleteApi(fakeReq("/api/account/delete", { body: { confirm: "DELETE MY VAULT DATA" } }), res);
    const body = JSON.parse(res.body);
    assert.equal(res.statusCode, 200);
    assert.equal(body.deleted.files, 2);
    const deletes = calls.filter(c => c.method === "DELETE");
    assert.ok(deletes.some(c => c.url.includes("/storage/v1/object/vault-assets")));
    for (const t of ["vault_items", "vault_collections", "vault_projects", "vault_boards", "vault_extension_captures"]) assert.ok(deletes.some(c => c.url.includes(`/rest/v1/${t}?user_id=eq.${userId}`)), t);
    assert.ok(!calls.some(c => c.url.includes("/auth/v1/admin")), "the shared login is untouched");
    assert.ok(calls.some(c => c.method === "POST" && c.url.includes("/rest/v1/dsar_requests")), "the request is recorded");
    assert.ok(!deletes.some(c => /consent_events|dsar_requests/.test(c.url)), "consent and request records are kept");
  });
});

describe("privacy request form", () => {
  beforeEach(() => { resetRateLimits(); process.env.SUPABASE_SERVICE_ROLE_KEY = "svc"; });
  afterEach(() => { globalThis.fetch = realFetch; });

  it("validates type and (for anonymous visitors) an email, then stores a row", async () => {
    mockSupabase();
    const bad = fakeRes();
    await privacyApi(fakeReq("/api/privacy-request", { body: { type: "hack" }, token: null }), bad);
    assert.equal(bad.statusCode, 400);
    const noMail = fakeRes();
    await privacyApi(fakeReq("/api/privacy-request", { body: { type: "access" }, token: null }), noMail);
    assert.equal(noMail.statusCode, 400);
    const ok = fakeRes();
    await privacyApi(fakeReq("/api/privacy-request", { body: { type: "access", email: "a@b.co", details: "please" }, token: null }), ok);
    assert.equal(ok.statusCode, 200);
    assert.ok(calls.some(c => c.method === "POST" && c.url.includes("/rest/v1/dsar_requests")));
  });
});
