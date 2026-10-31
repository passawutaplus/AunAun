/**
 * Which page tours a person has finished. Rules (owner, 2026-10-17):
 * - A tour opens by itself the first time someone lands on its page.
 * - Finishing the last step marks it done → it never opens by itself again.
 * - Closing early (✕ / Esc) only hides it for this visit; it opens again next time.
 * - "ไม่ต้องแสดงอีก" turns it off for good.
 * - The "?" button / Settings can always replay it.
 * Signed-in progress lives in profiles.ui_prefs.tours (follows the account); guests keep it in this browser.
 * Bump a version below when a tour changes enough that everyone should see it again.
 */
import { cachedCloudPrefs, pushCloudPrefs } from "@/lib/settingsCloudPrefs";

export const GUIDE_TOURS = {
  home: { version: 1, label: "หน้าแรก", path: "/" },
  editor: { version: 2, label: "ลงผลงาน", path: "/portfolio/new" },
  profile: { version: 2, label: "โปรไฟล์ของฉัน", path: "/portfolio" },
  studio: { version: 1, label: "My Studio", path: "/dashboard" },
  chat: { version: 1, label: "แชท", path: "/chat" },
} as const;

export type GuideTourId = keyof typeof GUIDE_TOURS;
export const GUIDE_TOUR_IDS = Object.keys(GUIDE_TOURS) as GuideTourId[];

type TourState = { v: number; done?: boolean; off?: boolean };
type TourMap = Partial<Record<GuideTourId, TourState>>;

/** `?tour=<id>` on a page starts that tour right away (used by Settings → replay). */
export const TOUR_QUERY_PARAM = "tour";

const GUEST_KEY = "samecor:guide-tours:guest";
/** Tours finished before this system existed (browser-only flags). */
const LEGACY_DONE: Partial<Record<GuideTourId, string>> = {
  editor: "samecor.uploadTour.v1",
  profile: "samecor.profileTour.v1",
};

function readGuest(): TourMap {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) ?? "{}") as TourMap;
  } catch {
    return {};
  }
}

function readTours(userId: string | null | undefined): TourMap {
  return userId ? ((cachedCloudPrefs(userId).tours ?? {}) as TourMap) : readGuest();
}

function legacyDone(id: GuideTourId): boolean {
  const key = LEGACY_DONE[id];
  if (!key) return false;
  try {
    return localStorage.getItem(key) === "done";
  } catch {
    return false;
  }
}

/** Open by itself? Not when finished, switched off, or already shown during this visit. */
export function shouldAutoStartTour(userId: string | null | undefined, id: GuideTourId): boolean {
  if (wasShownThisVisit(id)) return false;
  const state = readTours(userId)[id];
  const version = GUIDE_TOURS[id].version;
  if (!state) return !legacyDone(id);
  if (state.v < version) return true;
  return !state.done && !state.off;
}

export function isTourDone(userId: string | null | undefined, id: GuideTourId): boolean {
  const state = readTours(userId)[id];
  return !!state && state.v >= GUIDE_TOURS[id].version && !!state.done;
}

async function writeTour(userId: string | null | undefined, id: GuideTourId, patch: Partial<TourState>) {
  const tours = readTours(userId);
  const next: TourMap = { ...tours, [id]: { ...tours[id], ...patch, v: GUIDE_TOURS[id].version } };
  if (userId) {
    await pushCloudPrefs(userId, { tours: next as Record<string, TourState> });
    return;
  }
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — the tour may show again, which is harmless */
  }
}

export const markTourDone = (userId: string | null | undefined, id: GuideTourId) => writeTour(userId, id, { done: true });
export const turnTourOff = (userId: string | null | undefined, id: GuideTourId) => writeTour(userId, id, { off: true });

/** Settings → "ดูทัวร์ใหม่ทั้งหมด": every tour opens by itself again. */
export async function resetAllTours(userId: string | null | undefined) {
  if (userId) await pushCloudPrefs(userId, { tours: {} });
  try {
    localStorage.removeItem(GUEST_KEY);
    Object.values(LEGACY_DONE).forEach((k) => k && localStorage.removeItem(k));
    GUIDE_TOUR_IDS.forEach((id) => sessionStorage.removeItem(visitKey(id)));
  } catch {
    /* ignore */
  }
}

const visitKey = (id: GuideTourId) => `samecor:tour-shown:${id}`;

export function wasShownThisVisit(id: GuideTourId): boolean {
  try {
    return sessionStorage.getItem(visitKey(id)) === "1";
  } catch {
    return false;
  }
}

export function noteShownThisVisit(id: GuideTourId) {
  try {
    sessionStorage.setItem(visitKey(id), "1");
  } catch {
    /* ignore */
  }
}
