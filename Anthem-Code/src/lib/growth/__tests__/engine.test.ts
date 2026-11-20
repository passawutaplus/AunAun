import { describe, expect, it } from "vitest";
import {
  GrowthError,
  TRANSITIONS,
  approvePlatforms,
  buildIdempotencyKey,
  canTransition,
  dispatchDueJobs,
  feedQc,
  isPlatformApproved,
  latestVersion,
  platformApprovalState,
  preflight,
  rejectCampaign,
  reviseCampaign,
  scheduleApproved,
  toggleLock,
  transition,
} from "../engine";
import { canonicalJson, contentHash } from "../hash";
import { planRevision, reduceLines } from "../revision";
import { budgetAlertLevel, claimNextTask, completeTask, effectiveCreditStatus, enqueueTask, startNewCreditCycle } from "../tasks";
import { DEMO_COMMENT, OWNER, SYSTEM, seedCampaigns, seedSettings, seedTasks } from "../mockData";
import type { Actor, Campaign, CampaignStatus, GeSettings, Platform } from "../types";

const AT = "2026-11-20T03:00:00.000Z";
const AGENT: Actor = { kind: "agent", id: "copy-agent", name: "Copy agent" };
const LATER = Date.parse("2026-12-01T00:00:00.000Z");
const ALL: Platform[] = ["instagram", "facebook", "threads", "pinterest", "blog"];

const portfolio = (): Campaign => seedCampaigns()[0];
const settings = (patch: Partial<GeSettings> = {}): GeSettings => ({ ...seedSettings(), ...patch });

function demoRevision(c = portfolio()) {
  return reviseCampaign(c, { scope: "IMAGE_FRAME", targetId: "frame-2", body: DEMO_COMMENT }, OWNER, AT);
}

describe("hash", () => {
  it("ignores key order and changes on any content change", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
    expect(contentHash({ a: 1, b: 2 })).toBe(contentHash({ b: 2, a: 1 }));
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
  });
});

describe("state transitions", () => {
  it("walks the main path one step at a time", () => {
    const path: CampaignStatus[] = [
      "SIGNAL_FOUND", "VERIFIED", "PROPOSED", "BRIEF_APPROVED", "DRAFTING", "VISUAL_READY", "ADAPTED",
      "QC_PASSED", "AWAITING_APPROVAL", "APPROVED", "SCHEDULED", "PUBLISHING", "PUBLISHED", "MONITORING", "LEARNED",
    ];
    for (let i = 1; i < path.length; i++) expect(canTransition(path[i - 1], path[i]), `${path[i - 1]} → ${path[i]}`).toBe(true);
  });

  it("refuses to skip steps", () => {
    expect(canTransition("DRAFTING", "APPROVED")).toBe(false);
    expect(canTransition("AWAITING_APPROVAL", "SCHEDULED")).toBe(false);
    expect(canTransition("QC_PASSED", "APPROVED")).toBe(false);
    expect(canTransition("CHANGES_REQUESTED", "AWAITING_APPROVAL")).toBe(false);
    expect(() => transition(portfolio(), "PUBLISHED", OWNER, AT)).toThrowError(GrowthError);
  });

  it("ARCHIVED is terminal and every target is a known state", () => {
    expect(TRANSITIONS.ARCHIVED).toEqual([]);
    const states = Object.keys(TRANSITIONS);
    for (const targets of Object.values(TRANSITIONS)) for (const t of targets) expect(states).toContain(t);
  });

  it("records an audit row and remembers where PAUSED came from", () => {
    const c = transition(portfolio(), "PAUSED", OWNER, AT);
    expect(c.pausedFrom).toBe("AWAITING_APPROVAL");
    expect(c.audit.slice(-1)[0]?.action).toBe("status.change");
  });
});

