import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultTaxonomy } from "../../lib/engine/enrich.mjs";
import { formatReport, reportGolden } from "../../lib/engine/golden.mjs";

const tax = defaultTaxonomy();

describe("golden report", () => {
  it("computes per-group precision and recall and ignores unknown ids", () => {
    const rep = reportGolden(
      [{ id: "a", expected: ["arc.house", "mood.calm"] }, { id: "b", expected: ["arc.villa"] }, { id: "c", expected: ["arc.house"] }],
      { a: ["arc.house", "mood.cozy", "bogus.id"], b: ["arc.house"] },
      tax,
    );
    assert.equal(rep.missing, 1);
    assert.equal(rep.images, 2);
    const typology = rep.rows.find(r => r.group === "arc.typology");
    assert.deepEqual([typology.tp, typology.fp, typology.fn], [1, 1, 1]);
    assert.equal(typology.precision, 0.5);
    assert.match(formatReport(rep), /arc\.typology/);
  });
  it("an empty golden set yields nulls, not NaN", () => {
    const rep = reportGolden([], {}, tax);
    assert.equal(rep.precision, null);
  });
});
