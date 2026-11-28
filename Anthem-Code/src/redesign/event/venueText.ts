import { bangkokNow, type EventVenue, type OpeningHoursRule } from "@/lib/eventVenues";

/** Thai day abbreviations, Sunday = 0 (opening_hours `d`). */
const TH_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
/** Monday-first order, as the mock writes ranges ("อ.–อา."). */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

const dot = (hhmm: string) => hhmm.replace(":", ".");
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function dayLabel(days: number[]): string {
  const set = new Set(days);
  if (set.size === 7) return "ทุกวัน";
  const order = WEEK.filter((d) => set.has(d));
  const idx = order.map((d) => WEEK.indexOf(d));
  const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (consecutive && order.length > 2) return `${TH_DAYS[order[0]]}–${TH_DAYS[order[order.length - 1]]}`;
  return order.map((d) => TH_DAYS[d]).join(", ");
}

/** "อ.–อา. 10.00–20.00" / "ทุกวัน 08.00–19.30" (mock Locations), rules joined with " · ". */
export function thaiHours(rules: readonly OpeningHoursRule[] | null | undefined): string {
  if (!Array.isArray(rules) || !rules.length) return "";
  return rules
    .filter((r) => Array.isArray(r.d) && r.d.length && r.o && r.c)
    .map((r) => `${dayLabel(r.d)} ${dot(r.o)}–${dot(r.c)}`)
    .join(" · ");
}

export type VenueStatus = { kind: "open" | "closed" | "wait"; label: string } | null;

/**
 * Status chip of a venue, in Bangkok time. The mock has three: "เปิด · ถึง 16:00" (green), "ปิดวันนี้", "รอประกาศวันเปิด";
 * the other states reuse the grey chip with short provisional wording.
 */
export function venueStatus(
  v: Pick<EventVenue, "opening_hours" | "starts_on" | "ends_on" | "date_note">,
  now: Date = new Date(),
): VenueStatus {
  const { day, minutes, iso } = bangkokNow(now);
  if (v.ends_on && v.ends_on < iso) return { kind: "closed", label: "จบแล้ว" };
  if (!v.starts_on || v.starts_on > iso) return v.starts_on ? { kind: "wait", label: "ยังไม่เปิด" } : { kind: "wait", label: "รอประกาศวันเปิด" };
  const rules = Array.isArray(v.opening_hours) ? v.opening_hours : [];
  if (!rules.length) return null;
  const today = rules.filter((r) => r.d.includes(day));
  if (!today.length) return { kind: "closed", label: "ปิดวันนี้" };
  const open = today.find((r) => minutes >= toMinutes(r.o) && minutes < toMinutes(r.c));
  if (open) return { kind: "open", label: `เปิด · ถึง ${open.c}` };
  const next = today.filter((r) => minutes < toMinutes(r.o)).sort((a, b) => toMinutes(a.o) - toMinutes(b.o))[0];
  if (next) return { kind: "closed", label: `เปิด ${next.o}` };
  return { kind: "closed", label: "ปิดแล้ววันนี้" };
}
