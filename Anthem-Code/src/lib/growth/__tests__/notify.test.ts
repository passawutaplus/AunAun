import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFY_SETTINGS,
  GROWTH_PATH,
  MAX_ITEMS_PER_MESSAGE,
  MockLineSender,
  emptyQueue,
  enqueueNotification,
  flushNotifications,
  makeNotification,
  senderFor,
  shouldFlush,
  type NotifyInput,
  type NotifyQueue,
} from "../notify";

const T0 = Date.parse("2026-11-23T02:00:00.000Z");
const at = (ms: number) => new Date(ms).toISOString();
const S = DEFAULT_NOTIFY_SETTINGS;

function add(q: NotifyQueue, input: NotifyInput, ms = T0): NotifyQueue {
  return enqueueNotification(q, makeNotification(input, `n-${q.seenKeys.length + 1}`, at(ms))).queue;
}

const ALL_KINDS: NotifyInput[] = [
  { kind: "approval_waiting", campaignId: "pfi-w01", name: "Portfolio First Impression", version: 2, platforms: ["instagram"] },
  { kind: "needs_decision", key: "d-consent", title: "Creator spotlight: ยังไม่มี consent" },
  { kind: "revision_ready", campaignId: "pfi-w01", name: "Portfolio First Impression", version: 2 },
  { kind: "job_scheduled", campaignId: "pfi-w01", name: "PFI", platforms: ["facebook", "threads"], firstSlot: "2026-11-23T05:00:00.000Z" },
  { kind: "job_exported", campaignId: "pfi-w01", name: "PFI", platform: "facebook", jobKey: "k1" },
  { kind: "job_published", campaignId: "pfi-w01", name: "PFI", platform: "facebook", jobKey: "k1" },
  { kind: "publish_failed", campaignId: "pfi-w01", name: "PFI", platform: "instagram", reason: "token หมดอายุ", jobKey: "k2" },
  { kind: "token_issue", provider: "Meta" },
  { kind: "budget_threshold", level: 70, cycle: "c1" },
  { kind: "blocked_budget", cycle: "c1" },
  { kind: "pause_all", on: true, at: "2026-11-23T02:00:00.000Z" },
  { kind: "weekly_insights", week: "2026-W48", decisions: 3 },
];

