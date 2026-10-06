import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paletteExport } from "../../outputs/a-plus-vault/modules/viewer-tools.js";

const list = [{ hex: "#F05040" }, { hex: "#222222" }];

describe("paletteExport", () => {
  it("writes css variables", () => {
    assert.equal(paletteExport(list, "css"), ":root {\n  --palette-1: #f05040;\n  --palette-2: #222222;\n}");
  });
  it("writes a tailwind colors block", () => {
    assert.match(paletteExport(list, "tailwind"), /palette: \{\n  1: "#f05040",\n  2: "#222222",\n\},/);
  });
  it("writes Figma design tokens as JSON", () => {
    assert.deepEqual(JSON.parse(paletteExport(list, "figma")), { palette: { 1: { value: "#f05040", type: "color" }, 2: { value: "#222222", type: "color" } } });
  });
  it("falls back to one hex per line", () => {
    assert.equal(paletteExport(list, "hex"), "#f05040\n#222222");
  });
});
