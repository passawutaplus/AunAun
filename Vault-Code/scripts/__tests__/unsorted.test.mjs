import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isUnsorted } from "../../outputs/a-plus-vault/modules/origin.js";
import { itemMatchesOperators, parseOperators } from "../../outputs/a-plus-vault/modules/search-tools.js";

const item = (extra = {}) => ({ id: "x", type: "image", createdAt: Date.UTC(2020, 0, 1), collectionIds: ["all"], projectIds: [], captureContext: {}, analysis: { tags: [] }, ...extra });

describe("isUnsorted", () => {
  it("is true when the item is in no collection, however old it is", () => {
    assert.equal(isUnsorted(item()), true);
    assert.equal(isUnsorted(item({ collectionIds: [] })), true);
    assert.equal(isUnsorted(item({ collectionIds: undefined })), true);
  });
  it("is false once the item is in a collection", () => {
    assert.equal(isUnsorted(item({ collectionIds: ["brand"] })), false);
    assert.equal(isUnsorted(item({ collectionIds: ["all", "brand"] })), false);
  });
  it("projects and tags do not count as sorted", () => {
    assert.equal(isUnsorted(item({ projectIds: ["p1"], analysis: { tags: ["poster", "warm"] } })), true);
  });
  it("ignores old triage marks", () => {
    assert.equal(isUnsorted(item({ captureContext: { triagedAt: Date.now() } })), true);
  });
  it("treats the legacy 'inbox' collection id as no collection", () => {
    assert.equal(isUnsorted(item({ collectionIds: ["inbox"] })), true);
    assert.equal(isUnsorted(item({ collectionIds: ["inbox", "brand"] })), false);
  });
});

describe("is:unsorted operator", () => {
  const ctx = { rightsOf: () => "reference", collectionNames: () => [], colorFamilyOf: () => "white" };
  it("parses and matches only unsorted items", () => {
    const { ops, rest } = parseOperators("poster is:unsorted");
    assert.deepEqual(ops, { is: ["unsorted"] });
    assert.equal(rest, "poster");
    assert.equal(itemMatchesOperators(item(), ops, ctx), true);
    assert.equal(itemMatchesOperators(item({ collectionIds: ["brand"] }), ops, ctx), false);
  });
  it("does not match other is: values", () => {
    const { ops } = parseOperators("is:pinned");
    assert.equal(itemMatchesOperators(item(), ops, ctx), false);
  });
});