describe("per-platform approval", () => {
  it("only the owner can approve", () => {
    expect(() => approvePlatforms(portfolio(), ["instagram"], AGENT, AT)).toThrowError(/owner/);
  });

  it("approving FB only keeps IG unpublishable", () => {
    let c = portfolio();
    expect(isPlatformApproved(c, "facebook")).toBe(true); // seeded
    expect(isPlatformApproved(c, "instagram")).toBe(false);
    const { campaign, created } = scheduleApproved(c, SYSTEM, AT);
    c = campaign;
    expect(created.map((j) => j.platform)).toEqual(["facebook"]);
    // A hand-made IG job (e.g. a bug) must still be refused.
    const igJob = { ...created[0], id: "job-x", platform: "instagram" as Platform, idempotencyKey: "x", variantHash: latestVersion(c).variantHashes.instagram };
    expect(preflight(c, igJob, settings(), LATER)).toEqual({ ok: false, reason: "NOT_APPROVED" });
    const { results } = dispatchDueJobs(c, settings(), LATER, SYSTEM);
    expect(results).toEqual([{ jobId: "job-1", platform: "facebook", outcome: "exported" }]);
  });

  it("campaign becomes APPROVED only when every platform is approved", () => {
    let c = approvePlatforms(portfolio(), ["instagram", "threads"], OWNER, AT);
    expect(c.status).toBe("AWAITING_APPROVAL");
    c = approvePlatforms(c, ["pinterest", "blog"], OWNER, AT);
    expect(c.status).toBe("APPROVED");
    expect(c.approvals.every((a) => a.approverId === OWNER.id)).toBe(true);
  });
});

