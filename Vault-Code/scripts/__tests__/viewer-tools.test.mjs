import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ambientColor, continueTabsMarkup, dominantSwatch, paletteList, paletteStripMarkup, selectedTagsQuery, tagChipsMarkup, trailMarkup, viewerToolsMarkup } from "../../outputs/a-plus-vault/modules/viewer-tools.js";
import { defaultTaxonomy } from "../../lib/engine/enrich.mjs";

const tax = defaultTaxonomy();

describe("palette", () => {
  it("uses stored shares, normalises hex, caps at 5", () => {
    const list = paletteList({ palette: [{ hex: "#FF0000", pct: 0.6 }, { hex: "#0f0", pct: 0.3 }, { hex: "bad", pct: 1 }, ...Array.from({ length: 6 }, (_, i) => ({ hex: "#00000" + i, pct: 0.01 }))] });
    assert.equal(list.length, 5);
    assert.equal(list[0].hex, "#ff0000");
    assert.equal(list[1].hex, "#00ff00");
    assert.ok(Math.abs(list.reduce((n, p) => n + p.share, 0) - 1) < 1e-9);
    assert.ok(list[0].share > list[1].share);
  });
  it("falls back to a plain colour list with equal shares, and to nothing", () => {
    const list = paletteList({ colors: ["#112233", "#445566"] });
    assert.deepEqual(list.map(p => p.share), [0.5, 0.5]);
    assert.deepEqual(paletteList({}), []);
    assert.equal(paletteStripMarkup([]), "");
  });
  it("strip markup has real buttons with aria-labels and widths proportional to share", () => {
    const html = paletteStripMarkup(paletteList({ palette: [{ hex: "#ff0000", pct: 3 }, { hex: "#0000ff", pct: 1 }] }));
    assert.match(html, /<button type='button' class='viewer-swatch' data-viewer-copy='#ff0000'/);
    assert.match(html, /aria-label='Copy #ff0000'/);
    assert.match(html, /flex:0\.750 1 0/);
    assert.match(html, /aria-live='polite'/);
  });
  it("ambient colour is dark and desaturated so light text keeps contrast", () => {
    const c = ambientColor("#ff3b30");
    assert.match(c, /^hsl\(\d+ \d+% 11%\)$/);
    assert.ok(Number(c.match(/hsl\(\d+ (\d+)%/)[1]) <= 45);
    assert.equal(ambientColor("nope"), "");
  });
  it("dominant swatch prefers a colourful one over a bigger neutral", () => {
    const d = dominantSwatch(paletteList({ palette: [{ hex: "#f5f5f5", pct: 0.7 }, { hex: "#d63a2f", pct: 0.2 }] }));
    assert.equal(d.hex, "#d63a2f");
  });
});

describe("tags, tools, trail", () => {
  const label = id => tax.label(id);
  it("tag chips use aria-pressed and show the search button only with a selection", () => {
    const none = tagChipsMarkup(["arc.house", "sty.minimal"], label, {});
    assert.match(none, /aria-pressed='false'/);
    assert.match(none, /viewer-search-tags' hidden/);
    const some = tagChipsMarkup(["arc.house", "sty.minimal"], label, { pinned: ["arc.house"], excluded: ["sty.minimal"] });
    assert.match(some, /aria-pressed='true'/);
    assert.match(some, /is-excluded/);
    assert.match(some, /Search with selected tags \(2\)/);
  });
  it("renders nothing until labels are available or when there are no tags (empty sections are hidden)", () => {
    assert.equal(tagChipsMarkup(["arc.house"], null), "");
    assert.equal(tagChipsMarkup([], label), "");
  });
  it("builds a search in the parser's own syntax", () => {
    assert.equal(selectedTagsQuery(["sty.minimal"], ["mood.neon_palette"], tax.termById), "#minimal no neonpalette".replace("neonpalette", tax.termById.get("mood.neon_palette").en[0].toLowerCase().replace(/\s+/g, "")));
  });
  it("tools are icon-only (no visible text) with accessible names, and a picked-colour chip beside them", () => {
    const html = viewerToolsMarkup({});
    assert.match(html, /aria-label='Pick a color from the image'/);
    assert.match(html, /data-viewer-picked/);
    assert.ok(!/>(B&amp;W|Thirds|Eyedropper)</.test(html));
  });
  it("B&W and thirds are toggle buttons reflecting state", () => {
    assert.match(viewerToolsMarkup({ bw: true, grid: false }), /data-viewer-bw aria-pressed='true'/);
    assert.match(viewerToolsMarkup({ bw: true, grid: false }), /data-viewer-grid aria-pressed='false'/);
  });
  it("breadcrumb is tappable except the current step; hidden for a single step", () => {
    assert.equal(trailMarkup([{ label: "x" }]), "");
    const html = trailMarkup([{ label: "search" }, { label: "similar #3" }, { label: "this image" }]);
    assert.match(html, /data-viewer-trail='0'/);
    assert.match(html, /data-viewer-trail='1'/);
    assert.match(html, /aria-current='page'>this image/);
  });
  it("continue tabs mark the active mode", () => {
    assert.match(continueTabsMarkup("opposite"), /data-viewer-continue='opposite' aria-selected='true'/);
    assert.match(continueTabsMarkup("opposite"), /data-viewer-continue='similar' aria-selected='false'/);
  });
});
