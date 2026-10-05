import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { daysLeft, trashAdd, trashPurge, trashRemove } from "../../lib/engine/trash.mjs";

const DAY = 86400000;
describe("trash", () => {
  it("adds newest first, no duplicates, capped", () => {
    let list = trashAdd([], { id: "a" }, 1000);
    list = trashAdd(list, { id: "b" }, 2000);
    list = trashAdd(list, { id: "a" }, 3000);
    assert.deepEqual(list.map(e => e.item.id), ["a", "b"]);
    let many = [];
    for (let i = 0; i < 250; i++) many = trashAdd(many, { id: "i" + i }, i);
    assert.equal(many.length, 200);
  });
  it("purges entries older than 30 days and keeps the rest", () => {
    const now = 100 * DAY;
    const list = [{ item: { id: "old" }, deletedAt: now - 31 * DAY }, { item: { id: "new" }, deletedAt: now - 2 * DAY }];
    assert.deepEqual(trashPurge(list, now).map(e => e.item.id), ["new"]);
  });
  it("reports days left and removes one entry", () => {
    const now = 100 * DAY;
    assert.equal(daysLeft({ deletedAt: now - 10 * DAY }, now), 20);
    assert.equal(daysLeft({ deletedAt: now - 40 * DAY }, now), 0);
    assert.deepEqual(trashRemove([{ item: { id: "a" } }, { item: { id: "b" } }], "a").map(e => e.item.id), ["b"]);
  });
});