describe("comment → revision", () => {
  it("parses the demo comment: target frame 2, reduce 30%, protect frame 3", () => {
    const plan = planRevision({ scope: "IMAGE_FRAME", targetId: "frame-2", body: DEMO_COMMENT }, latestVersion(portfolio()));
    expect(plan.targets).toEqual(["frame-2"]);
    expect(plan.protect).toEqual(["frame-3"]);
    expect(plan.ops).toEqual([{ op: "reduce_text", pct: 30 }]);
    expect(plan.understood).toBe(true);
  });

  it("creates v2, cuts frame 2 text by about 30%, returns to AWAITING_APPROVAL", () => {
    const { campaign, outcome } = demoRevision();
    expect(outcome.kind).toBe("revised");
    if (outcome.kind !== "revised") return;
    expect(campaign.versions.map((v) => v.version)).toEqual([1, 2]);
    expect(campaign.status).toBe("AWAITING_APPROVAL");
    const [change] = outcome.summary.modified;
    expect(change.componentId).toBe("frame-2");
    const chars = (c: typeof change.before) => (c.kind === "frame" ? c.content.lines.join("").length : 0);
    const cut = 1 - chars(change.after) / chars(change.before);
    expect(cut).toBeGreaterThanOrEqual(0.25);
    expect(cut).toBeLessThanOrEqual(0.45);
    expect(campaign.comments.slice(-1)[0]).toMatchObject({ status: "RESOLVED_BY_AI", resolvedInVersion: 2 });
    // v1 is untouched (append-only).
    expect(campaign.versions[0].contentHash).toBe(portfolio().versions[0].contentHash);
    expect(campaign.versions[1].contentHash).not.toBe(campaign.versions[0].contentHash);
    expect(Object.isFrozen(campaign.versions[1])).toBe(true);
  });

  it("locked components stay byte-for-byte the same", () => {
    const before = latestVersion(portfolio());
    const { campaign, outcome } = demoRevision();
    const after = latestVersion(campaign);
    expect(campaign.locks).toContain("frame-3");
    expect(after.componentHashes["frame-3"]).toBe(before.componentHashes["frame-3"]);
    expect(after.components["frame-3"]).toEqual(before.components["frame-3"]);
    if (outcome.kind === "revised") expect(outcome.summary.keptLocked).toContain("frame-3");
    // Everything not targeted is unchanged too.
    for (const id of Object.keys(before.components)) {
      if (id === "frame-2") continue;
      expect(after.componentHashes[id], id).toBe(before.componentHashes[id]);
    }
  });

  it("a comment that only targets a locked frame makes no new version", () => {
    const c = toggleLock(portfolio(), "frame-4", OWNER, AT);
    const { campaign, outcome } = reviseCampaign(c, { scope: "IMAGE_FRAME", targetId: "frame-4", body: "ลดข้อความ 50%" }, OWNER, AT);
    expect(outcome.kind).toBe("needs_decision");
    expect(campaign.versions).toHaveLength(1);
    expect(campaign.comments.slice(-1)[0]?.status).toBe("NEEDS_OWNER_DECISION");
  });

  it("re-renders derived components unless they are locked", () => {
    const r1 = reviseCampaign(portfolio(), { scope: "IMAGE_FRAME", targetId: "frame-4", body: "ลดข้อความ 50%" }, OWNER, AT);
    expect(r1.outcome.kind).toBe("revised");
    // frame-4 has 2 short lines: the last one goes, the headline (used by the pin) stays → pin unchanged.
    expect(latestVersion(r1.campaign).componentHashes["pin:checklist"]).toBe(latestVersion(portfolio()).componentHashes["pin:checklist"]);
  });

  it("unknown instructions go to the owner instead of guessing", () => {
    const { outcome } = reviseCampaign(portfolio(), { scope: "CAMPAIGN", body: "ขอแบบปัง ๆ" }, OWNER, AT);
    expect(outcome.kind).toBe("needs_decision");
  });

  it("feed comment rebalances three dark tiles in a row", () => {
    const v1 = latestVersion(portfolio());
    expect(v1.qc.checks.find((c) => c.id === "feed-tone-run")?.level).toBe("warn");
    const { campaign } = reviseCampaign(portfolio(), { scope: "FEED", body: "อย่าให้โพสต์พื้นดำ 3 ชิ้นติดกัน" }, OWNER, AT);
    const feed = latestVersion(campaign).components["feed:grid"];
    expect(feed.kind === "feed" && feedQc(feed.content.tiles).find((c) => c.id === "feed-tone-run")?.level).toBe("pass");
    expect(feed.kind === "feed" && feed.content.tiles[0].own).toBe(true);
  });

  it("reduceLines keeps at least one line", () => {
    expect(reduceLines(["only one line here"], 50)).toHaveLength(1);
    expect(reduceLines(["a".repeat(10), "b".repeat(10), "c".repeat(10)], 30)).toEqual(["a".repeat(10), "b".repeat(10)]);
  });
});

describe("approval invalidation on change", () => {
  it("revising frame 2 invalidates IG only; FB keeps its v1 approval (same hash)", () => {
    let c = approvePlatforms(portfolio(), ["instagram", "threads"], OWNER, AT);
    expect(isPlatformApproved(c, "instagram")).toBe(true);
    const { campaign, outcome } = demoRevision(c);
    c = campaign;
    expect(platformApprovalState(c, "instagram").state).toBe("STALE");
    expect(isPlatformApproved(c, "facebook")).toBe(true);
    expect(isPlatformApproved(c, "threads")).toBe(true);
    if (outcome.kind === "revised") expect(outcome.summary.affectedPlatforms).toEqual(["instagram"]);
    expect(c.audit.some((a) => a.action === "approval.invalidated" && a.detail === "instagram")).toBe(true);
  });

  it("a revision after scheduling revokes the affected job and the publisher refuses it", () => {
    let c = approvePlatforms(portfolio(), ALL.filter((p) => p !== "facebook"), OWNER, AT);
    expect(c.status).toBe("APPROVED");
    c = scheduleApproved(c, SYSTEM, AT).campaign;
    expect(c.status).toBe("SCHEDULED");
    const { campaign, outcome } = demoRevision(c);
    c = campaign;
    if (outcome.kind === "revised") expect(outcome.revokedJobs).toHaveLength(1);
    expect(c.jobs.find((j) => j.platform === "instagram")?.status).toBe("REVOKED");
    expect(c.jobs.find((j) => j.platform === "facebook")?.status).toBe("SCHEDULED");
    const { results } = dispatchDueJobs(c, settings(), LATER, SYSTEM);
    // Campaign is back to AWAITING_APPROVAL: unchanged platforms may go, IG may not.
    expect(results.map((r) => r.platform)).not.toContain("instagram");
  });

  it("re-approving v2 lets IG through with the v2 hash", () => {
    let c = demoRevision().campaign;
    c = approvePlatforms(c, ["instagram"], OWNER, AT);
    const ig = c.approvals.filter((a) => a.platform === "instagram").slice(-1)[0];
    expect(ig?.version).toBe(2);
    expect(ig?.approvedHash).toBe(latestVersion(c).variantHashes.instagram);
  });

  it("rejecting cancels scheduled jobs", () => {
    let c = scheduleApproved(portfolio(), SYSTEM, AT).campaign;
    c = rejectCampaign(c, OWNER, AT, "ไม่ใช่ทิศทาง");
    expect(c.status).toBe("REJECTED");
    expect(c.jobs.every((j) => j.status === "CANCELLED")).toBe(true);
  });
});

