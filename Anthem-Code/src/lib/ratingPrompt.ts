/**
 * When to ask "how is SAMECOR so far?" (Beta rating prompt). Local to this browser; never throws.
 * Moments: first publish, first plan agreed, first hire request, every 7 active days.
 * Shown at most once per 5 days; "later" waits 3 days; "never" stops for good.
 */

export type RatingMoment = "first_publish" | "plan_agreed" | "first_hire" | "active_days";

type State = {
  activeDays: number;
  lastDay: string | null;
  lastMilestone: number;
  fired: RatingMoment[];
  pending: RatingMoment | null;
  lastShownAt: number | null;
  snoozeUntil: number | null;
  never: boolean;
};

const STORAGE_SLOT = "samecor_rating_prompt_v1";
const DAY = 86_400_000;
const MIN_GAP = 5 * DAY;
const SNOOZE = 3 * DAY;
const ACTIVE_EVERY = 7;
export const RATING_MOMENT_EVENT = "samecor:rating-moment";

const EMPTY: State = {
  activeDays: 0,
  lastDay: null,
  lastMilestone: 0,
  fired: [],
  pending: null,
  lastShownAt: null,
  snoozeUntil: null,
  never: false,
};

function read(): State {
  try {
    const raw = localStorage.getItem(STORAGE_SLOT);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<State>) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function write(s: State) {
  try {
    localStorage.setItem(STORAGE_SLOT, JSON.stringify(s));
  } catch {
    /* storage blocked — prompt simply never shows */
  }
}

function bangkokDay(now: number) {
  return new Date(now + 7 * 3_600_000).toISOString().slice(0, 10);
}

function wake() {
  try {
    window.dispatchEvent(new Event(RATING_MOMENT_EVENT));
  } catch {
    /* noop */
  }
}

/** Count today as an active day; every 7th one queues the prompt. */
export function noteActiveDay(now = Date.now()) {
  const s = read();
  const today = bangkokDay(now);
  if (s.lastDay === today) return;
  s.lastDay = today;
  s.activeDays += 1;
  if (s.activeDays - s.lastMilestone >= ACTIVE_EVERY) {
    s.lastMilestone = s.activeDays;
    s.pending ??= "active_days";
  }
  write(s);
}

/** A milestone happened (each fires once per browser). */
export function noteRatingMoment(moment: Exclude<RatingMoment, "active_days">) {
  const s = read();
  if (s.never || s.fired.includes(moment)) return;
  s.fired = [...s.fired, moment];
  s.pending = moment;
  write(s);
  wake();
}

export function pendingRatingMoment(now = Date.now()): RatingMoment | null {
  const s = read();
  if (s.never || !s.pending) return null;
  if (s.lastShownAt && now - s.lastShownAt < MIN_GAP) return null;
  if (s.snoozeUntil && now < s.snoozeUntil) return null;
  return s.pending;
}

export function markRatingShown(now = Date.now()) {
  const s = read();
  s.lastShownAt = now;
  write(s);
}

/** "ไว้ทีหลัง" — keep the moment, ask again in 3 days. */
export function snoozeRating(now = Date.now()) {
  const s = read();
  s.snoozeUntil = now + SNOOZE;
  s.lastShownAt = null;
  write(s);
}

export function finishRating() {
  const s = read();
  s.pending = null;
  s.snoozeUntil = null;
  write(s);
}

export function neverAskRating() {
  setRatingPromptOff(true);
}

export function isRatingPromptOff(): boolean {
  return read().never;
}

/** Settings switch "ขอคะแนนเป็นครั้งคราว" — off is the same as "ไม่ต้องถามอีก". */
export function setRatingPromptOff(off: boolean) {
  const s = read();
  s.never = off;
  if (off) s.pending = null;
  write(s);
}
