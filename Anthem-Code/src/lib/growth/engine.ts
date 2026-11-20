/**
 * SAMECOR Growth Engine: pure workflow logic (no I/O, no AI, no network).
 *
 * - campaign state machine (spec §2, no skipping steps)
 * - immutable versions with per-component and per-platform hashes
 * - approvals bound to platform hashes: any change to what a platform shows invalidates its approval
 * - comment → mock revision (v+1) that never touches locked components
 * - publish preflight: Pause All, approval hash, idempotency, reconcile-before-retry
 *
 * The same rules are enforced again in SQL by the draft `growth` migration.
 */
import { contentHash } from "./hash";
import { planRevision, applyPlan, type RevisionInput } from "./revision";
import type {
  Actor,
  Approval,
  ArtifactComponent,
  AuditEntry,
  Campaign,
  CampaignStatus,
  CampaignVersion,
  ChangeSummary,
  DispatchBlockReason,
  FeedTile,
  GeSettings,
  OwnerComment,
  Platform,
  PlatformVariantDef,
  Publication,
  PublishJob,
  PublishJobStatus,
  QcCheck,
  QcLevel,
  QcReport,
  VersionAuthor,
} from "./types";

export class GrowthError extends Error {
  constructor(
    public code:
      | "INVALID_TRANSITION"
      | "AI_CANNOT_APPROVE"
      | "NOT_AWAITING_APPROVAL"
      | "QC_FAILED"
      | "NOT_REVISABLE"
      | "UNKNOWN_PLATFORM",
    message: string,
  ) {
    super(message);
    this.name = "GrowthError";
  }
}

/* ------------------------------------------------------------------ */
/* State machine                                                       */
/* ------------------------------------------------------------------ */

export const TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  SIGNAL_FOUND: ["VERIFIED", "NEEDS_VERIFY", "ARCHIVED"],
  NEEDS_VERIFY: ["VERIFIED", "QC_PASSED", "REGENERATING", "ARCHIVED"],
  VERIFIED: ["PROPOSED", "ARCHIVED"],
  PROPOSED: ["BRIEF_APPROVED", "REJECTED", "ARCHIVED"],
  BRIEF_APPROVED: ["DRAFTING", "PAUSED"],
  DRAFTING: ["VISUAL_READY", "NEEDS_VERIFY", "PAUSED"],
  VISUAL_READY: ["ADAPTED", "PAUSED"],
  ADAPTED: ["QC_PASSED", "NEEDS_VERIFY", "REGENERATING"],
  QC_PASSED: ["AWAITING_APPROVAL"],
  AWAITING_APPROVAL: ["APPROVED", "CHANGES_REQUESTED", "REJECTED", "PAUSED"],
  CHANGES_REQUESTED: ["REGENERATING"],
  REGENERATING: ["QC_PASSED", "NEEDS_VERIFY"],
  APPROVED: ["SCHEDULED", "CHANGES_REQUESTED", "PAUSED", "EXPORTED_FOR_MANUAL_POST", "REJECTED"],
  SCHEDULED: ["PUBLISHING", "CHANGES_REQUESTED", "PAUSED", "EXPORTED_FOR_MANUAL_POST", "REJECTED"],
  PUBLISHING: ["PUBLISHED", "PUBLISH_FAILED"],
  PUBLISH_FAILED: ["SCHEDULED", "ARCHIVED"],
  EXPORTED_FOR_MANUAL_POST: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["MONITORING"],
  MONITORING: ["LEARNED"],
  LEARNED: ["ARCHIVED"],
  PAUSED: ["BRIEF_APPROVED", "DRAFTING", "VISUAL_READY", "AWAITING_APPROVAL", "APPROVED", "SCHEDULED"],
  REJECTED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Campaign states where a comment can start a revision. */
