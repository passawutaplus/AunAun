import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { isBlockedIp, parsePublicUrl, validateUrl } from "../../lib/import/ssrf.mjs";
import { safeFetch } from "../../lib/import/safe-fetch.mjs";
import { extractMetadata } from "../../lib/import/extract.mjs";
import { probeImageSize } from "../../lib/import/image-probe.mjs";
import { importUrl } from "../../lib/import/index.mjs";

const PUBLIC = [{ address: "93.184.216.34", family: 4 }];
const publicLookup = async () => PUBLIC;

/** Fake transport: routes[url] = { status, headers, body } */
function fakeTransport(routes) {
  return async url => {
    const r = routes[url.href];
    if (!r) throw new Error("no route " + url.href);
    const stream = Readable.from([Buffer.from(r.body ?? "")]);
    return { status: r.status ?? 200, headers: r.headers ?? { "content-type": "text/html" }, stream, destroy: () => stream.destroy() };
  };
}

describe("ssrf validator", () => {
  it("blocks private, reserved and mapped addresses", () => {
    for (const ip of ["127.0.0.1", "10.0.0.1", "172.20.1.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fc00::1", "fd12::1", "fe80::1", "::ffff:10.0.0.1", "::ffff:7f00:1", "64:ff9b::a00:1", "2002:7f00:1::1"]) {
      assert.equal(isBlockedIp(ip), true, ip);
    }
    for (const ip of ["93.184.216.34", "8.8.8.8", "2606:2800:220:1:248:1893:25c8:1946"]) assert.equal(isBlockedIp(ip), false, ip);
  });

  it("rejects bad schemes, credentials, ports and local hostnames", () => {
    for (const u of ["file:///etc/passwd", "data:text/html,x", "javascript:alert(1)", "ftp://example.com", "https://u:p@example.com", "https://example.com:8443", "http://localhost/x", "http://a.local/", "http://x.internal/", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "http://0x7f.1/"]) {
      assert.throws(() => parsePublicUrl(u), e => ["INVALID_URL", "UNSAFE_URL"].includes(e.code), u);
    }
    assert.throws(() => parsePublicUrl("not a url"), e => e.code === "INVALID_URL");
    assert.doesNotThrow(() => parsePublicUrl("https://example.com/a?b=1"));
  });

  it("rejects hosts whose DNS resolves to any private IP", async () => {
    await assert.rejects(validateUrl("https://evil.example", async () => [{ address: "10.0.0.7" }]), e => e.code === "UNSAFE_URL");
    await assert.rejects(validateUrl("https://evil.example", async () => [...PUBLIC, { address: "169.254.169.254" }]), e => e.code === "UNSAFE_URL");
  });
});

describe("safeFetch", () => {
  const opts = routes => ({ lookup: publicLookup, requestImpl: fakeTransport(routes) });

  it("follows a redirect and returns the final url", async () => {
    const res = await safeFetch("https://a.example/", opts({ "https://a.example/": { status: 301, headers: { location: "/b" } }, "https://a.example/b": { body: "<html></html>" } }));
    assert.equal(res.finalUrl, "https://a.example/b");
    assert.equal(res.body.toString(), "<html></html>");
  });

  it("rejects a redirect to a private IP and a DNS answer that turns private", async () => {
    await assert.rejects(safeFetch("https://a.example/", opts({ "https://a.example/": { status: 302, headers: { location: "http://169.254.169.254/" } } })), e => e.code === "UNSAFE_URL");
    const lookup = async host => (host === "evil.example" ? [{ address: "10.0.0.9" }] : PUBLIC);
    await assert.rejects(safeFetch("https://a.example/", { lookup, requestImpl: fakeTransport({ "https://a.example/": { status: 302, headers: { location: "https://evil.example/x" } } }) }), e => e.code === "UNSAFE_URL");
  });

  it("stops after 5 redirects", async () => {
    const routes = {};
    for (let i = 0; i < 8; i++) routes[`https://a.example/${i || ""}`] = { status: 302, headers: { location: `/${i + 1}` } };
    await assert.rejects(safeFetch("https://a.example/", opts(routes)), e => e.code === "FETCH_FAILED");
  });

  it("caps the body and skips unwanted content types", async () => {
    const big = "x".repeat(5000);
    const capped = await safeFetch("https://a.example/", { ...opts({ "https://a.example/": { body: big } }), maxBytes: 1000 });
    assert.equal(capped.body.length, 1000);
    assert.equal(capped.truncated, true);
    const pdf = await safeFetch("https://a.example/", { ...opts({ "https://a.example/": { headers: { "content-type": "application/pdf" }, body: "%PDF" } }), accept: t => t === "text/html" });
    assert.equal(pdf.body, null);
    assert.equal(pdf.rejected, true);
  });
});

