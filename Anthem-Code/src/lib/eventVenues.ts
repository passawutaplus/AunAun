/** Venues of a main Exhibition event (rows of anthem.events with parent_id), the featured banner, and map helpers. */

export type OpeningHoursRule = { d: number[]; o: string; c: string };

export type EventVenue = {
  id: string;
  parent_id: string;
  sort_order: number;
  title: string;
  name_en: string | null;
  area: string | null;
  address: string | null;
  opening_hours: OpeningHoursRule[];
  hours_note: string | null;
  closed_note: string | null;
  admission_note: string | null;
  transit_note: string | null;
  date_note: string | null;
  lat: number | null;
  lng: number | null;
  coords_approx: boolean;
  is_special: boolean;
  starts_on: string | null;
  ends_on: string | null;
  fee_type: "free" | "paid" | "unspecified";
  source_url: string | null;
  website_url: string | null;
  description: string;
  interest_count: number;
};

export const VENUE_SELECT =
  "id, parent_id, sort_order, title, name_en, area, address, opening_hours, hours_note, closed_note, admission_note, transit_note, date_note, lat, lng, coords_approx, is_special, starts_on, ends_on, fee_type, source_url, website_url, description, interest_count";

/** What the team edits for one venue; sent as `_data` to admin_event_venue_save. */
export type VenueDraft = Omit<EventVenue, "id" | "parent_id" | "sort_order" | "interest_count">;

export function emptyVenueDraft(parent?: { starts_on: string | null; ends_on: string | null }): VenueDraft {
  return {
    title: "",
    name_en: null,
    area: null,
    address: null,
    opening_hours: [],
    hours_note: null,
    closed_note: null,
    admission_note: null,
    transit_note: null,
    date_note: null,
    lat: null,
    lng: null,
    coords_approx: true,
    is_special: false,
    starts_on: parent?.starts_on ?? null,
    ends_on: parent?.ends_on ?? null,
    fee_type: "unspecified",
    source_url: null,
    website_url: null,
    description: "",
  };
}

export function venueToDraft(v: EventVenue): VenueDraft {
  const { id: _id, parent_id: _p, sort_order: _s, interest_count: _c, ...draft } = v;
  return draft;
}

// ── Bangkok clock ────────────────────────────────────────────────────────────