export const REVISABLE_STATUSES: readonly CampaignStatus[] = ["AWAITING_APPROVAL", "APPROVED", "SCHEDULED"];
/** Campaign states that must never send anything out. */
export const NON_PUBLISHABLE_STATUSES: readonly CampaignStatus[] = [
  "PAUSED",
  "REJECTED",
  "ARCHIVED",
  "CHANGES_REQUESTED",
  "REGENERATING",
  "NEEDS_VERIFY",
];

type AuditInput = Pick<AuditEntry, "action"> & Partial<Pick<AuditEntry, "fromVersion" | "toVersion" | "detail">>;

/** Append audit rows (ids stay sequential). Audit is append-only, like growth.ge_audit_logs. */
function withAudit(c: Campaign, actor: Actor, at: string, ...entries: AuditInput[]): Campaign {
  const rows = entries.map((e, i) => ({ id: `aud-${c.audit.length + i + 1}`, at, actor, resource: `campaign:${c.id}`, ...e }));
  return { ...c, audit: [...c.audit, ...rows] };
}

export function transition(c: Campaign, to: CampaignStatus, actor: Actor, at: string): Campaign {
  if (!canTransition(c.status, to)) {
    throw new GrowthError("INVALID_TRANSITION", `${c.status} → ${to} is not allowed`);
  }
  const next: Campaign = {
    ...c,
    status: to,
    pausedFrom: to === "PAUSED" ? c.status : c.status === "PAUSED" ? undefined : c.pausedFrom,
  };
  return withAudit(next, actor, at, { action: "status.change", detail: `${c.status} → ${to}` });
}

/* ------------------------------------------------------------------ */
/* Versions + hashes                                                   */
/* ------------------------------------------------------------------ */

export function latestVersion(c: Campaign): CampaignVersion {
  return c.versions[c.versions.length - 1];
}

export function componentHash(component: ArtifactComponent): string {
  return contentHash({ id: component.id, kind: component.kind, content: component.content, derivedFrom: component.derivedFrom ?? [] });
}

export function variantHash(def: PlatformVariantDef, componentHashes: Record<string, string>): string {
  return contentHash({
    platform: def.platform,
    canvas: def.canvas,
    components: def.componentIds.map((id) => [id, componentHashes[id] ?? "missing"]),
    scheduledAt: toUtcMinute(def.scheduledAt),
  });
}

export function buildVersion(input: {
  version: number;
  createdAt: string;
  createdBy: VersionAuthor;
  components: ArtifactComponent[] | Record<string, ArtifactComponent>;
  variants: PlatformVariantDef[];
  changeSummary?: ChangeSummary;
}): CampaignVersion {
  const list = Array.isArray(input.components) ? input.components : Object.values(input.components);
  const components: Record<string, ArtifactComponent> = {};
  const componentHashes: Record<string, string> = {};
  for (const comp of list) {
    components[comp.id] = comp;
    componentHashes[comp.id] = componentHash(comp);
  }
  const variantHashes = {} as Record<Platform, string>;
  for (const def of input.variants) variantHashes[def.platform] = variantHash(def, componentHashes);
  const version: CampaignVersion = {
    version: input.version,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    components,
    componentHashes,
    variants: input.variants,
    variantHashes,
    contentHash: contentHash({ componentHashes, variantHashes }),
    changeSummary: input.changeSummary,
    qc: { level: "pass", checks: [] },
  };
  return Object.freeze({ ...version, qc: runQc(version) });
}

/* ------------------------------------------------------------------ */
/* QC (mock, deterministic)                                            */
/* ------------------------------------------------------------------ */

export const FRAME_TEXT_DENSE_CHARS = 110;

export function frameTextChars(c: ArtifactComponent): number {
  if (c.kind !== "frame") return 0;
  return c.content.lines.reduce((n, l) => n + l.length, 0);
}

const LEVEL_RANK: Record<QcLevel, number> = { pass: 0, warn: 1, fail: 2 };
function worst(levels: QcLevel[]): QcLevel {
  return levels.reduce<QcLevel>((w, l) => (LEVEL_RANK[l] > LEVEL_RANK[w] ? l : w), "pass");
}

