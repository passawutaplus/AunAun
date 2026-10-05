/** Budget guards for AI use (phase 05.G). Pure decisions; callers read/write counters. */

/** Per-user monthly AI quota for private-image tagging (T3). Opt-in is checked separately and defaults to OFF. */
export function userQuotaDecision({ optIn, plan = "free", used = 0, killSwitch = false }, cfg) {
  if (killSwitch) return { allow: false, reason: "kill_switch" };
  if (!optIn) return { allow: false, reason: "not_opted_in" };
  const quota = plan === "plus" ? cfg.USER_AI_QUOTA_PLUS : cfg.USER_AI_QUOTA_FREE;
  if (used >= quota) return { allow: false, reason: "quota_reached", quota, remaining: 0 };
  return { allow: true, reason: "ok", quota, remaining: quota - used };
}

/** Rough per-stage cost estimate in USD (list prices per million tokens, defaults = Haiku 4.5). */
export function estimateCostUsd(stage, { inPerM = 1, outPerM = 5 } = {}) {
  const t = { c1: [450, 40], c2: [1800, 160] }[stage];
  if (!t) throw new Error(`unknown stage ${stage}`);
  return (t[0] * inPerM + t[1] * outPerM) / 1_000_000;
}

/** Month key used by user_ai_usage.month (first day of the month, UTC). */
export function monthKey(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