/** Day of week (0 = Sunday), minutes since midnight and ISO date, in Bangkok time. */
export function bangkokNow(now: Date = new Date()): { day: number; minutes: number; iso: string } {
  // Bangkok is UTC+7 all year (no daylight saving).
  const t = new Date(now.getTime() + 7 * 3_600_000);
  return { day: t.getUTCDay(), minutes: t.getUTCHours() * 60 + t.getUTCMinutes(), iso: t.toISOString().slice(0, 10) };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const dot = (hhmm: string) => hhmm.replace(":", ".");

export type VenueOpenState =
  | { kind: "open"; label: string }
  | { kind: "later"; label: string }
  | { kind: "closed_now"; label: string }
  | { kind: "closed_today"; label: string }
  | { kind: "not_started"; label: string }
  | { kind: "ended"; label: string }
  | { kind: "unknown"; label: string };

/** "เปิดอยู่ · ถึง 16.00" / "ปิดวันนี้" … from the venue's hours and run dates, in Bangkok time. */
export function venueOpenState(
  v: Pick<EventVenue, "opening_hours" | "starts_on" | "ends_on" | "date_note">,
  now: Date = new Date(),
): VenueOpenState {
  const { day, minutes, iso } = bangkokNow(now);
  if (v.ends_on && v.ends_on < iso) return { kind: "ended", label: "จบแล้ว" };
  if (v.starts_on && v.starts_on > iso) return { kind: "not_started", label: "ยังไม่เริ่ม" };
  if (!v.starts_on && v.date_note) return { kind: "not_started", label: "รอประกาศวันเปิด" };
  const rules = Array.isArray(v.opening_hours) ? v.opening_hours : [];
  if (rules.length === 0) return { kind: "unknown", label: "" };
  const today = rules.filter((r) => r.d.includes(day));
  if (today.length === 0) return { kind: "closed_today", label: "ปิดวันนี้" };
  const open = today.find((r) => minutes >= toMinutes(r.o) && minutes < toMinutes(r.c));
  if (open) return { kind: "open", label: `เปิดอยู่ · ถึง ${dot(open.c)}` };
  const next = today.filter((r) => minutes < toMinutes(r.o)).sort((a, b) => toMinutes(a.o) - toMinutes(b.o))[0];
  if (next) return { kind: "later", label: `เปิด ${dot(next.o)}` };
  return { kind: "closed_now", label: "ปิดแล้ววันนี้" };
}

// ── Grouping, counts, links ──────────────────────────────────────────────────

export type VenueGroup = { area: string | null; venues: Array<EventVenue & { pin: number }> };

/** Venues numbered in list order (pin numbers), grouped by area in order of first appearance. */
export function groupVenuesByArea(venues: EventVenue[]): VenueGroup[] {
  const sorted = [...venues].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
  const groups: VenueGroup[] = [];
  sorted.forEach((v, i) => {
    const key = v.area?.trim() || null;
    let g = groups.find((x) => x.area === key);
    if (!g) {
      g = { area: key, venues: [] };
      groups.push(g);
    }
    g.venues.push({ ...v, pin: i + 1 });
  });
  return groups;
}

/** "11 สถานที่" counts the main venues; special projects are shown apart. */
export function venueCounts(venues: Pick<EventVenue, "is_special">[]): { main: number; special: number } {
  const special = venues.filter((v) => v.is_special).length;
  return { main: venues.length - special, special };
}

/** Coordinates are approximate, so Google Maps searches the name (and address); exact pins use lat,lng. */
export function venueMapsUrl(v: Pick<EventVenue, "title" | "name_en" | "address" | "lat" | "lng" | "coords_approx">): string {
  const query =
    !v.coords_approx && v.lat != null && v.lng != null
      ? `${v.lat},${v.lng}`
      : [v.name_en || v.title, v.address].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// ── Featured banner ──────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const isoDays = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS;

/** "กำลังจัด · เหลือ 116 วัน", "เริ่มใน 3 วัน", "วันสุดท้าย" — null once ended. */
export function featuredCountdown(starts: string | null, ends: string | null, now: Date = new Date()): string | null {
  const today = isoDays(bangkokNow(now).iso);
  if (starts && isoDays(starts) > today) {
    const n = isoDays(starts) - today;
    return n === 1 ? "เริ่มพรุ่งนี้" : `เริ่มใน ${n} วัน`;
  }
  if (!ends) return starts ? "กำลังจัด" : null;
  const left = isoDays(ends) - today;
  if (left < 0) return null;
  if (left === 0) return "กำลังจัด · วันสุดท้าย";
  return `กำลังจัด · เหลือ ${left} วัน`;
}

/** Whether a featured pin is still in force (no end date = until unpinned). */
export function featureActive(e: { is_featured?: boolean | null; featured_until?: string | null }, now: Date = new Date()): boolean {
  if (!e.is_featured) return false;
  return !e.featured_until || e.featured_until >= bangkokNow(now).iso;
}

// ── Opening hours text ⇄ rules (admin editor) ────────────────────────────────

const DAY_TOKENS: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  "อา": 0, "จ": 1, "อ": 2, "พ": 3, "พฤ": 4, "ศ": 5, "ส": 6,
};

function dayRange(a: number, b: number): number[] {
  const out: number[] = [];
  for (let d = a; ; d = (d + 1) % 7) {
    out.push(d);
    if (d === b || out.length > 7) break;
  }
  return out;
}

/**
 * Parse the editor's hours box: one rule per line, e.g. "mon-sat 09:00-18:00", "sun 08:00-17:00",
 * "daily 10:00-22:00", "จ-ส 09.00-18.00". Returns null when a line can't be read.
 */
export function parseOpeningHours(text: string): OpeningHoursRule[] | null {
  const rules: OpeningHoursRule[] = [];
  for (const raw of text.split(/\n|;/)) {
    const line = raw.trim().toLowerCase().replace(/\./g, ":").replace(/[–—]/g, "-");
    if (!line) continue;
    const m = line.match(/^(.+?)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!m) return null;
    const [, daysPart, o, c] = m;
    const pad = (t: string) => t.padStart(5, "0");
    let days: number[] = [];
    if (/^(daily|ทุกวัน|everyday|mon-sun|จ-อา)$/.test(daysPart.replace(/\s/g, ""))) days = [0, 1, 2, 3, 4, 5, 6];
    else {
      for (const part of daysPart.split(/[,\s]+/).filter(Boolean)) {
        const [a, b] = part.split("-").map((x) => DAY_TOKENS[x.slice(0, 3)] ?? DAY_TOKENS[x]);
        if (a === undefined || (part.includes("-") && b === undefined)) return null;
        days.push(...(b === undefined ? [a] : dayRange(a, b)));
      }
    }
    days = [...new Set(days)].sort((x, y) => x - y);
    if (!days.length || pad(c) <= pad(o)) return null;
    rules.push({ d: days, o: pad(o), c: pad(c) });
  }
  return rules;
}

const EN_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function formatOpeningHours(rules: OpeningHoursRule[]): string {
  return rules
    .map((r) => {
      const days = r.d.length === 7 ? "daily" : r.d.map((d) => EN_DAYS[d]).join(",");
      return `${days} ${r.o}-${r.c}`;
    })
    .join("\n");
}

// ── "My route": ticked venues, walking route preview ─────────────────────────

export type RoutePoint = Pick<EventVenue, "id" | "title" | "name_en" | "address" | "lat" | "lng" | "coords_approx">;

/** Google Maps directions through every ticked venue in list order (walking), by name when coordinates are approximate. */
export function googleMapsRouteUrl(stops: RoutePoint[]): string | null {
  if (stops.length < 2) return null;
  const place = (v: RoutePoint) =>
    !v.coords_approx && v.lat != null && v.lng != null ? `${v.lat},${v.lng}` : `${v.name_en || v.title}, Bangkok`;
  const params = new URLSearchParams({
    api: "1",
    origin: place(stops[0]),
    destination: place(stops[stops.length - 1]),
    travelmode: "walking",
  });
  const mid = stops.slice(1, -1).slice(0, 9); // Google allows up to 9 waypoints
  if (mid.length) params.set("waypoints", mid.map(place).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** "5.2 กม. · เดิน ~1 ชม. 25 นาที" */
export function routeSummary(meters: number, seconds: number): string {
  const km = meters >= 1000 ? `${(meters / 1000).toFixed(1)} กม.` : `${Math.round(meters)} ม.`;
  const min = Math.max(1, Math.round(seconds / 60));
  const time = min >= 60 ? `${Math.floor(min / 60)} ชม.${min % 60 ? ` ${min % 60} นาที` : ""}` : `${min} นาที`;
  return `${km} · เดิน ~${time}`;
}
