import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesQuery, normalizeChndmRow } from "./chndm";
import type { SiRow } from "./si";

const row: SiRow = {
  id: "edanmdm-chndm_1998-75-99",
  title: "Sidewall",
  content: {
    descriptiveNonRepeating: {
      record_ID: "chndm_1998-75-99",
      record_link: "https://collection.cooperhewitt.org/view/objects/asitem/id/213684",
      data_source: "Cooper Hewitt, Smithsonian Design Museum",
      title: { label: "Title", content: "Sidewall" },
      online_media: { media: [{ type: "Images", idsId: "CHSDM-1998-75-99", usage: { access: "CC0" } }] },
    },
    freetext: { objectType: [{ label: "Type", content: "Wallcoverings" }] },
  },
};

test("query words match title and object type by prefix", () => {
  assert.ok(matchesQuery(row, "sidewall"));
  assert.ok(matchesQuery(row, "wallcovering"));
  assert.equal(matchesQuery(row, "chair"), false);
});

test("bulk record normalizes like the API under its own source", () => {
  const c = normalizeChndmRow(row);
  assert.equal(c.source, "chndm");
  assert.equal(c.license, "cc0");
  assert.equal(c.sourceUrl, "https://collection.cooperhewitt.org/view/objects/asitem/id/213684");
});
