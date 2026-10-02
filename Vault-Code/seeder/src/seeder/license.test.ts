import assert from "node:assert/strict";
import { test } from "node:test";
import type { Candidate } from "./adapters/types";
import { licenseGate } from "./license";

const base: Candidate = {
  source: "met",
  sourceId: "1",
  sourceUrl: "https://www.metmuseum.org/art/collection/search/1",
  originalImageUrl: "https://images.metmuseum.org/x.jpg",
  title: "T",
  license: "cc0",
  licenseUrl: null,
  attribution: "T. The Metropolitan Museum of Art, New York.",
  attributionJson: { artist: "", title: "T", date: "", credit_line: "", institution: "", institution_url: "", object_url: "" },
  sourceMeta: {},
};

test("cc0 with credit and image passes", () => {
  assert.deepEqual(licenseGate(base), { ok: true });
});

test("non-allowlisted license is rejected", () => {
  assert.deepEqual(licenseGate({ ...base, license: "restricted" }), { ok: false, reason: "license_not_allowed" });
  assert.deepEqual(licenseGate({ ...base, license: "cc-by" }), { ok: false, reason: "license_not_allowed" });
});

test("missing attribution or non-https source is rejected", () => {
  assert.deepEqual(licenseGate({ ...base, attribution: "  " }), { ok: false, reason: "missing_attribution" });
  assert.deepEqual(licenseGate({ ...base, sourceUrl: "http://x" }), { ok: false, reason: "missing_attribution" });
});

test("missing image is rejected", () => {
  assert.deepEqual(licenseGate({ ...base, originalImageUrl: "" }), { ok: false, reason: "missing_image" });
});
