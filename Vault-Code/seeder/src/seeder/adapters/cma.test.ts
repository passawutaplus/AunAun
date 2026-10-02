import assert from "node:assert/strict";
import { test } from "node:test";
import { isUsableCmaArtwork, normalizeCmaArtwork, type CmaArtwork } from "./cma";

const art: CmaArtwork = {
  id: 142748,
  accession_number: "1966.454",
  share_license_status: "CC0",
  title: "Miniature Chair",
  url: "https://clevelandart.org/art/1966.454",
  creation_date: "1896–1906",
  creditline: "The India Early Minshall Collection",
  type: "Miscellaneous",
  culture: ["Russia, St. Petersburg"],
  creators: [{ description: "House of Fabergé (Russian, 1842–1918)", role: "maker" }],
  images: { print: { url: "https://openaccess-cdn.clevelandart.org/1966.454/1966.454_print.jpg", width: "2546", height: "3400" } },
};

test("cc0 artwork normalizes with print image and full credit", () => {
  assert.ok(isUsableCmaArtwork(art));
  const c = normalizeCmaArtwork(art);
  assert.equal(c.source, "cma");
  assert.equal(c.license, "cc0");
  assert.equal(c.originalImageUrl, "https://openaccess-cdn.clevelandart.org/1966.454/1966.454_print.jpg");
  assert.equal(c.sourceUrl, "https://clevelandart.org/art/1966.454");
  assert.equal(
    c.attribution,
    "Miniature Chair, House of Fabergé (Russian, 1842–1918), 1896–1906. The Cleveland Museum of Art, The India Early Minshall Collection.",
  );
  assert.equal(c.sourceMeta.full_width, 2546);
});

test("non-cc0 or imageless artwork is skipped", () => {
  assert.equal(isUsableCmaArtwork({ ...art, share_license_status: "Copyrighted" }), false);
  assert.equal(isUsableCmaArtwork({ ...art, images: { print: null } }), false);
});
