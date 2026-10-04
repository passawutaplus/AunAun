import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bangkokDayStartIso, capLimits, itemsAllowance, stopReason } from "./caps";

const limits = { maxItemsPerRun: 200, maxItemsPerDay: 400, maxAiCallsPerRun: 100, maxAiCallsPerDay: 200, monthlyAiUsd: 5 };
const idle = { itemsToday: 0, aiCallsToday: 0, monthUsd: 0 };
const ok = { paused: false, killSwitch: false };

describe("seeder caps", () => {
  it("runs when nothing is limiting", () => assert.equal(stopReason(ok, idle, limits), null));

  it("kill switch wins over everything, including a paused flag", () => {
    assert.equal(stopReason({ paused: true, killSwitch: true }, idle, limits), "kill_switch");
    assert.equal(stopReason({ paused: false, killSwitch: true }, idle, limits), "kill_switch");
  });

  it("pause stops seeding", () => assert.equal(stopReason({ paused: true, killSwitch: false }, idle, limits), "paused"));

  it("each cap stops at its limit, not before", () => {
    assert.equal(stopReason(ok, { ...idle, monthUsd: 4.99 }, limits), null);
    assert.equal(stopReason(ok, { ...idle, monthUsd: 5 }, limits), "monthly_budget");
    assert.equal(stopReason(ok, { ...idle, aiCallsToday: 199 }, limits), null);
    assert.equal(stopReason(ok, { ...idle, aiCallsToday: 200 }, limits), "daily_ai_cap");
    assert.equal(stopReason(ok, { ...idle, itemsToday: 400 }, limits), "daily_items_cap");
  });

  it("allowance is the smaller of the run cap and what is left today", () => {
    assert.equal(itemsAllowance(idle, limits), 200);
    assert.equal(itemsAllowance({ ...idle, itemsToday: 350 }, limits), 50);
    assert.equal(itemsAllowance({ ...idle, itemsToday: 999 }, limits), 0);
  });

  it("reads limits from config/engine.json and lets SEEDER_BUDGET_USD override the budget", () => {
    assert.equal(capLimits(undefined).monthlyAiUsd, 5);
    assert.equal(capLimits("12.5").monthlyAiUsd, 12.5);
    assert.equal(capLimits("junk").monthlyAiUsd, 5);
  });

  it("computes the Bangkok day start", () => {
    // 2026-10-04 20:00 UTC is already 2026-10-05 03:00 in Bangkok -> day starts 2026-10-04 17:00 UTC.
    assert.equal(bangkokDayStartIso(new Date("2026-10-04T20:00:00Z")), "2026-10-04T17:00:00.000Z");
    assert.equal(bangkokDayStartIso(new Date("2026-10-04T05:00:00Z")), "2026-10-03T17:00:00.000Z");
  });
});
