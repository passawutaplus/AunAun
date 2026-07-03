import { BRAND_STORAGE_ONBOARDING } from "./brandConfig";

const PREFIX = BRAND_STORAGE_ONBOARDING;

export type OnboardingVisitId =
  | "explore_feed"
  | "explore_community"
  | "explore_designers"
  | "explore_studios"
  | "jobs"
  | "share_profile";

export const ONBOARDING_VISIT_IDS: OnboardingVisitId[] = [
  "explore_feed",
  "explore_community",
  "explore_designers",
  "explore_studios",
  "jobs",
  "share_profile",
];

/** Safely parse profiles.onboarding_visits jsonb (may be null or malformed). */
export function parseOnboardingVisits(raw: unknown): Partial<Record<OnboardingVisitId, boolean>> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Partial<Record<OnboardingVisitId, boolean>> = {};
  for (const id of ONBOARDING_VISIT_IDS) {
    if ((raw as Record<string, unknown>)[id] === true) out[id] = true;
  }
  return out;
}

type StoredState = {
  dismissedAt?: string;
  completedCelebrated?: boolean;
  visits?: Partial<Record<OnboardingVisitId, boolean>>;
};

function key(userId: string) {
  return `${PREFIX}:${userId}`;
}

function read(userId: string): StoredState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return {};
    return JSON.parse(raw) as StoredState;
  } catch {
    return {};
  }
}

function write(userId: string, state: StoredState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(userId), JSON.stringify(state));
}

export function getOnboardingVisits(userId: string): Partial<Record<OnboardingVisitId, boolean>> {
  return read(userId).visits ?? {};
}

const UPDATE_EVENT = `${BRAND_STORAGE_ONBOARDING}_update`;

export async function markOnboardingVisit(userId: string, visitId: OnboardingVisitId) {
  const state = read(userId);
  if (!state.visits?.[visitId]) {
    write(userId, {
      ...state,
      visits: { ...state.visits, [visitId]: true },
    });
  }
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.rpc("mark_onboarding_visit", { _visit_id: visitId });
  } catch {
    /* offline / migration pending — localStorage still works client-side */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userId } }));
  }
}

/** Push local visit flags to DB before claim RPC (server only reads profiles.onboarding_visits). */
export async function syncPendingOnboardingVisits(userId: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_visits")
    .eq("user_id", userId)
    .maybeSingle();
  const dbVisits = parseOnboardingVisits(profile?.onboarding_visits);
  const localVisits = getOnboardingVisits(userId);
  const pending = ONBOARDING_VISIT_IDS.filter((id) => localVisits[id] && !dbVisits[id]);
  if (pending.length === 0) return;
  await Promise.all(
    pending.map((id) => supabase.rpc("mark_onboarding_visit", { _visit_id: id })),
  );
}

export function subscribeOnboardingUpdates(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(UPDATE_EVENT, handler);
  return () => window.removeEventListener(UPDATE_EVENT, handler);
}

export function isOnboardingDismissed(userId: string): boolean {
  return !!read(userId).dismissedAt;
}

export function dismissOnboarding(userId: string) {
  const state = read(userId);
  write(userId, { ...state, dismissedAt: new Date().toISOString() });
}

export function isOnboardingCelebrated(userId: string): boolean {
  return !!read(userId).completedCelebrated;
}

export function markOnboardingCelebrated(userId: string) {
  const state = read(userId);
  write(userId, { ...state, completedCelebrated: true });
}
