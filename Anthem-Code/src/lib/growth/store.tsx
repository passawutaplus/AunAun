/**
 * In-memory store for the /admin/growth mock dashboard. Wraps the pure engine; nothing is saved
 * to Supabase (the `growth` schema is a draft migration the owner has not applied yet).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  GrowthError,
  approvePlatforms,
  dispatchDueJobs,
  rejectCampaign,
  reviseCampaign,
  scheduleApproved,
  toggleLock,
  type DispatchResult,
  type RevisionOutcome,
} from "./engine";
import type { RevisionInput } from "./revision";
import { claimNextTask, completeTask, markCreditExhausted, setPauseAll, startNewCreditCycle } from "./tasks";
import { OWNER, SEED_AT, SYSTEM, seedCampaigns, seedDecisions, seedSettings, seedTasks, type DecisionItem } from "./mockData";
import {
  DEFAULT_NOTIFY_SETTINGS,
  MockLineSender,
  emptyQueue,
  enqueueNotification,
  flushNotifications,
  makeNotification,
  type NotificationBatch,
  type NotifyInput,
  type NotifyQueue,
  type NotifySettings,
} from "./notify";
import { latestVersion, platformsOf } from "./engine";
import type { AgentTask, AuditEntry, Campaign, GeSettings, Platform } from "./types";

export interface GrowthState {
  campaigns: Campaign[];
  settings: GeSettings;
  tasks: AgentTask[];
  decisions: DecisionItem[];
  globalAudit: AuditEntry[];
  /** Notifications for the LINE admin group. Phase 1: grouped and shown, never sent. */
  notify: NotifyQueue;
  notifySettings: NotifySettings;
  lastDispatch: { campaignId: string; results: DispatchResult[] } | null;
}

function addNotes(q: NotifyQueue, inputs: NotifyInput[], at: string): NotifyQueue {
  return inputs.reduce((acc, input) => enqueueNotification(acc, makeNotification(input, `n-${acc.seenKeys.length + 1}`, at)).queue, q);
}

function seed(): GrowthState {
  const campaigns = seedCampaigns();
  const decisions = seedDecisions();
  const notify = addNotes(
    emptyQueue(),
    [
      ...campaigns.map((c): NotifyInput => {
        const v = latestVersion(c);
        return { kind: "approval_waiting", campaignId: c.id, name: c.name, version: v.version, platforms: platformsOf(v) };
      }),
      ...decisions.map((d): NotifyInput => ({ kind: "needs_decision", key: d.id, title: d.title })),
    ],
    SEED_AT,
  );
  return {
    campaigns,
    settings: seedSettings(),
    tasks: seedTasks(),
    decisions,
    globalAudit: [],
    notify,
    notifySettings: DEFAULT_NOTIFY_SETTINGS,
    lastDispatch: null,
  };
}

const mockLine = new MockLineSender();

/** Flat on purpose: the app compiles with strict off, where boolean-tagged unions do not narrow. */
export type ActionResult<T = undefined> = { ok: boolean; value?: T; error?: string };

interface GrowthApi {
  state: GrowthState;
  campaign: (id: string) => Campaign | undefined;
  approve: (campaignId: string, platforms: Platform[]) => ActionResult;
  revise: (campaignId: string, input: RevisionInput) => ActionResult<RevisionOutcome>;
  reject: (campaignId: string, reason: string) => ActionResult;
  toggleLock: (campaignId: string, componentId: string) => void;
  schedule: (campaignId: string) => ActionResult<number>;
  dispatch: (campaignId: string) => ActionResult<DispatchResult[]>;
  setPauseAll: (on: boolean) => void;
  decide: (decisionId: string, option: string) => void;
  runAgents: () => { claimed: number; blocked: number };
  simulateCreditOut: () => void;
  newCreditCycle: () => void;
  /** Group everything pending into one LINE message now (mock sender: nothing is sent). */
  flushNotify: () => NotificationBatch | null;
  reset: () => void;
}

const Ctx = createContext<GrowthApi | null>(null);

const nowIso = () => new Date().toISOString();

