import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertPublicUrl, fetchLinkPreview, isBlockedIp, parsePreview } from "../../lib/vault-link-preview.mjs";

const publicLookup = async () => [{ address: "93.184.216.34" }];

describe("link preview safety", () => {
  it("blocks private, loopback and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.16.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "::ffff:10.0.0.1"]) {
      assert.equal(isBlockedIp(ip), true, ip);
    }
    assert.equal(isBlockedIp("93.184.216.34"), false);
  });

  it("rejects bad schemes, credentials, ports, localhost and hosts resolving to private IPs", async () => {
    const bad = ["file:///etc/passwd", "ftp://example.com", "https://user:pw@example.com", "https://example.com:8080", "http://localhost/x", "http://127.0.0.1/x", "not a url"];
    for (const url of bad) await assert.rejects(() => assertPublicUrl(url, publicLookup), url);
    await assert.rejects(() => assertPublicUrl("https://evil.example", async () => [{ address: "10.0.0.7" }]));
    await assert.rejects(() => assertPublicUrl("https://evil.example", async () => [{ address: "93.184.216.34" }, { address: "169.254.169.254" }]));
    await assert.doesNotReject(() => assertPublicUrl("https://example.com/a", publicLookup));
  });

  it("re-checks every redirect hop", async () => {
    const lookup = async host => [{ address: host === "internal.example" ? "10.0.0.9" : "93.184.216.34" }];
    const fetchImpl = async () => new Response(null, { status: 302, headers: { location: "http://internal.example/admin" } });
    await assert.rejects(() => fetchLinkPreview("https://example.com", { fetchImpl, lookup }), /not allowed/);
  });
});

describe("link preview parsing", () => {
  const html = `<html><head><title>Fallback</title>
    <meta property="og:title" content="Poster &amp; Type">
    <meta property="og:site_name" content="Behance">
    <meta property="og:image" content="/cover.jpg">
    <meta name="description" content="A study"></head></html>`;

  it("reads og tags and resolves a relative image over https", () => {
    const p = parsePreview(html, "https://example.com/work/1");
    assert.equal(p.title, "Poster & Type");
    assert.equal(p.siteName, "Behance");
    assert.equal(p.image, "https://example.com/cover.jpg");
    assert.equal(p.description, "A study");
  });

  it("drops non-https images and falls back to <title>", () => {
    const p = parsePreview('<title>Only title</title><meta property="og:image" content="http://x.test/a.jpg">', "https://example.com");
    assert.equal(p.title, "Only title");
    assert.equal(p.image, "");
  });

  it("fetches and parses a page end to end", async () => {
    const fetchImpl = async () => new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    const out = await fetchLinkPreview("https://example.com/work/1", { fetchImpl, lookup: publicLookup });
    assert.equal(out.title, "Poster & Type");
    assert.equal(out.image, "https://example.com/cover.jpg");
  });
});
