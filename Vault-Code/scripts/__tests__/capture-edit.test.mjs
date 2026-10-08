import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyCaptureEdits } from "../../lib/routes/vault-captures-id.mjs";

const base = { id: "abc123", title: "Saved image", note: "", collectionIds: ["all"], sourceUrl: "https://example.com/a", captureContext: { collectionName: null, pageUrl: "https://example.com/a" } };

describe("Add details after a quick keep (PATCH)", () => {
  it("changes title, note and collection, and stamps editedAt", () => {
    const out = applyCaptureEdits(base, { title: "  Corkboard   campaign ", note: " layered ", collectionId: "col_1", collectionName: "Blacksmith Ads" });
    assert.equal(out.title, "Corkboard campaign");
    assert.equal(out.note, "layered");
    assert.deepEqual(out.collectionIds, ["col_1"]);
    assert.equal(out.captureContext.collectionName, "Blacksmith Ads");
    assert.ok(out.editedAt > 0);
  });
  it("never touches the source, id or file fields, and does not mutate the input", () => {
    const out = applyCaptureEdits(base, { title: "x", sourceUrl: "https://evil.example", id: "zzz", assetUrl: "https://evil.example/a.png" });
    assert.equal(out.sourceUrl, base.sourceUrl);
    assert.equal(out.id, base.id);
    assert.equal(out.assetUrl, undefined);
    assert.equal(base.editedAt, undefined);
    assert.equal(base.title, "Saved image");
  });
  it("keeps the old title when the new one is empty, and rejects odd collection ids", () => {
    assert.equal(applyCaptureEdits(base, { title: "   " }).title, "Saved image");
    assert.deepEqual(applyCaptureEdits(base, { collectionId: "../../x" }).collectionIds, ["all"]);
  });
  it("stores up to 6 clean tags in quickTags", () => {
    const out = applyCaptureEdits(base, { tags: [" poster ", "warm", "", "retro", "a", "b", "c", "d", "e"] });
    assert.deepEqual(out.captureContext.quickTags, ["poster", "warm", "retro", "a", "b", "c"]);
    assert.equal(applyCaptureEdits(base, {}).captureContext.quickTags, undefined);
  });
  it("moving back to My Vault clears the collection name", () => {
    const filed = applyCaptureEdits(base, { collectionId: "col_1", collectionName: "A" });
    const back = applyCaptureEdits(filed, { collectionId: "all" });
    assert.deepEqual(back.collectionIds, ["all"]);
    assert.equal(back.captureContext.collectionName, null);
  });
});