describe("notifications → LINE admin group", () => {
  it("every kind gets short Thai text and a link under /admin/growth", () => {
    for (const input of ALL_KINDS) {
      const n = makeNotification(input, "x", at(T0));
      expect(n.path.startsWith(GROWTH_PATH), input.kind).toBe(true);
      expect(n.text.length, input.kind).toBeLessThanOrEqual(90);
      expect(n.text, input.kind).toMatch(/[฀-๿]|Pause All/);
    }
  });

  it("failures, token issues, BLOCKED_BUDGET, 100% and Pause All are urgent", () => {
    const sev = (i: NotifyInput) => makeNotification(i, "x", at(T0)).severity;
    expect(sev({ kind: "publish_failed", campaignId: "c", name: "n", platform: "instagram", reason: "r", jobKey: "k" })).toBe("urgent");
    expect(sev({ kind: "token_issue", provider: "Meta" })).toBe("urgent");
    expect(sev({ kind: "blocked_budget", cycle: "c" })).toBe("urgent");
    expect(sev({ kind: "budget_threshold", level: 100, cycle: "c" })).toBe("urgent");
    expect(sev({ kind: "budget_threshold", level: 90, cycle: "c" })).toBe("info");
    expect(sev({ kind: "approval_waiting", campaignId: "c", name: "n", version: 1, platforms: [] })).toBe("info");
  });

  it("dedupes: budget 70% once per cycle, the same approval once", () => {
    let q = emptyQueue();
    q = add(q, { kind: "budget_threshold", level: 70, cycle: "c1" });
    q = add(q, { kind: "budget_threshold", level: 70, cycle: "c1" });
    q = add(q, { kind: "budget_threshold", level: 70, cycle: "c2" });
    expect(q.pending).toHaveLength(2);
    const sent = flushNotifications(q, S, T0, { force: true }).queue;
    expect(add(sent, { kind: "budget_threshold", level: 70, cycle: "c1" }).pending).toHaveLength(0);
  });

  it("groups a burst inside the window into ONE message", () => {
    let q = emptyQueue();
    q = add(q, ALL_KINDS[0], T0);
    q = add(q, ALL_KINDS[1], T0 + 30_000);
    q = add(q, ALL_KINDS[2], T0 + 90_000);
    expect(shouldFlush(q, S, T0 + 120_000)).toBe(false); // oldest waited 2 of 3 min
    expect(flushNotifications(q, S, T0 + 120_000).batch).toBeNull();
    const { batch, queue } = flushNotifications(q, S, T0 + S.batchWindowMs);
    expect(batch?.notificationIds).toHaveLength(3);
    expect(queue.pending).toHaveLength(0);
    expect(batch?.text.split("\n")[0]).toBe("SAMECOR Growth · 3 เรื่อง");
  });

  it("an urgent item flushes at once, urgent lines first", () => {
    let q = emptyQueue();
    q = add(q, ALL_KINDS[0], T0);
    q = add(q, ALL_KINDS[9], T0 + 5_000); // blocked_budget
    expect(shouldFlush(q, S, T0 + 6_000)).toBe(true);
    const { batch } = flushNotifications(q, S, T0 + 6_000);
    const lines = batch!.text.split("\n");
    expect(lines[0]).toBe("ด่วน · SAMECOR Growth · 2 เรื่อง");
    expect(lines[1]).toContain("AI credit หมด");
    expect(batch!.urgent).toBe(true);
  });

  it("every item line is followed by its full link", () => {
    let q = emptyQueue();
    for (const i of ALL_KINDS.slice(0, 4)) q = add(q, i);
    const { batch } = flushNotifications(q, S, T0, { force: true });
    const lines = batch!.text.split("\n").slice(1);
    for (let i = 0; i < lines.length; i += 2) {
      expect(lines[i].startsWith("• ")).toBe(true);
      expect(lines[i + 1]).toMatch(/^ {2}https:\/\/samecor\.com\/admin\/growth/);
    }
  });

  it("caps items per message with a link to the rest", () => {
    let q = emptyQueue();
    for (let i = 0; i < MAX_ITEMS_PER_MESSAGE + 3; i++) q = add(q, { kind: "needs_decision", key: `d${i}`, title: `เรื่อง ${i}` });
    const text = flushNotifications(q, S, T0, { force: true }).batch!.text;
    expect(text).toContain("+ อีก 3 เรื่อง");
    expect(text.split("\n").filter((l) => l.startsWith("• "))).toHaveLength(MAX_ITEMS_PER_MESSAGE);
  });

  it("over the daily message cap the window stretches to an hour (protects the LINE quota)", () => {
    let q = emptyQueue();
    const s = { ...S, maxBatchesPerDay: 2 };
    for (let i = 0; i < 2; i++) {
      q = add(q, { kind: "needs_decision", key: `x${i}`, title: "x" }, T0);
      q = flushNotifications(q, s, T0, { force: true }).queue;
    }
    q = add(q, ALL_KINDS[0], T0);
    expect(shouldFlush(q, s, T0 + S.batchWindowMs)).toBe(false);
    expect(shouldFlush(q, s, T0 + 60 * 60_000)).toBe(true);
  });

  it("Phase 1 sender is mock only: nothing is delivered, real LINE is refused", async () => {
    const mock = new MockLineSender();
    let q = add(emptyQueue(), ALL_KINDS[0]);
    const { batch } = flushNotifications(q, S, T0, { force: true });
    expect(await mock.send(batch!)).toEqual({ delivered: false, simulated: true });
    expect(mock.outbox).toHaveLength(1);
    expect(senderFor("mock").channel).toBe("line-mock");
    expect(() => senderFor("line")).toThrow(/owner/);
  });
});