describe("extractMetadata", () => {
  const base = "https://site.example/blog/post";
  it("reads Open Graph with relative urls", () => {
    const m = extractMetadata('<head><title>T</title><meta property="og:title" content="OG &amp; Co"><meta property="og:image" content="/img/a.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:site_name" content="Site"><link rel="canonical" href="/blog/post-canonical"><link rel="icon" href="/f.png"></head>', base);
    assert.equal(m.title, "OG & Co");
    assert.equal(m.image, "https://site.example/img/a.jpg");
    assert.equal(m.imageWidth, 1200);
    assert.equal(m.canonical, "https://site.example/blog/post-canonical");
    assert.equal(m.favicon, "https://site.example/f.png");
  });
  it("falls back to twitter tags", () => {
    const m = extractMetadata('<meta name="twitter:title" content="TW"><meta name="twitter:image" content="https://cdn.example/t.png">', base);
    assert.equal(m.title, "TW");
    assert.equal(m.image, "https://cdn.example/t.png");
    assert.equal(m.imageWidth, null);
  });
  it("reads JSON-LD images", () => {
    const m = extractMetadata('<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","image":["/ld.jpg"]}</script>', base);
    assert.equal(m.image, "https://site.example/ld.jpg");
  });
  it("uses a lazy-loaded img and skips tiny/icon images", () => {
    const m = extractMetadata('<img src="/logo.png"><img src="data:image/gif;base64,AAA" width="1" height="1"><img data-src="/real.jpg" srcset="/s.jpg 400w, /l.jpg 1600w">', base);
    assert.equal(m.image, "https://site.example/l.jpg");
  });
  it("returns no image when none exists, and never invents dimensions", () => {
    const m = extractMetadata("<html><title>x</title><p>text</p></html>", base);
    assert.ok(!m.image);
    assert.ok(!m.imageWidth);
  });
});

describe("probeImageSize", () => {
  it("reads PNG and GIF headers", () => {
    const png = Buffer.alloc(24); Buffer.from([0x89, 0x50, 0x4e, 0x47]).copy(png); png.writeUInt32BE(640, 16); png.writeUInt32BE(480, 20);
    assert.deepEqual(probeImageSize(png), { width: 640, height: 480, type: "png" });
    const gif = Buffer.alloc(12); gif.write("GIF89a"); gif.writeUInt16LE(30, 6); gif.writeUInt16LE(20, 8);
    assert.deepEqual(probeImageSize(gif), { width: 30, height: 20, type: "gif" });
  });
  it("reads a JPEG SOF0 marker", () => {
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0, 0, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x03, 0, 0, 0]);
    assert.deepEqual(probeImageSize(jpg), { width: 640, height: 480, type: "jpeg" });
  });
  it("returns null for junk", () => assert.equal(probeImageSize(Buffer.from("hello world, not an image")), null));
});

describe("importUrl", () => {
  const opts = routes => ({ lookup: publicLookup, requestImpl: fakeTransport(routes) });
  it("returns metadata for a page", async () => {
    const html = '<title>Hi</title><meta property="og:image" content="/i.jpg"><meta property="og:image:width" content="800"><meta property="og:image:height" content="600">';
    const d = await importUrl("https://www.site.example/p", opts({ "https://www.site.example/p": { body: html } }));
    assert.equal(d.contentType, "webpage");
    assert.equal(d.title, "Hi");
    assert.equal(d.imageUrl, "https://www.site.example/i.jpg");
    assert.equal(d.imageWidth, 800);
    assert.equal(d.domain, "site.example");
  });
  it("treats a direct image url as contentType image with dimensions", async () => {
    const png = Buffer.alloc(24); Buffer.from([0x89, 0x50, 0x4e, 0x47]).copy(png); png.writeUInt32BE(10, 16); png.writeUInt32BE(20, 20);
    const d = await importUrl("https://img.example/a.png", opts({ "https://img.example/a.png": { headers: { "content-type": "image/png" }, body: png } }));
    assert.equal(d.contentType, "image");
    assert.deepEqual([d.imageWidth, d.imageHeight], [10, 20]);
  });
  it("degrades to a link-only result on 403 or unsupported types, but throws for unsafe urls", async () => {
    const blocked = await importUrl("https://x.example/", opts({ "https://x.example/": { status: 403 } }));
    assert.equal(blocked.imageUrl, null);
    assert.equal(blocked.title, "x.example");
    await assert.rejects(importUrl("http://169.254.169.254/", opts({})), e => e.code === "UNSAFE_URL");
    await assert.rejects(importUrl("javascript:alert(1)", opts({})), e => e.code === "INVALID_URL");
    await assert.rejects(importUrl("https://x.example/", { lookup: async () => [{ address: "10.0.0.1" }], requestImpl: fakeTransport({}) }), e => e.code === "UNSAFE_URL");
  });
});