export function feedQc(tiles: FeedTile[]): QcCheck[] {
  const checks: QcCheck[] = [];
  const heavy = tiles.filter((t) => t.textHeavy).length;
  checks.push({
    id: "feed-text-heavy",
    label: "ปกตัวหนังสือเยอะ ≤ 3/9",
    level: heavy > 3 ? "warn" : "pass",
    detail: `${heavy}/9 ช่อง`,
    componentId: "feed:grid",
  });
  let run = 1;
  let runAt = -1;
  for (let i = 1; i < tiles.length; i++) {
    run = tiles[i].tone === tiles[i - 1].tone ? run + 1 : 1;
    if (run >= 3 && runAt < 0) runAt = i - 2;
  }
  checks.push({
    id: "feed-tone-run",
    label: "ไม่มีพื้นสีเดียวกัน 3 ช่องติด",
    level: runAt >= 0 ? "warn" : "pass",
    detail: runAt >= 0 ? `ช่อง ${runAt + 1}–${runAt + 3} โทนเดียวกัน` : "สมดุลดี",
    componentId: "feed:grid",
  });
  let sameRecipe = 1;
  let recipeRun = false;
  for (let i = 1; i < tiles.length; i++) {
    sameRecipe = tiles[i].recipe === tiles[i - 1].recipe ? sameRecipe + 1 : 1;
    if (sameRecipe >= 3) recipeRun = true;
  }
  checks.push({
    id: "feed-recipe-run",
    label: "ไม่ใช้ template เดียวกัน 3 โพสต์ติด",
    level: recipeRun ? "warn" : "pass",
    detail: recipeRun ? "มี template ซ้ำ 3 ช่องติด" : "ผ่าน",
    componentId: "feed:grid",
  });
  return checks;
}

export function runQc(v: Pick<CampaignVersion, "components">): QcReport {
  const checks: QcCheck[] = [];
  for (const comp of Object.values(v.components)) {
    if (comp.kind === "frame") {
      const chars = frameTextChars(comp);
      checks.push({
        id: `density:${comp.id}`,
        label: `${comp.label}: ความแน่นตัวหนังสือ`,
        level: chars > FRAME_TEXT_DENSE_CHARS ? "warn" : "pass",
        detail: `${chars} ตัวอักษร (เกณฑ์ ≤ ${FRAME_TEXT_DENSE_CHARS})`,
        componentId: comp.id,
      });
    } else if (comp.kind === "copy" && comp.id === "copy:threads") {
      const len = comp.content.text.length;
      checks.push({
        id: "threads-length",
        label: "Threads: ยาวไม่เกิน 500",
        level: len > 500 ? "fail" : "pass",
        detail: `${len} ตัวอักษร`,
        componentId: comp.id,
      });
    } else if (comp.kind === "copy" && comp.id === "copy:instagram") {
      const n = comp.content.hashtags.length;
      checks.push({
        id: "ig-hashtags",
        label: "IG: hashtag ไม่เกิน 5",
        level: n > 5 ? "warn" : "pass",
        detail: `${n} แท็ก`,
        componentId: comp.id,
      });
    } else if (comp.kind === "seo_meta") {
      const t = comp.content.title.length;
      const d = comp.content.metaDescription.length;
      checks.push({
        id: "seo-title",
        label: "SEO title 30–60",
        level: t >= 30 && t <= 60 ? "pass" : "warn",
        detail: `${t} ตัวอักษร`,
        componentId: comp.id,
      });
      checks.push({
        id: "seo-meta",
        label: "Meta description 70–160",
        level: d >= 70 && d <= 160 ? "pass" : "warn",
        detail: `${d} ตัวอักษร`,
        componentId: comp.id,
      });
    } else if (comp.kind === "feed") {
      checks.push(...feedQc(comp.content.tiles));
    }
  }
  return { level: worst(checks.map((c) => c.level)), checks };
}

/* ------------------------------------------------------------------ */
/* Approvals                                                           */
/* ------------------------------------------------------------------ */

export type PlatformApprovalState = "APPROVED" | "AWAITING" | "STALE";

