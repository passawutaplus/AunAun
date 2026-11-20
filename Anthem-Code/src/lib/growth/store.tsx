/**
 * In-memory store for the /admin/growth mock dashboard. Wraps the pure engine; nothing is saved
 * to Supabase (the `growth` schema is a draft migration the owner has not applied yet).
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
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
import { OWNER, SYSTEM, seedCampaigns, seedDecisions, seedSettings, seedTasks, type DecisionItem } from "./mockData";
import type { AgentTask, AuditEntry, Campaign, GeSettings, Platform } from "./types";

export interface GrowthState {
  campaigns: Campaign[];
  settings: GeSettings;
  tasks: AgentTask[];
  decisions: DecisionItem[];
  globalAudit: AuditEntry[];
  /** LINE messages the real system would send (shown, never sent). */
  lineNotices: { at: string; text: string }[];
  lastDispatch: { campaignId: string; results: DispatchResult[] } | null;
}

function seed(): GrowthState {
  return {
    campaigns: seedCampaigns(),
    settings: seedSettings(),
    tasks: seedTasks(),
    decisions: seedDecisions(),
    globalAudit: [],
    lineNotices: [],
    lastDispatch: null,
  };
}

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

  const api = useMemo<GrowthApi>(
    () => ({
      state,
      campaign: (id) => state.campaigns.find((c) => c.id === id),
      approve: (id, platforms) => updateCampaign(id, (c) => ({ campaign: approvePlatforms(c, platforms, OWNER, nowIso()), value: undefined })),
      revise: (id, input) =>
        updateCampaign(id, (c) => {
          const r = reviseCampaign(c, input, OWNER, nowIso());
          return { campaign: r.campaign, value: r.outcome };
        }),
      reject: (id, reason) => updateCampaign(id, (c) => ({ campaign: rejectCampaign(c, OWNER, nowIso(), reason), value: undefined })),
      toggleLock: (id, componentId) => {
        updateCampaign(id, (c) => ({ campaign: toggleLock(c, componentId, OWNER, nowIso()), value: undefined }));
      },
      schedule: (id) =>
        updateCampaign(id, (c) => {
          const r = scheduleApproved(c, SYSTEM, nowIso());
          return { campaign: r.campaign, value: r.created.length };
        }),
      dispatch: (id) => {
        const res = updateCampaign(id, (c) => {
          // Simulate the clock reaching the latest slot so every scheduled job is due.
          const due = Math.max(Date.now(), ...c.jobs.map((j) => Date.parse(j.scheduledAt)));
          const r = dispatchDueJobs(c, ref.current.settings, due, SYSTEM);
          return { campaign: r.campaign, value: r.results };
        });
        if (res.ok) commit({ ...ref.current, lastDispatch: { campaignId: id, results: res.value } });
        return res;
      },
      setPauseAll: (on) => {
        const cur = ref.current;
        const { settings, entry } = setPauseAll(cur.settings, on, OWNER, nowIso(), cur.globalAudit.length);
        commit({
          ...cur,
          settings,
          globalAudit: [...cur.globalAudit, entry],
          lineNotices: [...cur.lineNotices, { at: entry.at, text: on ? "Pause All เปิดแล้ว: หยุดส่งโพสต์และหยุดรัน AI" : "Pause All ปิดแล้ว: กลับมาทำงานตามคิว" }],
        });
      },
      decide: (decisionId, option) => {
        const cur = ref.current;
        commit({ ...cur, decisions: cur.decisions.map((d) => (d.id === decisionId ? { ...d, decided: option } : d)) });
      },
      runAgents: () => {
        let cur = ref.current;
        let tasks = cur.tasks;
        let settings = cur.settings;
        let claimed = 0;
        const notices = [...cur.lineNotices];
        for (let i = 0; i < 20; i++) {
          const r = claimNextTask(tasks, settings, "mock-worker", Date.now());
          tasks = r.tasks;
          settings = r.settings;
          if (r.budgetNoticeQueued) notices.push({ at: nowIso(), text: "AI credit หมดรอบนี้: งาน AI หยุด (BLOCKED_BUDGET) รอรอบใหม่ ไม่ซื้อเพิ่ม" });
          if (!r.claimed) break;
          claimed++;
          // Mock agents finish instantly and cost nothing.
          tasks = completeTask(tasks, r.claimed.id, "mock-worker", true);
        }
        cur = { ...cur, tasks, settings, lineNotices: notices };
        commit(cur);
        return { claimed, blocked: tasks.filter((t) => t.status === "BLOCKED_BUDGET").length };
      },
      simulateCreditOut: () => {
        const cur = ref.current;
        const s = markCreditExhausted(cur.settings);
        commit({
          ...cur,
          settings: { ...s, aiCredit: { ...s.aiCredit, source: "mock", cycleStart: s.aiCredit.cycleStart ?? "mock-cycle-1" } },
          tasks: cur.tasks.map((t) => (t.status === "DONE" ? { ...t, status: "QUEUED", claimedBy: null, leaseUntil: null } : t)),
        });
      },
      newCreditCycle: () => {
        const cur = ref.current;
        const r = startNewCreditCycle(cur.tasks, cur.settings, `mock-cycle-${Date.now()}`);
        commit({ ...cur, tasks: r.tasks, settings: { ...r.settings, aiCredit: { ...r.settings.aiCredit, source: "mock" } } });
      },
      reset: () => commit(seed()),
    }),
    [state, updateCampaign, commit],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useGrowth(): GrowthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGrowth must be inside <GrowthProvider>");
  return v;
}
