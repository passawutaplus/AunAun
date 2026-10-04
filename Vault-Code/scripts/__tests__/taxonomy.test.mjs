import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTaxonomy, loadTaxonomy, validateTaxonomy } from "../../lib/engine/taxonomy.mjs";
import { engineConfig, validateEngineConfig } from "../../lib/engine/config.mjs";

const read = p => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), "utf8"));
const built = read("taxonomy/taxonomy.json");

describe("engine config", () => {
  it("is valid and has the agreed defaults", () => {
    assert.deepEqual(validateEngineConfig(engineConfig), []);
    assert.equal(engineConfig.QUALITY_PUBLISH, 75);
    assert.equal(engineConfig.MIN_CONFIDENT_TAGS, 4);
    assert.equal(engineConfig.OCR_ENABLED, false);
  });
  it("rejects NC/ND licenses and inverted quality thresholds", () => {
    assert.ok(validateEngineConfig({ ...engineConfig, LICENSE_ALLOWLIST: ["cc0", "cc-by-nc"] }).length);
    assert.ok(validateEngineConfig({ ...engineConfig, QUALITY_REJECT: 90 }).length);
  });
});

describe("taxonomy build + load", () => {
  it("the committed taxonomy.json is valid and matches a fresh build", () => {
    assert.deepEqual(validateTaxonomy(built), []);
    const fresh = buildTaxonomy(read("docs/dictionary/dictionary.json"), read("docs/engine-config.json"));
    assert.equal(JSON.stringify(fresh), JSON.stringify(built), "run: node scripts/build-taxonomy.mjs");
  });

  it("maps Thai and English synonyms to the same id, lowercased", () => {
    const tax = loadTaxonomy(built);
    assert.equal(tax.lookup("บ้าน"), "arc.house");
    assert.equal(tax.lookup("  House "), "arc.house");
    assert.equal(tax.lookup("zzz-not-a-word"), null);
    assert.equal(tax.label("arc.house"), "บ้าน");
  });

  it("rejects tagger output with unknown ids", () => {
    const tax = loadTaxonomy(built);
    assert.deepEqual(tax.filterKnownTags([{ id: "arc.house", conf: 0.9 }, { id: "made.up", conf: 0.9 }]).map(t => t.id), ["arc.house"]);
  });

  it("detects duplicate ids, missing parents, cycles and unknown phrase ids", () => {
    const base = structuredClone(built);
    const dup = structuredClone(base); dup.terms.push({ ...dup.terms[0] });
    assert.ok(validateTaxonomy(dup).some(e => /duplicate term/.test(e)));
    const orphan = structuredClone(base); orphan.terms[0].parent = "no.such";
    assert.ok(validateTaxonomy(orphan).some(e => /unknown parent/.test(e)));
    const cyc = structuredClone(base); cyc.terms[0].parent = cyc.terms[1].id; cyc.terms[1].parent = cyc.terms[0].id;
    assert.ok(validateTaxonomy(cyc).some(e => /cycle/.test(e)));
    const ph = structuredClone(base); ph.phrases[0].tags.push(["nope.nope", 1]);
    assert.ok(validateTaxonomy(ph).some(e => /unknown id/.test(e)));
    assert.throws(() => loadTaxonomy(dup), /taxonomy invalid/);
  });

  it("tags colour/era groups with their layer", () => {
    const layers = Object.fromEntries(built.groups.map(g => [g.id, g.layer]));
    assert.equal(layers["mood.hue"], "A");
    assert.equal(layers["sty.era"], "B");
  });
});