export function platformsOf(v: CampaignVersion): Platform[] {
  return v.variants.map((d) => d.platform);
}

/** Valid only when an approval's hash equals the platform's hash in the latest version. */
export function platformApprovalState(c: Campaign, platform: Platform): { state: PlatformApprovalState; approval?: Approval } {
  const hash = latestVersion(c).variantHashes[platform];
  const mine = c.approvals.filter((a) => a.platform === platform);
  const valid = [...mine].reverse().find((a) => a.approvedHash === hash);
  if (valid) return { state: "APPROVED", approval: valid };
  if (mine.length) return { state: "STALE", approval: mine[mine.length - 1] };
  return { state: "AWAITING" };
}

export function isPlatformApproved(c: Campaign, platform: Platform): boolean {
  return platformApprovalState(c, platform).state === "APPROVED";
}

export function approvalProgress(c: Campaign): { approved: number; total: number } {
  const ps = platformsOf(latestVersion(c));
  return { approved: ps.filter((p) => isPlatformApproved(c, p)).length, total: ps.length };
}

export function approvePlatforms(c: Campaign, platforms: Platform[], actor: Actor, at: string): Campaign {
  if (actor.kind !== "owner") throw new GrowthError("AI_CANNOT_APPROVE", "Only the owner can approve");
  if (c.status !== "AWAITING_APPROVAL") throw new GrowthError("NOT_AWAITING_APPROVAL", `Campaign is ${c.status}`);
  const v = latestVersion(c);
  if (v.qc.level === "fail") throw new GrowthError("QC_FAILED", "QC has a failing check");
  const known = platformsOf(v);
  let next: Campaign = c;
  for (const p of platforms) {
    if (!known.includes(p)) throw new GrowthError("UNKNOWN_PLATFORM", p);
    if (isPlatformApproved(next, p)) continue;
    const approval: Approval = {
      id: `apr-${next.approvals.length + 1}`,
      platform: p,
      version: v.version,
      approvedHash: v.variantHashes[p],
      approverId: actor.id,
      decidedAt: at,
    };
    next = withAudit({ ...next, approvals: [...next.approvals, approval] }, actor, at, {
      action: "approval.granted",
      toVersion: v.version,
      detail: `${p} ${approval.approvedHash}`,
    });
  }
  if (known.every((p) => isPlatformApproved(next, p))) next = transition(next, "APPROVED", actor, at);
  return next;
}

export function rejectCampaign(c: Campaign, actor: Actor, at: string, reason: string): Campaign {
  if (actor.kind !== "owner") throw new GrowthError("AI_CANNOT_APPROVE", "Only the owner can reject");
  const next = transition(c, "REJECTED", actor, at);
  const jobs = next.jobs.map((j) => (j.status === "SCHEDULED" ? { ...j, status: "CANCELLED" as PublishJobStatus } : j));
  return withAudit({ ...next, jobs }, actor, at, { action: "campaign.rejected", detail: reason });
}

export function toggleLock(c: Campaign, componentId: string, actor: Actor, at: string): Campaign {
  const locked = c.locks.includes(componentId);
  const locks = locked ? c.locks.filter((id) => id !== componentId) : [...c.locks, componentId];
  return withAudit({ ...c, locks }, actor, at, { action: locked ? "lock.removed" : "lock.added", detail: componentId });
}

/* ------------------------------------------------------------------ */
/* Comment → revision                                                  */
/* ------------------------------------------------------------------ */

export type RevisionOutcome =
  | { kind: "revised"; version: CampaignVersion; summary: ChangeSummary; revokedJobs: string[] }
  | { kind: "needs_decision"; reason: string };

