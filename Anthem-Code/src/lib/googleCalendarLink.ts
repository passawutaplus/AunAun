/** Google Calendar "add event" link for an all-day Exhibition event. */

type CalendarEventInput = {
  title: string;
  starts_on: string | null;
  ends_on: string | null;
  description?: string | null;
  location_name?: string | null;
  location_note?: string | null;
  /** Page the calendar entry links back to (the SAMECOR event page). */
  url?: string | null;
};

const DETAILS_MAX = 600;

/** YYYY-MM-DD → YYYYMMDD. */
const compact = (iso: string) => iso.replace(/-/g, "");

/** The day after an ISO date, as YYYYMMDD (Google treats the all-day end as exclusive). */
function dayAfter(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Null when the event has no start date — there is nothing to put on a calendar. */
export function googleCalendarLink(event: CalendarEventInput): string | null {
  if (!event.starts_on) return null;
  const end = event.ends_on && event.ends_on >= event.starts_on ? event.ends_on : event.starts_on;
  const details = [event.description?.trim().slice(0, DETAILS_MAX), event.url ? `\n${event.url}` : ""]
    .filter(Boolean)
    .join("\n")
    .trim();
  const location = [event.location_name, event.location_note].filter(Boolean).join(" · ");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${compact(event.starts_on)}/${dayAfter(end)}`,
  });
  if (details) params.set("details", details);
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
