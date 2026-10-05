import { cron } from "inngest";
import { sendOwnerEmail } from "@/ops/email";
import { alertsFor, formatReportText } from "@/ops/logic";
import { OpsRepo } from "@/ops/repo";
import { SupabaseSeederRepo } from "@/seeder/repo";
import { inngest } from "./client";

/** Daily report 08:00 Bangkok: stored in ops_reports, emailed to the owner only when env is configured. */
export const opsDailyReport = inngest.createFunction(
  { id: "ops-daily-report", name: "Ops: daily report", triggers: [cron("TZ=Asia/Bangkok 0 8 * * *")], retries: 2, concurrency: [{ limit: 1 }] },
  async ({ step }) => {
    const ops = new OpsRepo();
    // The report covers the day that just ended (yesterday in Bangkok).
    const day = await step.run("pick-day", () => new Date(Date.now() + 7 * 3600_000 - 86400000).toISOString().slice(0, 10));
    const stats = await step.run("gather", async () => {
      const s = await ops.gatherDailyStats(day);
      // Mondays (Bangkok): add the weekly learning digest. Needs LEARN_CAPTURE and the kill switch off; it is plain SQL, no AI.
      const monday = new Date(`${day}T12:00:00Z`).getUTCDay() === 0; // the report covers the day that just ended, so a Sunday report is sent Monday
      if (monday && !s.killSwitch) s.learning = (await ops.learningDigest(7)) ?? undefined;
      return s;
    });
    const alerts = alertsFor(stats);
    const text = formatReportText(stats, alerts);
    const urgent = alerts.some((a) => a.severity === "urgent");
    const emailed = await step.run("email", () => sendOwnerEmail(`${urgent ? "[ด่วน] " : ""}A+ Vault รายงาน ${day}`, text));
    await step.run("save", () => ops.saveReport(day, { stats, alerts, text }, emailed));
    return { day, urgent, emailed, alerts: alerts.length };
  },
);

/** Weekly link health: HEAD on stored renditions; 3 consecutive failures hide an item, recovery brings it back. */
export const opsLinkHealth = inngest.createFunction(
  { id: "ops-link-health", name: "Ops: weekly link health", triggers: [cron("TZ=Asia/Bangkok 0 4 * * 0")], retries: 1, concurrency: [{ limit: 1 }] },
  async ({ step }) => {
    const ops = new OpsRepo();
    const flags = await step.run("flags", () => new SupabaseSeederRepo().flags());
    if (flags.killSwitch) return { skipped: "kill_switch" as const };
    const items = await step.run("pick", () => ops.itemsToCheck(300));
    const results = { ok: 0, failing: 0, hidden: 0, restored: 0 };
    const { publicMediaUrl } = await import("@/seeder/repo");
    for (let i = 0; i < items.length; i += 25) {
      const chunk = items.slice(i, i + 25);
      const out = await step.run(`check-${i}`, async () => {
        const r = { ok: 0, failing: 0, hidden: 0, restored: 0 };
        await Promise.all(
          chunk.map(async (it) => {
            let ok = false;
            try {
              const res = await fetch(publicMediaUrl(it.path), { method: "HEAD", signal: AbortSignal.timeout(8000) });
              ok = res.ok;
            } catch {
              ok = false;
            }
            const outcome = await ops.recordHealth(it, ok);
            r[outcome === "hidden" ? "hidden" : outcome === "restored" ? "restored" : outcome === "ok" ? "ok" : "failing"]++;
          }),
        );
        return r;
      });
      for (const k of Object.keys(results) as (keyof typeof results)[]) results[k] += out[k];
    }
    if (results.hidden) await ops.logEvent("link_health", "warn", results);
    return { checked: items.length, ...results };
  },
);

/** Retention: 30-day trash, item_signals, old ops rows. */
export const opsRetention = inngest.createFunction(
  { id: "ops-retention", name: "Ops: retention", triggers: [cron("TZ=Asia/Bangkok 30 3 * * *")], retries: 1, concurrency: [{ limit: 1 }] },
  async ({ step }) => ({ purged: await step.run("retention", () => new OpsRepo().runRetention()) }),
);