describe("Pause All", () => {
  it("blocks every dispatch and leaves jobs in place", () => {
    const c = scheduleApproved(portfolio(), SYSTEM, AT).campaign;
    const { campaign, results } = dispatchDueJobs(c, settings({ pauseAll: true }), LATER, SYSTEM);
    expect(results).toEqual([{ jobId: "job-1", platform: "facebook", outcome: "blocked", reason: "PAUSED_ALL" }]);
    expect(campaign.publications).toHaveLength(0);
    expect(campaign.jobs[0].status).toBe("SCHEDULED");
  });

  it("stops agents from claiming tasks", () => {
    const r = claimNextTask(seedTasks(), settings({ pauseAll: true }), "w1", LATER);
    expect(r.claimed).toBeNull();
    expect(r.reason).toBe("PAUSED_ALL");
  });
});

describe("idempotency", () => {
  it("uses campaign:platform:version:UTC-slot", () => {
    expect(buildIdempotencyKey("c1", "instagram", 4, "2026-11-23T12:00:00+07:00")).toBe("c1:instagram:v4:2026-11-23T05:00Z");
  });

  it("scheduling twice creates one job", () => {
    const once = scheduleApproved(portfolio(), SYSTEM, AT).campaign;
    const twice = scheduleApproved(once, SYSTEM, AT);
    expect(twice.created).toHaveLength(0);
    expect(twice.skipped.find((s) => s.platform === "facebook")?.reason).toBe("ALREADY_SCHEDULED");
    expect(twice.campaign.jobs).toHaveLength(1);
  });

  it("never publishes the same key twice", () => {
    let c = scheduleApproved(portfolio(), SYSTEM, AT).campaign;
    c = dispatchDueJobs(c, settings(), LATER, SYSTEM).campaign;
    expect(c.publications).toHaveLength(1);
    // A duplicate job row with the same key (retry bug, double cron) is refused.
    c = { ...c, jobs: [...c.jobs, { ...c.jobs[0], id: "job-dup", status: "SCHEDULED" }] };
    const second = dispatchDueJobs(c, settings(), LATER, SYSTEM);
    expect(second.results).toEqual([{ jobId: "job-dup", platform: "facebook", outcome: "blocked", reason: "DUPLICATE" }]);
    expect(second.campaign.publications).toHaveLength(1);
  });

  it("an unknown publish result must be reconciled before any retry", () => {
    let c = scheduleApproved(portfolio(), SYSTEM, AT).campaign;
    c = { ...c, jobs: c.jobs.map((j) => ({ ...j, status: "PUBLISH_STATUS_UNKNOWN" as const })) };
    expect(dispatchDueJobs(c, settings(), LATER, SYSTEM).results[0].reason).toBe("NEEDS_RECONCILE");
  });

  it("mock mode exports a simulated manual draft, never a fake 'published'", () => {
    let c = scheduleApproved(portfolio(), SYSTEM, AT).campaign;
    c = dispatchDueJobs(c, settings(), LATER, SYSTEM).campaign;
    expect(c.jobs[0].status).toBe("EXPORTED_FOR_MANUAL_POST");
    expect(c.publications[0]).toMatchObject({ kind: "manual_export", simulated: true, remoteId: null });
  });

  it("does not send before the slot", () => {
    const c = scheduleApproved(portfolio(), SYSTEM, AT).campaign;
    expect(dispatchDueJobs(c, settings(), Date.parse(AT), SYSTEM).results[0].reason).toBe("NOT_DUE");
  });

  it("enqueueTask dedupes by idempotency key", () => {
    const tasks = seedTasks();
    expect(enqueueTask(tasks, { ...tasks[0], id: "again" }).added).toBe(false);
  });
});

