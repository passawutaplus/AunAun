import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import root from "../../api/[...path].js";
import vault from "../../api/vault/[...path].js";

const fakeRes = () => ({ statusCode: 200, body: "", headers: {}, writableEnded: false, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, getHeader(k) { return this.headers[k.toLowerCase()]; }, end(c = "") { this.body = String(c); this.writableEnded = true; } });
const req = (url, method = "GET") => Object.assign(Readable.from([]), { method, url, headers: { "user-agent": "Mozilla/5.0" }, socket: { remoteAddress: "10.2.2.2" } });

function countFunctions(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) n += countFunctions(full);
    else if (/\.(js|mjs|ts)$/.test(name) && !name.startsWith("_")) n++;
  }
  return n;
}

describe("api routing (Hobby plan allows 12 serverless functions)", () => {
  it("api/ holds at most 12 function files", () => {
    assert.ok(countFunctions("api") <= 12, `found ${countFunctions("api")}`);
  });
  it("dispatches to the right handler by path and method", async () => {
    const a = fakeRes();
    await root(req("/api/discover?select=id", "POST"), a);
    assert.equal(a.statusCode, 405, "discover only allows GET");
    const b = fakeRes();
    await vault(req("/api/vault/health", "GET"), b);
    assert.notEqual(b.statusCode, 404);
    const c = fakeRes();
    await vault(req("/api/vault/capture", "GET"), c);
    assert.equal(c.statusCode, 405, "capture only allows POST");
  });
  it("unknown routes are a 404 JSON, never a crash", async () => {
    for (const [fn, url] of [[root, "/api/nope"], [vault, "/api/vault/nope"]]) {
      const res = fakeRes();
      await fn(req(url), res);
      assert.equal(res.statusCode, 404);
      assert.equal(JSON.parse(res.body).success, false);
    }
  });
  it("similar and captures/:id get their id from the path", async () => {
    const res = fakeRes();
    await root(req("/api/similar/not-a-uuid"), res);
    assert.equal(res.statusCode, 404);
    const del = fakeRes();
    await vault(req("/api/vault/captures/abc123", "GET"), del);
    assert.equal(del.statusCode, 405, "captures/:id only allows DELETE");
  });
});
