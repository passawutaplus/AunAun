import { describe, expect, it } from "vitest";
import { sortCollectionItems } from "@/lib/collectionItemsSort";

const items = [
  { id: "a", created_at: "2026-01-01T00:00:00Z", added_at: "2026-09-03T00:00:00Z", likes: 1, views: 30 },
  { id: "b", created_at: "2026-08-01T00:00:00Z", added_at: "2026-09-01T00:00:00Z", likes: 9, views: 10 },
  { id: "c", created_at: "2026-05-01T00:00:00Z", added_at: "2026-09-02T00:00:00Z", likes: 5, views: 20 },
];

const ids = (list: { id: string }[]) => list.map((i) => i.id);

describe("sortCollectionItems", () => {
  it("orders newest/oldest by when the work was saved, not when it was created", () => {
    expect(ids(sortCollectionItems(items, "newest"))).toEqual(["a", "c", "b"]);
    expect(ids(sortCollectionItems(items, "oldest"))).toEqual(["b", "c", "a"]);
  });

  it("manual order follows position, with unpositioned (newly saved) works first", () => {
    const arranged = [
      { id: "a", position: 1, added_at: "2026-09-01T00:00:00Z" },
      { id: "b", position: 0, added_at: "2026-09-02T00:00:00Z" },
      { id: "new", position: null, added_at: "2026-09-10T00:00:00Z" },
      { id: "newer", position: null, added_at: "2026-09-11T00:00:00Z" },
    ];
    expect(ids(sortCollectionItems(arranged, "manual"))).toEqual(["newer", "new", "b", "a"]);
  });

  it("falls back to created_at when added_at is missing", () => {
    const legacy = items.map(({ added_at: _drop, ...rest }) => rest);
    expect(ids(sortCollectionItems(legacy, "newest"))).toEqual(["b", "c", "a"]);
  });

  it("sorts by likes and views, and does not mutate the input", () => {
    const before = ids(items);
    expect(ids(sortCollectionItems(items, "likes"))).toEqual(["b", "c", "a"]);
    expect(ids(sortCollectionItems(items, "views"))).toEqual(["a", "c", "b"]);
    expect(ids(items)).toEqual(before);
  });
});
