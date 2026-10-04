import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
const { assertNotKilled, isKillSwitchOn, resetKillSwitchCache } = await import("../../lib/engine/kill-switch.mjs");

const reply = (rows, ok = true) => async () => ({ ok, status: ok ? 200 : 500, json: async () => rows });

describe("kill switch", () => {
  beforeEach(() => resetKillSwitchCache());

  it("is off when the flag is false", async () => {
    assert.equal(await isKillSwitchOn({ fetchImpl: reply([{ kill_switch: false }]), now: 1e6 }), false);
    await assert.doesNotReject(assertNotKilled({ fetchImpl: reply([{ kill_switch: false }]), now: 1e6 }));
  });

  it("is on when the flag is true and assertNotKilled throws KILL_SWITCH", async () => {
    await assert.rejects(assertNotKilled({ fetchImpl: reply([{ kill_switch: true }]), now: 1e6 }), e => e.code === "KILL_SWITCH");
  });

  it("fails closed when the flag cannot be read", async () => {
    assert.equal(await isKillSwitchOn({ fetchImpl: reply([], false), now: 1e6 }), true);
    assert.equal(await isKillSwitchOn({ fetchImpl: async () => { throw new Error("network"); }, now: 3e6 }), true);
  });
});
