import assert from "node:assert/strict";
import { test } from "node:test";
import { isUsableMetObject, normalizeMetObject, type MetObject } from "./met";

const publicDomain: MetObject = {
  objectID: 436535,
  isPublicDomain: true,
  primaryImage: "https://images.metmuseum.org/CRDImages/ep/original/DT1567.jpg",
  title: "Wheat Field with Cypresses",
  artistDisplayName: "Vincent van Gogh",
  objectDate: "1889",
  creditLine: "Purchase, The Annenberg Foundation Gift, 1993",
  objectURL: "https://www.metmuseum.org/art/collection/search/436535",
  department: "European Paintings",
  tags: [{ term: "Landscapes" }, { term: "Cypresses" }],
};

test("public-domain object normalizes to cc0 with full credit", () => {
  const c = normalizeMetObject(publicDomain);
  assert.equal(c.source, "met");
  assert.equal(c.sourceId, "436535");
  assert.equal(c.license, "cc0");
  assert.equal(c.licenseUrl, "https://creativecommons.org/publicdomain/zero/1.0/");
  assert.equal(c.sourceUrl, "https://www.metmuseum.org/art/collection/search/436535");
  assert.equal(
    c.attribution,
    "Wheat Field with Cypresses, Vincent van Gogh, 1889. The Metropolitan Museum of Art, New York, Purchase, The Annenberg Foundation Gift, 1993.",
  );
  assert.equal(c.attributionJson.institution, "The Metropolitan Museum of Art");
  assert.deepEqual(c.sourceMeta.source_tags, ["Landscapes", "Cypresses"]);
});

test("object details keep museum fields and drop blanks", () => {
  const c = normalizeMetObject({
    ...publicDomain,
    objectName: "Painting",
    dimensions: "28 7/8 × 36 3/4 in. (73.2 × 93.4 cm)",
    accessionNumber: "1993.132",
    period: " ",
    city: "Saint-Rémy",
    country: "France",
  });
  assert.equal(c.sourceMeta.object_name, "Painting");
  assert.equal(c.sourceMeta.accession_number, "1993.132");
  assert.equal(c.sourceMeta.dimensions, "28 7/8 × 36 3/4 in. (73.2 × 93.4 cm)");
  assert.equal(c.sourceMeta.geography, "Saint-Rémy, France");
  assert.equal(c.sourceMeta.period, null);
});

test("non public-domain object is marked restricted for the license gate", () => {
  const c = normalizeMetObject({ ...publicDomain, isPublicDomain: false });
  assert.equal(c.license, "restricted");
  assert.equal(c.licenseUrl, null);
});

test("only public-domain objects with an https image are usable", () => {
  assert.equal(isUsableMetObject(publicDomain), true);
  assert.equal(isUsableMetObject({ ...publicDomain, isPublicDomain: false }), false);
  assert.equal(isUsableMetObject({ ...publicDomain, primaryImage: "" }), false);
});

test("object without image keeps an empty image url", () => {
  const c = normalizeMetObject({ ...publicDomain, primaryImage: "" });
  assert.equal(c.originalImageUrl, "");
});

test("missing fields fall back to Untitled and https object url", () => {
  const c = normalizeMetObject({ objectID: 1, isPublicDomain: true, primaryImage: "x", objectURL: "http://www.metmuseum.org/art/collection/search/1" });
  assert.equal(c.title, "Untitled");
  assert.equal(c.sourceUrl, "https://www.metmuseum.org/art/collection/search/1");
  assert.equal(c.attribution, "Untitled. The Metropolitan Museum of Art, New York.");
});
