/**
 * iCalendar (RFC 5545) feed of SAMECOR events, for "ติดตามปฏิทินนี้ใน Google Calendar" in the event calendar.
 * Pure builder; api/events-ics.js loads the rows and serves it at /events.ics.
 */

const SITE = "https://www.samecor.com";

const KIND = {
  open_call: "Open Call",
  exhibition: "Exhibition",
  workshop: "Workshop",
  talk_forum: "Talk",
  art_fair: "Art Fair",
  meetup: "Meetup",
};

/** TEXT value escaping (backslash, semicolon, comma, line breaks). */
export function icsText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Fold a content line at 75 octets without cutting a UTF-8 character (Thai is 3 bytes a character). */
export function foldLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const compact = (iso) => iso.replace(/-/g, "");

/** The day after YYYY-MM-DD as YYYYMMDD (DTEND of an all-day event is exclusive). */
function dayAfter(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, "");
}

const stamp = (ts) => {
  const d = ts ? new Date(ts) : new Date();
  return (Number.isNaN(d.getTime()) ? new Date() : d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
};

export function eventUrl(e) {
  return `${SITE}/exhibition/${e.slug ? encodeURIComponent(e.slug) : e.id}`;
}

/** All-day VEVENTs; rows without a start date are skipped. */
export function buildEventsIcs(rows, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SAMECOR//Events//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SAMECOR Events",
    `X-WR-CALDESC:${icsText("อีเว้นท์และ open call จาก samecor.com")}`,
    "X-WR-TIMEZONE:Asia/Bangkok",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
  ];
  for (const e of rows ?? []) {
    if (!e?.id || !e.title || !/^\d{4}-\d{2}-\d{2}$/.test(e.starts_on ?? "")) continue;
    const end = /^\d{4}-\d{2}-\d{2}$/.test(e.ends_on ?? "") && e.ends_on >= e.starts_on ? e.ends_on : e.starts_on;
    const url = eventUrl(e);
    const kind = KIND[e.category];
    const place = [e.location_name, e.location_note].map((s) => (s ?? "").trim()).filter(Boolean).join(" · ");
    const desc = [e.time_note?.trim(), e.organizer_name?.trim() ? `ผู้จัด: ${e.organizer_name.trim()}` : "", url].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@samecor.com`,
      `DTSTAMP:${stamp(e.updated_at ?? now)}`,
      `DTSTART;VALUE=DATE:${compact(e.starts_on)}`,
      `DTEND;VALUE=DATE:${dayAfter(end)}`,
      `SUMMARY:${icsText(kind === "Open Call" ? `Open Call: ${e.title}` : e.title)}`,
      ...(place ? [`LOCATION:${icsText(place)}`] : []),
      `DESCRIPTION:${icsText(desc)}`,
      `URL:${url}`,
      ...(kind ? [`CATEGORIES:${icsText(kind)}`] : []),
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
