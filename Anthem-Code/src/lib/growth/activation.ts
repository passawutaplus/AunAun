/**
 * North-star: Activated Creators = signed up → completed the core profile → published a first
 * project within 7 days of signing up. Computed from existing tables (profiles, projects), so it
 * needs no tracking cookie and no new events. Read-only, admin-only.
 *
 * Limits (shown in the UI): projects have no published_at, so the publish time is the created_at
 * of a project whose status is "Published"; recent signups may still activate (open cohort).
 */

export interface SignupRow {
  user_id: string | null;
  created_at: string | null;
  avatar_url: string | null;
  role: string | null;
  bio: string | null;
  skills: string[] | null;
}

export interface PublishedProjectRow {
  owner_id: string | null;
  created_at: string | null;
}

export interface ActivationFunnel {
  windowDays: number;
  signups: number;
  profileCompleted: number;
  activated: number;
  /** Signups whose 7-day window has not ended yet (they may still activate). */
  stillOpen: number;
  /** Under 30 signups: treat as directional, never as a trend. */
  directional: boolean;
}

export const ACTIVATION_DAYS = 7;
const DAY_MS = 86_400_000;

/** Core profile: photo + role (or skills) + a short bio. Same signals as the Getting Started card. */
export function coreProfileComplete(p: SignupRow): boolean {
  const hasRole = !!p.role?.trim() || (p.skills?.length ?? 0) > 0;
  return !!p.avatar_url?.trim() && hasRole && (p.bio ?? "").trim().length >= 20;
}

/** Cohort = everyone who signed up in the last `windowDays` days (up to now). */
export function computeActivation(
  signups: SignupRow[],
  projects: PublishedProjectRow[],
  nowMs: number,
  windowDays = ACTIVATION_DAYS,
): ActivationFunnel {
  const since = nowMs - windowDays * DAY_MS;
  const cohort = signups.filter((s) => {
    const t = s.created_at ? Date.parse(s.created_at) : NaN;
    return !!s.user_id && t >= since && t <= nowMs;
  });

  const firstPublish = new Map<string, number>();
  for (const p of projects) {
    if (!p.owner_id || !p.created_at) continue;
    const t = Date.parse(p.created_at);
    const prev = firstPublish.get(p.owner_id);
    if (prev === undefined || t < prev) firstPublish.set(p.owner_id, t);
  }

  let profileCompleted = 0;
  let activated = 0;
  let stillOpen = 0;
  for (const s of cohort) {
    const signedUp = Date.parse(s.created_at!);
    const complete = coreProfileComplete(s);
    if (complete) profileCompleted++;
    const first = firstPublish.get(s.user_id!);
    if (complete && first !== undefined && first - signedUp <= ACTIVATION_DAYS * DAY_MS) activated++;
    if (nowMs - signedUp < ACTIVATION_DAYS * DAY_MS) stillOpen++;
  }

  return { windowDays, signups: cohort.length, profileCompleted, activated, stillOpen, directional: cohort.length < 30 };
}
