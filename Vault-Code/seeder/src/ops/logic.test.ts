import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { alertsFor, failingSources, formatReportText, healthDecision, type DailyStats } from "./logic";

const base: DailyStats = {
  day: "2026-10-04", fetched: 40, published: 12, review: 5, rejected: { duplicate_phash: 3, low_quality: 2 }, hidden: 1, failures: [],
  aiCostUsd: 0.12, aiCalls: 30, monthUsd: 1.5, monthlyBudgetUsd: 5, capsReached: [], killSwitch: false, failingSources: [],
  topUnknownTerms: [], dsarDue: [], reviewQueue: 5, openReports: 0,
};

describe("link health", () => {
  test("hides only after N consecutive failures", () => {
    let fails = 0;
    const steps = [false, false, false].map((ok) => { const d = healthDecision(fails, ok, false); fails = d.failCount; return d; });
    assert.deepEqual(steps.map((s) => s.hide), [false, false, true]);
  });
  test("a success resets the counter and restores only what health hid", () => {
    assert.deepEqual(healthDecision(2, true, false), { failCount: 0, hide: false, restore: false });
    assert.deepEqual(healthDecision(3, true, true), { failCount: 0, hide: false, restore: true });
  });
});

describe("daily report", () => {
  test("a calm day has no alerts and says so", () => {
    const text = formatReportText(base, alertsFor(base));
    assert.match(text, /ไม่มีเรื่องด่วน/);
    assert.match(text, /เผยแพร่ 12/);
    assert.match(text, /duplicate_phash 3/);
  });
  test("urgent alerts only for real problems: cap, kill switch, source down, overdue DSAR", () => {
    const bad: DailyStats = { ...base, capsReached: ["daily_ai_cap"], killSwitch: true, failingSources: ["cma"], dsarDue: [{ id: "d1", due_at: "2026-10-01T00:00:00Z" }] };
    const alerts = alertsFor(bad, new Date("2026-10-04T00:00:00Z"));
    assert.equal(alerts.filter((a) => a.severity === "urgent").length, 4);
    const text = formatReportText(bad, alerts);
    assert.match(text, /\[ด่วน\]/);
  });
  test("budget at 80% is only a watch item; open reports are a watch item", () => {
    const alerts = alertsFor({ ...base, monthUsd: 4.2, openReports: 2 });
    assert.ok(alerts.every((a) => a.severity === "warn"));
    assert.equal(alerts.length, 2);
  });
  test("lists failures, unknown terms and due data requests", () => {
    const text = formatReportText({ ...base, failures: [{ job: "seeder-batch", error: "boom" }], topUnknownTerms: [{ term: "ญี่ปุ่น", lang: "th", count: 7 }], dsarDue: [{ id: "d2", due_at: "2026-10-20T00:00:00Z" }] }, []);
    assert.match(text, /seeder-batch: boom/);
    assert.match(text, /ญี่ปุ่น \(th\) x7/);
    assert.match(text, /d2 ครบ 2026-10-20/);
  });
});

describe("source health", () => {
  test("flags enabled sources with nothing published for 2+ days", () => {
    const now = new Date("2026-10-04T00:00:00Z");
    assert.deepEqual(failingSources(["met", "cma", "aic"], { met: "2026-10-03T10:00:00Z", cma: "2026-09-29T00:00:00Z", aic: null }, now), ["cma", "aic"]);
  });
});
