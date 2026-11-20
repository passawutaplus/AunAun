/**
 * Agent task queue rules (pure): lease/lock claiming, dependencies, Pause All, and the owner's
 * budget rule: when the monthly AI credit runs out, AI tasks stop as BLOCKED_BUDGET, one LINE
 * notice goes out, and they resume on the next credit cycle. Never auto-buy, never auto-reload.
 * SQL twin: growth.ge_claim_next_task() in the draft migration.
 */
import type { Actor, AgentTask, AiCreditStatus, AuditEntry, GeSettings } from "./types";

export const DEFAULT_LEASE_MS = 5 * 60_000;

/** Budget level from the owner's cap (null = no cap set → we cannot say). */
export function budgetAlertLevel(spentUsd: number, capUsd: number | null): 0 | 70 | 90 | 100 | null {
  if (capUsd == null || capUsd <= 0) return null;
  const r = spentUsd / capUsd;
  if (r >= 1) return 100;
  if (r >= 0.9) return 90;
  if (r >= 0.7) return 70;
  return 0;
}

export function effectiveCreditStatus(s: GeSettings): AiCreditStatus {
  const { status, capUsd, spentEstimateUsd } = s.aiCredit;
  if (status === "EXHAUSTED") return "EXHAUSTED";
  const level = budgetAlertLevel(spentEstimateUsd, capUsd);
  if (level === 100) return "EXHAUSTED";
  if (level === 90) return "LOW";
  return status;
}

function depsDone(t: AgentTask, all: AgentTask[]): boolean {
  return t.dependsOn.every((id) => all.find((x) => x.id === id)?.status === "DONE");
}

function claimable(t: AgentTask, nowMs: number): boolean {
  if (t.status === "QUEUED") return true;
  // A worker that died keeps its lease only until lease_until; then anyone may take the task.
  return (t.status === "CLAIMED" || t.status === "RUNNING") && !!t.leaseUntil && Date.parse(t.leaseUntil) <= nowMs;
}

export interface ClaimResult {
  tasks: AgentTask[];
  settings: GeSettings;
  claimed: AgentTask | null;
  reason?: "PAUSED_ALL" | "NONE_READY";
  /** true exactly once per credit cycle, when the first AI task gets blocked. */
  budgetNoticeQueued: boolean;
}

export function claimNextTask(tasks: AgentTask[], settings: GeSettings, workerId: string, nowMs: number, leaseMs = DEFAULT_LEASE_MS): ClaimResult {
  if (settings.pauseAll) return { tasks, settings, claimed: null, reason: "PAUSED_ALL", budgetNoticeQueued: false };

  const exhausted = effectiveCreditStatus(settings) === "EXHAUSTED";
  let blockedNow = 0;
  let next = tasks.map((t) => {
    if (exhausted && t.usesAi && claimable(t, nowMs)) {
      blockedNow++;
      return { ...t, status: "BLOCKED_BUDGET" as const, claimedBy: null, leaseUntil: null, blockedReason: "AI credit หมดรอบนี้ รอรอบใหม่" };
    }
    return t;
  });

  const cycle = settings.aiCredit.cycleStart ?? "unknown";
  const budgetNoticeQueued = exhausted && blockedNow > 0 && settings.aiCredit.noticeSentForCycle !== cycle;
  const nextSettings: GeSettings = budgetNoticeQueued
    ? { ...settings, aiCredit: { ...settings.aiCredit, status: "EXHAUSTED", noticeSentForCycle: cycle } }
    : settings;

  const ready = next
    .filter((t) => claimable(t, nowMs) && depsDone(t, next) && !(t.usesAi && exhausted))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const pick = ready[0];
  if (!pick) return { tasks: next, settings: nextSettings, claimed: null, reason: "NONE_READY", budgetNoticeQueued };

  const claimed: AgentTask = {
    ...pick,
    status: "CLAIMED",
    claimedBy: workerId,
    leaseUntil: new Date(nowMs + leaseMs).toISOString(),
    attempts: pick.attempts + 1,
  };
  next = next.map((t) => (t.id === pick.id ? claimed : t));
  return { tasks: next, settings: nextSettings, claimed, budgetNoticeQueued };
}

/** Only the lease holder may finish a task (stale workers cannot overwrite a re-claimed task). */
export function completeTask(tasks: AgentTask[], taskId: string, workerId: string, ok: boolean): AgentTask[] {
  return tasks.map((t) => {
    if (t.id !== taskId || t.claimedBy !== workerId) return t;
    return { ...t, status: ok ? "DONE" : "FAILED", leaseUntil: null };
  });
}

/** Enqueue, deduplicated by idempotency key. */
export function enqueueTask(tasks: AgentTask[], task: AgentTask): { tasks: AgentTask[]; added: boolean } {
  if (tasks.some((t) => t.idempotencyKey === task.idempotencyKey && t.status !== "CANCELLED")) return { tasks, added: false };
  return { tasks: [...tasks, task], added: true };
}

/** A new monthly credit arrived: AI tasks go back to the queue. */
export function startNewCreditCycle(tasks: AgentTask[], settings: GeSettings, cycleStart: string): { tasks: AgentTask[]; settings: GeSettings } {
  return {
    tasks: tasks.map((t) => (t.status === "BLOCKED_BUDGET" ? { ...t, status: "QUEUED", blockedReason: undefined } : t)),
    settings: { ...settings, aiCredit: { ...settings.aiCredit, status: "AVAILABLE", cycleStart, spentEstimateUsd: 0 } },
  };
}

/** The Claude API said "credit balance is too low" (or the estimate hit the cap). */
export function markCreditExhausted(settings: GeSettings): GeSettings {
  return { ...settings, aiCredit: { ...settings.aiCredit, status: "EXHAUSTED" } };
}

export function setPauseAll(settings: GeSettings, on: boolean, actor: Actor, at: string, auditLen: number): { settings: GeSettings; entry: AuditEntry } {
  return {
    settings: { ...settings, pauseAll: on },
    entry: { id: `aud-g${auditLen + 1}`, at, actor, action: on ? "pause_all.on" : "pause_all.off", resource: "settings" },
  };
}