export function reviseCampaign(
  c: Campaign,
  input: RevisionInput,
  actor: Actor,
  at: string,
): { campaign: Campaign; outcome: RevisionOutcome; comment: OwnerComment } {
  if (actor.kind !== "owner") throw new GrowthError("AI_CANNOT_APPROVE", "Revisions start from an owner comment");
  if (!REVISABLE_STATUSES.includes(c.status)) throw new GrowthError("NOT_REVISABLE", `Campaign is ${c.status}`);

  const v = latestVersion(c);
  const comment: OwnerComment = {
    id: `cmt-${c.comments.length + 1}`,
    scope: input.scope,
    targetId: input.targetId,
    platform: input.platform,
    body: input.body.trim(),
    version: v.version,
    createdAt: at,
    status: "IN_PROGRESS",
  };
  const plan = planRevision(input, v);
  const locks = Array.from(new Set([...c.locks, ...plan.protect]));
  let next: Campaign = withAudit({ ...c, locks }, actor, at, {
    action: "comment.created",
    fromVersion: v.version,
    detail: `${comment.scope} ${comment.targetId ?? ""}`.trim(),
  });

  const stop = (reason: string) => {
    const done: OwnerComment = { ...comment, status: "NEEDS_OWNER_DECISION", aiNote: reason };
    return {
      campaign: { ...next, comments: [...next.comments, done] },
      outcome: { kind: "needs_decision" as const, reason },
      comment: done,
    };
  };

  if (!plan.understood) return stop(plan.note);
  const applied = applyPlan(plan, v, locks);
  if (applied.changes.length === 0) {
    return stop(applied.keptLocked.length ? "ทุกส่วนที่ชี้ถูกล็อกไว้ เลยไม่แก้อะไร" : "แก้แล้วผลเหมือนเดิม เลยไม่สร้างเวอร์ชันใหม่");
  }

  const draft = buildVersion({
    version: v.version + 1,
    createdAt: at,
    createdBy: "ai-mock",
    components: applied.components,
    variants: v.variants,
  });
  const affectedPlatforms = platformsOf(v).filter((p) => draft.variantHashes[p] !== v.variantHashes[p]);
  const summary: ChangeSummary = {
    fromVersion: v.version,
    toVersion: draft.version,
    commentId: comment.id,
    modified: applied.changes,
    keptLocked: applied.keptLocked,
    affectedPlatforms,
    text: summaryText(applied.changes, applied.keptLocked, affectedPlatforms, draft),
  };
  const version = Object.freeze({ ...draft, changeSummary: summary });

  const agent: Actor = { kind: "agent", id: "revision-agent", name: "Revision agent (mock)" };
  next = transition(next, "CHANGES_REQUESTED", actor, at);
  next = transition(next, "REGENERATING", agent, at);
  next = { ...next, versions: [...next.versions, version] };
  next = transition(next, version.qc.level === "fail" ? "NEEDS_VERIFY" : "QC_PASSED", agent, at);
  if (next.status === "QC_PASSED") next = transition(next, "AWAITING_APPROVAL", agent, at);

  const revokedJobs: string[] = [];
  next = {
    ...next,
    jobs: next.jobs.map((j) => {
      if (j.status === "SCHEDULED" && affectedPlatforms.includes(j.platform)) {
        revokedJobs.push(j.id);
        return { ...j, status: "REVOKED" as PublishJobStatus };
      }
      return j;
    }),
  };
  const resolved: OwnerComment = { ...comment, status: "RESOLVED_BY_AI", resolvedInVersion: version.version, aiNote: summary.text };
  next = withAudit(
    { ...next, comments: [...next.comments, resolved] },
    agent,
    at,
    { action: "version.created", fromVersion: v.version, toVersion: version.version, detail: version.contentHash },
    ...affectedPlatforms.map((p) => ({ action: "approval.invalidated", toVersion: version.version, detail: p })),
    ...revokedJobs.map((id) => ({ action: "job.revoked", detail: id })),
  );
  return { campaign: next, outcome: { kind: "revised", version, summary, revokedJobs }, comment: resolved };
}