export function GrowthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GrowthState>(seed);
  const ref = useRef(state);
  const commit = useCallback((next: GrowthState) => {
    ref.current = next;
    setState(next);
  }, []);

  const updateCampaign = useCallback(
    <T,>(id: string, fn: (c: Campaign) => { campaign: Campaign; value: T }): ActionResult<T> => {
      const cur = ref.current;
      const c = cur.campaigns.find((x) => x.id === id);
      if (!c) return { ok: false, error: "ไม่เจอแคมเปญ" };
      try {
        const { campaign, value } = fn(c);
        commit({ ...cur, campaigns: cur.campaigns.map((x) => (x.id === id ? campaign : x)) });
        return { ok: true, value };
      } catch (e) {
        return { ok: false, error: e instanceof GrowthError ? `${e.code}: ${e.message}` : String(e) };
      }
    },
    [commit],
  );

  /** Queue notifications for the LINE admin group (grouped later; never sent in Phase 1). */
  /** Same rule as the real notifier: urgent → at once, otherwise when the batch window has passed. */
  const autoFlush = useCallback(() => {
    const cur = ref.current;
    const { queue, batch } = flushNotifications(cur.notify, cur.notifySettings, Date.now());
    if (!batch) return;
    void mockLine.send(batch);
    commit({ ...cur, notify: queue });
  }, [commit]);

  // The notifier tick (cron every minute in production; 30 s here so the demo shows grouping).
  useEffect(() => {
    const t = window.setInterval(autoFlush, 30_000);
    return () => window.clearInterval(t);
  }, [autoFlush]);

  const note = useCallback(
    (inputs: NotifyInput[]) => {
      if (!inputs.length) return;
      const cur = ref.current;
      commit({ ...cur, notify: addNotes(cur.notify, inputs, nowIso()) });
      autoFlush();
    },
    [commit, autoFlush],
  );

  const api = useMemo<GrowthApi>(
    () => ({
      state,
      campaign: (id) => state.campaigns.find((c) => c.id === id),
      approve: (id, platforms) => updateCampaign(id, (c) => ({ campaign: approvePlatforms(c, platforms, OWNER, nowIso()), value: undefined })),
      revise: (id, input) => {
        const res = updateCampaign(id, (c) => {
          const r = reviseCampaign(c, input, OWNER, nowIso());
          return { campaign: r.campaign, value: r.outcome };
        });
        const c = ref.current.campaigns.find((x) => x.id === id);
        if (res.ok && c && res.value?.kind === "revised") {
          const { version, summary } = res.value;
          note([
            { kind: "revision_ready", campaignId: id, name: c.name, version: version.version },
            { kind: "approval_waiting", campaignId: id, name: c.name, version: version.version, platforms: summary.affectedPlatforms },
          ]);
        } else if (res.ok && c && res.value?.kind === "needs_decision") {
          note([{ kind: "needs_decision", key: `${id}:${c.comments.length}`, title: `${c.name}: ${res.value.reason}`, campaignId: id }]);
        }
        return res;
      },
      reject: (id, reason) => updateCampaign(id, (c) => ({ campaign: rejectCampaign(c, OWNER, nowIso(), reason), value: undefined })),
      toggleLock: (id, componentId) => {
        updateCampaign(id, (c) => ({ campaign: toggleLock(c, componentId, OWNER, nowIso()), value: undefined }));
      },
      schedule: (id) => {
        let created: Platform[] = [];
        let firstSlot = "";
        const res = updateCampaign(id, (c) => {
          const r = scheduleApproved(c, SYSTEM, nowIso());
          created = r.created.map((j) => j.platform);
          firstSlot = r.created.map((j) => j.scheduledAt).sort()[0] ?? "";
          return { campaign: r.campaign, value: r.created.length };
        });
        const c = ref.current.campaigns.find((x) => x.id === id);
        if (res.ok && c && created.length) note([{ kind: "job_scheduled", campaignId: id, name: c.name, platforms: created, firstSlot }]);
        return res;
      },
      dispatch: (id) => {
        const res = updateCampaign(id, (c) => {
          // Simulate the clock reaching the latest slot so every scheduled job is due.
          const due = Math.max(Date.now(), ...c.jobs.map((j) => Date.parse(j.scheduledAt)));
          const r = dispatchDueJobs(c, ref.current.settings, due, SYSTEM);
          return { campaign: r.campaign, value: r.results };
        });
        if (res.ok) {
          commit({ ...ref.current, lastDispatch: { campaignId: id, results: res.value } });
          const c = ref.current.campaigns.find((x) => x.id === id);
          const key = (jobId: string) => c?.jobs.find((j) => j.id === jobId)?.idempotencyKey ?? jobId;
          if (c) {
            note(
              res.value.flatMap((r): NotifyInput[] => {
                if (r.outcome === "exported") return [{ kind: "job_exported", campaignId: id, name: c.name, platform: r.platform, jobKey: key(r.jobId) }];
                if (r.reason === "NEEDS_RECONCILE") return [{ kind: "publish_failed", campaignId: id, name: c.name, platform: r.platform, reason: "ต้องเช็กสถานะก่อน", jobKey: key(r.jobId) }];
                return [];
              }),
            );
          }
        }
        return res;
      },
      setPauseAll: (on) => {
        const cur = ref.current;
        const { settings, entry } = setPauseAll(cur.settings, on, OWNER, nowIso(), cur.globalAudit.length);
        commit({ ...cur, settings, globalAudit: [...cur.globalAudit, entry] });
        note([{ kind: "pause_all", on, at: entry.at }]);
      },
      decide: (decisionId, option) => {
        const cur = ref.current;
        commit({ ...cur, decisions: cur.decisions.map((d) => (d.id === decisionId ? { ...d, decided: option } : d)) });
      },
      runAgents: () => {
        const cur = ref.current;
        let tasks = cur.tasks;
        let settings = cur.settings;
        let claimed = 0;
        const notes: NotifyInput[] = [];
        for (let i = 0; i < 20; i++) {
          const r = claimNextTask(tasks, settings, "mock-worker", Date.now());
          tasks = r.tasks;
          settings = r.settings;
          if (r.budgetNoticeQueued) notes.push({ kind: "blocked_budget", cycle: settings.aiCredit.cycleStart ?? "mock" });
          if (!r.claimed) break;
          claimed++;
          // Mock agents finish instantly and cost nothing.
          tasks = completeTask(tasks, r.claimed.id, "mock-worker", true);
        }
        commit({ ...cur, tasks, settings });
        note(notes);
        return { claimed, blocked: tasks.filter((t) => t.status === "BLOCKED_BUDGET").length };
      },
      simulateCreditOut: () => {
        const cur = ref.current;
        const s = markCreditExhausted(cur.settings);
        const cycle = s.aiCredit.cycleStart ?? "mock-cycle-1";
        commit({
          ...cur,
          settings: { ...s, aiCredit: { ...s.aiCredit, source: "mock", cycleStart: cycle } },
          tasks: cur.tasks.map((t) => (t.status === "DONE" ? { ...t, status: "QUEUED", claimedBy: null, leaseUntil: null } : t)),
        });
        note([{ kind: "budget_threshold", level: 100, cycle }]);
      },
      newCreditCycle: () => {
        const cur = ref.current;
        const r = startNewCreditCycle(cur.tasks, cur.settings, `mock-cycle-${Date.now()}`);
        commit({ ...cur, tasks: r.tasks, settings: { ...r.settings, aiCredit: { ...r.settings.aiCredit, source: "mock" } } });
      },
      flushNotify: () => {
        const cur = ref.current;
        const { queue, batch } = flushNotifications(cur.notify, cur.notifySettings, Date.now(), { force: true });
        if (!batch) return null;
        void mockLine.send(batch);
        commit({ ...cur, notify: queue });
        return batch;
      },
      reset: () => commit(seed()),
    }),
    [state, updateCampaign, commit, note],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useGrowth(): GrowthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGrowth must be inside <GrowthProvider>");
  return v;
}
