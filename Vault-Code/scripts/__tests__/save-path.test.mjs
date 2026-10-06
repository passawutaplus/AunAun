import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildVaultItem, sanitizeKeptFor } from "../../lib/vault-capture-core.mjs";
import { enrichItem, fireEnrich } from "../../lib/engine/enrich.mjs";
import { hasGpsExif, stripImageMetadata } from "../../lib/image-sanitize.mjs";
import { probeImageSize } from "../../lib/import/image-probe.mjs";

/** JPEG with an EXIF block that has a GPS IFD pointer (0x8825) and orientation 6, then SOF0 640x480. */
function jpegWithGps() {
  const tiff = Buffer.from([
    0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8,
    0, 2,
    0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, // orientation = 6
    0x88, 0x25, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0x30, // GPS pointer
    0, 0, 0, 0,
  ]);
  const exif = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 255]), exif]);
  const sof = Buffer.from([0xff, 0xc0, 0, 11, 8, 0x01, 0xe0, 0x02, 0x80, 1, 1, 0x11, 0]);
  const sos = Buffer.from([0xff, 0xda, 0, 2, 1, 2, 3, 0xff, 0xd9]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, sof, sos]);
}

describe("image metadata stripping", () => {
  it("removes the GPS block from a JPEG but keeps the image and orientation", () => {
    const input = jpegWithGps();
    assert.equal(hasGpsExif(input), true);
    const out = Buffer.from(stripImageMetadata(input));
    assert.equal(hasGpsExif(out), false);
    assert.deepEqual(probeImageSize(out), { width: 640, height: 480, type: "jpeg" });
    assert.ok(out.includes(Buffer.from("Exif\0\0", "latin1")), "orientation-only EXIF is kept");
    assert.ok(out.length < input.length);
  });

  it("drops PNG text/exif chunks and leaves other bytes alone", () => {
    const chunk = (type, data) => {
      const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
      return Buffer.concat([len, Buffer.from(type), data, Buffer.alloc(4)]);
    };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(5, 0); ihdr.writeUInt32BE(7, 4);
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("eXIf", Buffer.from("GPS")), chunk("tEXt", Buffer.from("k\0v")), chunk("IEND", Buffer.alloc(0))]);
    const out = Buffer.from(stripImageMetadata(png));
    assert.equal(out.includes(Buffer.from("eXIf")), false);
    assert.equal(out.includes(Buffer.from("tEXt")), false);
    assert.deepEqual(probeImageSize(out), { width: 5, height: 7, type: "png" });
  });

  it("returns unknown formats unchanged", () => {
    const junk = Buffer.from("not an image at all");
    assert.deepEqual(Buffer.from(stripImageMetadata(junk)), junk);
  });
});

describe("buildVaultItem (single save path)", () => {
  const item = buildVaultItem({ type: "link", sourceUrl: "https://www.example.com/post", quickKeywords: "coral, minimal" });

  it("never invents colors or OCR text", () => {
    assert.deepEqual(item.analysis.colors, []);
    assert.equal(item.analysis.tagSource, "rule");
    assert.equal(item.analysis.enrichLevel, 0);
    assert.doesNotMatch(JSON.stringify(item.analysis), /placeholder|metadata preview|extension capture/i);
  });

  it("adds provenance fields, private and unknown-rights by default", () => {
    assert.equal(item.visibility, "private");
    assert.equal(item.licenseStatus, "unknown");
    assert.equal(item.itemType, "webpage");
    assert.equal(item.sourceDomain, "example.com");
    assert.equal(item.importStatus, "partial"); // link with no image
    assert.equal(item.rightsConfirmedAt, null);
  });

  it("records the rights confirmation for uploads", () => {
    const up = buildVaultItem({ type: "image", assetUrl: "https://x.example/a.jpg", rightsConfirmed: true, imageWidth: 800, imageHeight: 600, captureContext: { method: "web_upload" } });
    assert.ok(up.rightsConfirmedAt > 0);
    assert.equal(up.itemType, "upload");
    assert.equal(up.imageWidth, 800);
  });
});

describe("enrich seam", () => {
  it("never throws, even when storage is not configured", async () => {
    const r = await enrichItem("abc", { userId: "u" }, { loadItem: async () => null, saveItem: async () => {} });
    assert.equal(r.status, "skipped");
    assert.equal((await enrichItem("abc", null, { loadItem: async () => { throw new Error("db down"); } })).status, "failed");
    await assert.doesNotReject(fireEnrich("abc", null));
  });
});

describe("keptFor on captures", () => {
  it("keeps known reasons, one short line and a project id; drops everything else", () => {
    const raw = { reasons: ["Color", "color", "bogus", "mood"], text: "x".repeat(200), projectId: "p1", extra: "no" };
    const out = sanitizeKeptFor(raw);
    assert.deepEqual(out.reasons, ["color", "mood"]);
    assert.equal(out.text.length, 80);
    assert.equal(out.projectId, "p1");
    assert.equal("extra" in out, false);
    assert.equal(sanitizeKeptFor({ reasons: ["bogus"] }), null);
    assert.equal(sanitizeKeptFor("nope"), null);
  });

  it("is stored on the item's capture context", () => {
    const item = buildVaultItem({ type: "image", assetUrl: "https://x.example/a.jpg", captureContext: { keptFor: { reasons: ["layout"], text: "hero grid" } } });
    assert.deepEqual(item.captureContext.keptFor, { reasons: ["layout"], text: "hero grid", projectId: "" });
  });
});
