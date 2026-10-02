import assert from "node:assert/strict";
import { test } from "node:test";
import { aicImageUrl, isUsableAicArtwork, normalizeAicArtwork, type AicArtwork } from "./aic";

const art: AicArtwork = {
  id: 2102,
  title: "The Elephant, from The Berain Grotesques Series",
  image_id: "d0042a79-ccf5-6442-f237-8b39152e153a",
  artist_title: "Jean Baptiste Monnoyer",
  date_display: "c. 1688/1732",
  credit_line: "Robert Allerton Endowment",
  is_public_domain: true,
  thumbnail: { width: 3987, height: 2712 },
  classification_title: "weaving - tapestry",
};

test("caption follows AIC's requested format", () => {
  const c = normalizeAicArtwork(art);
  assert.equal(
    c.attribution,
    "Jean Baptiste Monnoyer. The Elephant, from The Berain Grotesques Series, c. 1688/1732. The Art Institute of Chicago.",
  );
  assert.equal(c.sourceUrl, "https://www.artic.edu/artworks/2102");
  assert.equal(c.license, "cc0");
  assert.equal(c.attributionJson.credit_line, "Robert Allerton Endowment");
});

test("large originals use the 1686px IIIF rendition, small ones 843px", () => {
  assert.equal(aicImageUrl(art), "https://www.artic.edu/iiif/2/d0042a79-ccf5-6442-f237-8b39152e153a/full/1686,/0/default.jpg");
  assert.match(aicImageUrl({ ...art, thumbnail: { width: 1200, height: 900 } }), /\/full\/843,\//);
});

test("non public-domain or imageless artworks are not usable", () => {
  assert.equal(isUsableAicArtwork(art), true);
  assert.equal(isUsableAicArtwork({ ...art, is_public_domain: false }), false);
  assert.equal(isUsableAicArtwork({ ...art, image_id: null }), false);
});

test("missing artist still yields a caption", () => {
  const c = normalizeAicArtwork({ ...art, artist_title: null });
  assert.equal(c.attribution, "The Elephant, from The Berain Grotesques Series, c. 1688/1732. The Art Institute of Chicago.");
});
