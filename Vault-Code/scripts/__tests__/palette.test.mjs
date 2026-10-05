import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzePixels, computeMetrics, extractPalette, hueFamilyId, isBlankImage, paletteHarmony } from "../../lib/engine/palette.mjs";
import { engineConfig as cfg } from "../../lib/engine/config.mjs";

/** Builds a w*h RGBA image; fn(x, y) -> [r, g, b]. */
function image(w, h, fn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fn(x, y);
    data.set([r, g, b, 255], (y * w + x) * 4);
  }
  return { data, width: w, height: h };
}
const solid = rgb => image(32, 32, () => rgb);
const half = (a, b) => image(32, 32, x => (x < 16 ? a : b));
const ids = tags => tags.map(t => t.id);

describe("hue families", () => {
  it("names basic colours", () => {
    assert.equal(hueFamilyId(230, 30, 30), "mood.red");
    assert.equal(hueFamilyId(30, 60, 220), "mood.blue");
    assert.equal(hueFamilyId(40, 170, 70), "mood.green");
    assert.equal(hueFamilyId(250, 250, 250), "mood.white");
    assert.equal(hueFamilyId(128, 128, 128), "mood.grey");
    assert.equal(hueFamilyId(5, 5, 5), "mood.black");
    assert.equal(hueFamilyId(120, 70, 30), "mood.brown");
  });
});

describe("palette from pixels", () => {
  it("a two-colour image yields those two colours with ~50% each", () => {
    const p = extractPalette(half([220, 20, 20], [20, 20, 220]), 5, cfg);
    assert.equal(p.length, 2);
    assert.ok(p.every(c => Math.abs(c.pct - 0.5) < 0.05));
    assert.deepEqual(p.map(c => c.hue).sort(), ["mood.blue", "mood.red"]);
  });
  it("is deterministic", () => {
    const img = image(40, 40, (x, y) => [x * 6, y * 6, 120]);
    assert.deepEqual(extractPalette(img, 5, cfg), extractPalette(img, 5, cfg));
  });
  it("ignores transparent pixels", () => {
    const img = solid([200, 30, 30]);
    for (let i = 0; i < img.data.length; i += 8) img.data[i + 3] = 0;
    assert.equal(extractPalette(img, 5, cfg)[0].hue, "mood.red");
  });
});

describe("metrics and derived tags", () => {
  it("flags a uniform image as blank but not flat two-colour design", () => {
    assert.equal(isBlankImage(computeMetrics(solid([240, 240, 240]), cfg), cfg), true);
    assert.equal(isBlankImage(computeMetrics(half([240, 240, 240], [20, 20, 20]), cfg), cfg), false);
  });
  it("tags a black and white photo-like image", () => {
    const a = analyzePixels(image(48, 48, (x, y) => { const v = ((x * 5 + y * 3) % 256); return [v, v, v]; }), cfg);
    assert.ok(ids(a.tags).includes("mood.black_and_white") || ids(a.tags).includes("mood.neutral_palette"));
    assert.ok(a.metrics.chromatic_ratio < 0.03);
  });
  it("tags a warm vivid image and a dark image", () => {
    const warm = analyzePixels(half([240, 60, 20], [250, 170, 20]), cfg);
    assert.ok(ids(warm.tags).includes("mood.warm_palette"), ids(warm.tags).join());
    assert.ok(ids(warm.tags).includes("mood.vivid_palette"), ids(warm.tags).join());
    const dark = analyzePixels(half([10, 10, 25], [30, 30, 40]), cfg);
    assert.ok(ids(dark.tags).includes("mood.dark_palette"));
  });
  it("respects group maxima (hue <= 6, tone <= 3)", () => {
    const a = analyzePixels(image(64, 64, (x, y) => [x * 4, y * 4, (x * y) % 256]), cfg);
    assert.ok(a.tags.filter(t => t.facet === "mood.hue").length <= 6);
    assert.ok(a.tags.filter(t => t.facet === "mood.tone").length <= 3);
    assert.ok(a.tags.every(t => t.conf === 1 && t.src === "code"));
  });
  it("detects complementary harmony", () => {
    const p = extractPalette(half([230, 40, 30], [30, 190, 200]), 5, cfg);
    assert.equal(paletteHarmony(p, cfg), "complementary");
  });
});
