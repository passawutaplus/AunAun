import assert from "node:assert/strict";
import { test } from "node:test";
import { isUsableOvImage, normalizeOvImage, type OvImage } from "./ov";

const img: OvImage = {
  id: "abc-123",
  title: "Poster for a Ball",
  url: "https://example.org/full.jpg",
  foreign_landing_url: "https://example.org/object/1",
  creator: "Jane Doe",
  license: "cc0",
  source: "smk",
  provider: "smk",
  width: 2000,
  height: 3000,
};

test("cc0 image normalizes with source link and credit", () => {
  assert.ok(isUsableOvImage(img));
  const c = normalizeOvImage(img);
  assert.equal(c.source, "ov");
  assert.equal(c.license, "cc0");
  assert.equal(c.sourceUrl, "https://example.org/object/1");
  assert.equal(c.attribution, "Poster for a Ball, Jane Doe, via smk (Openverse).");
});

test("non-cc0, mature, or http-only image is skipped", () => {
  assert.equal(isUsableOvImage({ ...img, license: "by" }), false);
  assert.equal(isUsableOvImage({ ...img, mature: true }), false);
  assert.equal(isUsableOvImage({ ...img, url: "http://example.org/x.jpg" }), false);
});
