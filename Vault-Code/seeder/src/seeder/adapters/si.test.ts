import assert from "node:assert/strict";
import { test } from "node:test";
import { isUsableSiRow, normalizeSiRow, type SiRow } from "./si";

const row: SiRow = {
  id: "ld1-1",
  title: "Poster for the American Negro Exposition in Chicago",
  content: {
    descriptiveNonRepeating: {
      record_ID: "nmaahc_2015.178",
      record_link: "https://nmaahc.si.edu/object/nmaahc_2015.178",
      data_source: "National Museum of African American History and Culture",
      title: { label: "Object Name", content: "Poster for the American Negro Exposition in Chicago" },
      online_media: {
        media: [
          {
            type: "Images",
            idsId: "NMAAHC-CE95F87171C92_2001",
            usage: { access: "CC0" },
            resources: [{ label: "High-resolution JPEG", width: 5913, height: 9063 }],
          },
        ],
      },
    },
    freetext: {
      date: [{ label: "Date", content: "1940" }],
      name: [{ label: "Illustrated by", content: "Robert Savon Pious, American, 1908 - 1983" }],
    },
  },
};

test("cc0 record normalizes with IDS image and unit credit", () => {
  assert.ok(isUsableSiRow(row));
  const c = normalizeSiRow(row);
  assert.equal(c.source, "si");
  assert.equal(c.sourceId, "nmaahc_2015.178");
  assert.equal(c.license, "cc0");
  assert.equal(c.originalImageUrl, "https://ids.si.edu/ids/deliveryService?id=NMAAHC-CE95F87171C92_2001&max=2400");
  assert.equal(c.sourceUrl, "https://nmaahc.si.edu/object/nmaahc_2015.178");
  assert.match(c.attribution, /^Poster for the American Negro Exposition in Chicago, Robert Savon Pious.*, 1940\. National Museum/);
});

test("record without a cc0 image is skipped", () => {
  const media = row.content!.descriptiveNonRepeating!.online_media!.media!;
  const restricted: SiRow = {
    ...row,
    content: {
      ...row.content,
      descriptiveNonRepeating: {
        ...row.content!.descriptiveNonRepeating,
        online_media: { media: [{ ...media[0], usage: { access: "Usage conditions apply" } }] },
      },
    },
  };
  assert.equal(isUsableSiRow(restricted), false);
});
