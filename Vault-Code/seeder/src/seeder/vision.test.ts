import assert from "node:assert/strict";
import { test } from "node:test";
import { parseVisionOutput, VisionOutputError } from "./vision";

const categories = ["poster", "textile"] as const;

test("valid output is normalized", () => {
  const r = parseVisionOutput(
    {
      safe: true,
      unsafe_reason: null,
      category: "textile",
      tags: ["Silk", "silk", "floral motif", "weaving"],
      style: "Islamic Geometric",
      colors: ["#AA3311", "#ffffff"],
    },
    categories,
  );
  assert.deepEqual(r.tags, ["silk", "floral motif", "weaving"]);
  assert.equal(r.style, "islamic geometric");
  assert.deepEqual(r.colors, ["#aa3311", "#ffffff"]);
});

test("category outside the allowed list is rejected", () => {
  assert.throws(
    () =>
      parseVisionOutput(
        { safe: true, unsafe_reason: null, category: "furniture", tags: ["a1", "b2", "c3"], style: "x1", colors: ["#000000"] },
        categories,
      ),
    VisionOutputError,
  );
});

test("bad colors and missing fields are rejected", () => {
  assert.throws(
    () => parseVisionOutput({ safe: true, unsafe_reason: null, category: "poster", tags: ["a1", "b2", "c3"], style: "x1", colors: ["red"] }, categories),
    VisionOutputError,
  );
  assert.throws(() => parseVisionOutput({ safe: true }, categories), VisionOutputError);
});
