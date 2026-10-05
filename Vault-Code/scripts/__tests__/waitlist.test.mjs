import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { resetRateLimits } from "../../lib/rate-limit.mjs";
import waitlist from "../../lib/routes/waitlist.mjs";

const realFetch = globalThis.fetch;
let calls;
const fakeRes = () => { const headers = {}; return { statusCode: 200, body: "", writableEnded: false, headers, setHeader(k, v) { headers[k.toLowerCase()] = v; }, getHeader(k) { return headers[k.toLowerCase()]; }, end(c = "") { this.body = String(c); this.writableEnded = true; } }; };
const fakeReq = body => Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), { method: "POST", url: "/api/waitlist", headers: { "content-type": "application/json" }, socket: { remoteAddress: "10.0.0.9" } });

describe("POST /api/waitlist", () => {
  beforeEach(() => { resetRateLimits(); process.env.SUPABASE_SERVICE_ROLE_KEY = "svc"; calls = []; globalThis.fetch = async (url, init = {}) => { calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null, prefer: init.headers?.prefer || init.headers?.Prefer }); return new Response("", { status: 201 }); }; });
  afterEach(() => { globalThis.fetch = realFetch; });

  it("stores a lower-cased email once with consent and a known source", async () => {
    const res = fakeRes();
    await waitlist(fakeReq({ email: "  Designer@Example.COM ", consent: true, source: "welcome-hero" }), res);
    assert.equal(res.statusCode, 200);
    const c = calls.find(x => x.url.includes("/rest/v1/vault_waitlist"));
    assert.deepEqual(c.body, { email: "designer@example.com", source: "welcome-hero", consent: true });
    assert.match(c.url, /on_conflict=email/);
    assert.match(String(c.prefer), /ignore-duplicates/);
  });
  it("rejects bad emails and missing consent before touching the database", async () => {
    for (const body of [{ email: "nope", consent: true }, { email: "a@b.co" }, { email: "a@b.co", consent: "yes" }]) {
      const res = fakeRes();
      await waitlist(fakeReq(body), res);
      assert.equal(res.statusCode, 400);
    }
    assert.equal(calls.length, 0);
  });
  it("falls back to the generic source for unknown values", async () => {
    const res = fakeRes();
    await waitlist(fakeReq({ email: "a@b.co", consent: true, source: "<script>" }), res);
    assert.equal(calls.find(x => x.url.includes("vault_waitlist")).body.source, "welcome");
  });
});