describe("agent tasks: lease + BLOCKED_BUDGET", () => {
  const NOW = Date.parse("2026-11-21T00:00:00.000Z");

  it("respects dependencies and leases", () => {
    const s = settings();
    const a = claimNextTask(seedTasks(), s, "w1", NOW);
    expect(a.claimed?.id).toBe("task-research");
    // task-score depends on research → not claimable yet; next free one is listen.
    const b = claimNextTask(a.tasks, s, "w2", NOW);
    expect(b.claimed?.id).toBe("task-listen");
    // Lease still valid: w3 cannot steal research.
    const c = claimNextTask(b.tasks, s, "w3", NOW);
    expect(c.claimed?.id).toBe("task-qa");
    // After the lease expires, research can be re-claimed.
    const d = claimNextTask(c.tasks, s, "w4", NOW + 10 * 60_000);
    expect(d.claimed).toMatchObject({ id: "task-research", claimedBy: "w4", attempts: 2 });
    // The old worker can no longer finish it.
    expect(completeTask(d.tasks, "task-research", "w1", true).find((t) => t.id === "task-research")?.status).toBe("CLAIMED");
  });

  it("credit exhausted → AI tasks BLOCKED_BUDGET, non-AI tasks still run, one notice per cycle", () => {
    const s = settings({ aiCredit: { ...seedSettings().aiCredit, status: "EXHAUSTED", cycleStart: "cycle-1", source: "mock" } });
    const r = claimNextTask(seedTasks(), s, "w1", NOW);
    expect(r.tasks.filter((t) => t.usesAi).every((t) => t.status === "BLOCKED_BUDGET")).toBe(true);
    expect(r.claimed?.usesAi).toBe(false);
    expect(r.budgetNoticeQueued).toBe(true);
    const again = claimNextTask(r.tasks, r.settings, "w2", NOW);
    expect(again.budgetNoticeQueued).toBe(false);
  });

  it("hitting the owner's cap counts as exhausted; a new cycle resumes", () => {
    const s = settings({ aiCredit: { ...seedSettings().aiCredit, status: "AVAILABLE", capUsd: 10, spentEstimateUsd: 10, cycleStart: "c1", source: "estimate" } });
    expect(effectiveCreditStatus(s)).toBe("EXHAUSTED");
    expect(budgetAlertLevel(7, 10)).toBe(70);
    expect(budgetAlertLevel(9.5, 10)).toBe(90);
    expect(budgetAlertLevel(1, null)).toBeNull();
    const blocked = claimNextTask(seedTasks(), s, "w1", NOW);
    const resumed = startNewCreditCycle(blocked.tasks, blocked.settings, "c2");
    expect(resumed.tasks.some((t) => t.status === "BLOCKED_BUDGET")).toBe(false);
    expect(effectiveCreditStatus(resumed.settings)).toBe("AVAILABLE");
  });
});