function summaryText(changes: ChangeSummary["modified"], kept: string[], platforms: Platform[], v: CampaignVersion): string {
  const parts = [`Modified: ${changes.map((ch) => `${ch.label} (${ch.note})`).join(", ")}`];
  if (kept.length) parts.push(`Kept: ${kept.map((id) => v.components[id]?.label ?? id).join(", ")} (locked)`);
  parts.push(`Recheck QC: ${v.qc.level.toUpperCase()}`);
  parts.push(`Needs approval: ${platforms.join(", ")} v${v.version}`);
  return parts.join(". ");
}

/* ------------------------------------------------------------------ */
/* Publishing (Phase 1–3: manual export only)                          */
/* ------------------------------------------------------------------ */

export function toUtcMinute(iso: string): string {
  return `${new Date(iso).toISOString().slice(0, 16)}Z`;
}

/** Spec §11: campaign_id:platform:version:schedule_slot (slot in UTC, never local time). */
export function buildIdempotencyKey(campaignId: string, platform: Platform, version: number, scheduledAt: string): string {
  return `${campaignId}:${platform}:v${version}:${toUtcMinute(scheduledAt)}`;
}

const ACTIVE_JOB: readonly PublishJobStatus[] = ["SCHEDULED", "PUBLISHING", "PUBLISHED", "PUBLISH_STATUS_UNKNOWN", "EXPORTED_FOR_MANUAL_POST"];

export function scheduleApproved(
  c: Campaign,
  actor: Actor,
  at: string,
): { campaign: Campaign; created: PublishJob[]; skipped: { platform: Platform; reason: string }[] } {
  const v = latestVersion(c);
  const created: PublishJob[] = [];
  const skipped: { platform: Platform; reason: string }[] = [];
  if (NON_PUBLISHABLE_STATUSES.includes(c.status)) {
    return { campaign: c, created, skipped: platformsOf(v).map((platform) => ({ platform, reason: c.status })) };
  }
  let jobs = [...c.jobs];
  for (const def of v.variants) {
    const p = def.platform;
    if (!isPlatformApproved(c, p)) {
      skipped.push({ platform: p, reason: "NOT_APPROVED" });
      continue;
    }
    const slot = toUtcMinute(def.scheduledAt);
    if (jobs.some((j) => j.platform === p && toUtcMinute(j.scheduledAt) === slot && ACTIVE_JOB.includes(j.status))) {
      skipped.push({ platform: p, reason: "ALREADY_SCHEDULED" });
      continue;
    }
    const key = buildIdempotencyKey(c.id, p, v.version, def.scheduledAt);
    if (jobs.some((j) => j.idempotencyKey === key && j.status !== "REVOKED" && j.status !== "CANCELLED")) {
      skipped.push({ platform: p, reason: "DUPLICATE" });
      continue;
    }
    const job: PublishJob = {
      id: `job-${jobs.length + 1}`,
      campaignId: c.id,
      platform: p,
      version: v.version,
      variantHash: v.variantHashes[p],
      scheduledAt: def.scheduledAt,
      idempotencyKey: key,
      status: "SCHEDULED",
    };
    jobs = [...jobs, job];
    created.push(job);
  }
  let next = withAudit(
    { ...c, jobs },
    actor,
    at,
    ...created.map((j) => ({ action: "job.scheduled", toVersion: j.version, detail: j.idempotencyKey })),
  );
  const allScheduled = platformsOf(v).every((p) => next.jobs.some((j) => j.platform === p && ACTIVE_JOB.includes(j.status)));
  if (next.status === "APPROVED" && allScheduled) next = transition(next, "SCHEDULED", actor, at);
  return { campaign: next, created, skipped };
}

/** `reason` is set exactly when ok is false (kept flat: the app compiles with strict off, which breaks union narrowing). */
export type PreflightResult = { ok: boolean; reason?: DispatchBlockReason };

