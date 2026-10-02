import assert from "node:assert/strict";
import { test } from "node:test";
import type { CategoryProgress, SeedTarget } from "./repo";
import { planBatches } from "./schedule";

function target(category: string, source: "met" | "aic", extra: Partial<SeedTarget> = {}): SeedTarget {
  return {
    category,
    source,
    query: category,
    target_count: 200,
    cursor: 0,
    exhausted: false,
    enabled: true,
    scanned_count: 0,
    skipped_count: 0,
    last_run_at: null,
    ...extra,
  };
}

const progress: CategoryProgress[] = [
  { category: "poster", target_count: 200, published: 200, pending: 0, rejected: 0 },
  { category: "textile", target_count: 200, published: 10, pending: 0, rejected: 0 },
  { category: "ceramic", target_count: 200, published: 190, pending: 0, rejected: 0 },
];

const targets = [
  target("poster", "met"),
  target("textile", "met", { cursor: 40 }),
  target("textile", "aic"),
  target("ceramic", "met"),
  target("ceramic", "aic", { exhausted: true }),
];

test("only categories under target are scheduled", () => {
  const plan = planBatches(progress, targets, { batchSize: 20, maxBatches: 50 });
  assert.ok(plan.every((b) => b.category !== "poster"));
  assert.ok(plan.every((b) => !(b.category === "ceramic" && b.source === "aic")));
});

test("cursors continue from the stored cursor", () => {
  const plan = planBatches(progress, targets, { batchSize: 20, maxBatches: 50 });
  const textileMet = plan.filter((b) => b.category === "textile" && b.source === "met").map((b) => b.cursor);
  assert.deepEqual(textileMet, [40, 60, 80]);
});

test("small gaps get one page, cap is respected round-robin", () => {
  const plan = planBatches(progress, targets, { batchSize: 20, maxBatches: 3 });
  assert.equal(plan.length, 3);
  assert.deepEqual(
    plan.map((b) => `${b.category}/${b.source}`),
    ["textile/met", "textile/aic", "ceramic/met"],
  );
});

test("onlyCategory narrows the run", () => {
  const plan = planBatches(progress, targets, { batchSize: 20, maxBatches: 50, onlyCategory: "ceramic" });
  assert.deepEqual(plan.map((b) => b.cursor), [0]);
});