export function preflight(c: Campaign, job: PublishJob, settings: GeSettings, nowMs: number): PreflightResult {
  if (settings.pauseAll) return { ok: false, reason: "PAUSED_ALL" };
  if (job.status === "PUBLISH_STATUS_UNKNOWN") return { ok: false, reason: "NEEDS_RECONCILE" };
  if (job.status !== "SCHEDULED") return { ok: false, reason: "JOB_NOT_SCHEDULED" };
  if (c.publications.some((p) => p.idempotencyKey === job.idempotencyKey)) return { ok: false, reason: "DUPLICATE" };
  if (NON_PUBLISHABLE_STATUSES.includes(c.status)) return { ok: false, reason: "CAMPAIGN_NOT_PUBLISHABLE" };
  const { state } = platformApprovalState(c, job.platform);
  if (state === "AWAITING") return { ok: false, reason: "NOT_APPROVED" };
  if (state === "STALE") return { ok: false, reason: "STALE_APPROVAL" };
  if (job.variantHash !== latestVersion(c).variantHashes[job.platform]) return { ok: false, reason: "STALE_APPROVAL" };
  if (Date.parse(job.scheduledAt) > nowMs) return { ok: false, reason: "NOT_DUE" };
  return { ok: true };
}

export interface DispatchResult {
  jobId: string;
  platform: Platform;
  outcome: "exported" | "blocked";
  reason?: DispatchBlockReason;
}

/**
 * The 15-minute publisher tick. Phase 1–3 has no social API adapter, so a job that passes
 * preflight becomes a manual-export draft (EXPORTED_FOR_MANUAL_POST), never a fake "published".
 */
export function dispatchDueJobs(c: Campaign, settings: GeSettings, nowMs: number, actor: Actor): { campaign: Campaign; results: DispatchResult[] } {
  const results: DispatchResult[] = [];
  let publications: Publication[] = [...c.publications];
  const at = new Date(nowMs).toISOString();
  const jobs = c.jobs.map((job) => {
    if (job.status !== "SCHEDULED" && job.status !== "PUBLISH_STATUS_UNKNOWN") return job;
    const pf = preflight({ ...c, publications }, job, settings, nowMs);
    if (!pf.ok) {
      results.push({ jobId: job.id, platform: job.platform, outcome: "blocked", reason: pf.reason });
      return { ...job, lastBlockReason: pf.reason };
    }
    publications = [
      ...publications,
      {
        idempotencyKey: job.idempotencyKey,
        jobId: job.id,
        platform: job.platform,
        kind: "manual_export",
        simulated: settings.mode === "mock",
        remoteId: null,
        createdAt: at,
      },
    ];
    results.push({ jobId: job.id, platform: job.platform, outcome: "exported" });
    return { ...job, status: "EXPORTED_FOR_MANUAL_POST" as PublishJobStatus, lastBlockReason: undefined };
  });
  let next = withAudit(
    { ...c, jobs, publications },
    actor,
    at,
    ...results.map((r) => ({
      action: r.outcome === "exported" ? "job.exported" : "job.blocked",
      detail: `${r.platform}${r.reason ? ` ${r.reason}` : ""}`,
    })),
  );
  const v = latestVersion(next);
  const allExported = platformsOf(v).every((p) => next.jobs.some((j) => j.platform === p && j.status === "EXPORTED_FOR_MANUAL_POST"));
  if (next.status === "SCHEDULED" && allExported) next = transition(next, "EXPORTED_FOR_MANUAL_POST", actor, at);
  return { campaign: next, results };
}

export const BLOCK_REASON_TH: Record<DispatchBlockReason, string> = {
  PAUSED_ALL: "Pause All เปิดอยู่",
  CAMPAIGN_NOT_PUBLISHABLE: "แคมเปญยังไม่พร้อมโพสต์",
  NOT_APPROVED: "ยังไม่ได้ approve ช่องนี้",
  STALE_APPROVAL: "approve เวอร์ชันเก่า ต้อง approve ใหม่",
  DUPLICATE: "เคยส่งแล้ว (กันโพสต์ซ้ำ)",
  NOT_DUE: "ยังไม่ถึงเวลา",
  NEEDS_RECONCILE: "ต้องเช็กสถานะก่อนลองใหม่",
  JOB_NOT_SCHEDULED: "งานไม่ได้อยู่ในคิว",
};
