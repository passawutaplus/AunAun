import type { EventInsights } from "@/lib/exhibitionEvents";

export type SummaryRow = { key: string; title: string; items: string[]; numbered: boolean };

/** "How to apply" for an open call; the same steps are a booking or a registration for other kinds. */
const STEPS_TITLE: Record<string, string> = {
  open_call: "How to apply",
  workshop: "How to book",
  talk_forum: "How to register",
};

/**
 * Rows of "Summary by SAMECOR". The mock has How to apply / Who can apply / Prizes (an open call); the other
 * headings are provisional English ones in the same style (owner 2026-11-28), waiting for Beam's wording.
 */
export function summaryRows(insights: EventInsights | null, category: string): SummaryRow[] {
  if (!insights) return [];
  const rows: SummaryRow[] = [
    { key: "steps", title: STEPS_TITLE[category] ?? "How to join", items: insights.steps, numbered: true },
    { key: "eligibility", title: "Who can apply", items: insights.eligibility, numbered: false },
    { key: "benefits", title: category === "open_call" ? "Prizes" : "What you get", items: insights.benefits, numbered: false },
    { key: "who_for", title: "Who it's for", items: insights.who_for, numbered: false },
    { key: "takeaways", title: "What you'll get", items: insights.takeaways, numbered: false },
    { key: "highlights", title: "Highlights", items: insights.highlights, numbered: false },
    { key: "speakers", title: "Speakers", items: insights.speakers, numbered: false },
    { key: "schedule", title: "Schedule", items: insights.schedule, numbered: false },
    { key: "bring", title: "What to bring", items: insights.bring, numbered: false },
    { key: "capacity", title: "Capacity", items: insights.capacity ? [insights.capacity] : [], numbered: false },
    { key: "know_before", title: "Good to know", items: insights.know_before, numbered: false },
  ];
  return rows.filter((r) => r.items.length > 0);
}

/** Closing day of an open call: the summary's deadline when it differs from the last day, else the last day. */
export function closingDay(insights: EventInsights | null, endsOn: string | null, startsOn: string | null): string | null {
  return insights?.deadline ?? endsOn ?? startsOn;
}

type ActionEvent = {
  category: string;
  starts_on: string | null;
  ends_on: string | null;
  fee_type: string | null;
  registration_url: string | null;
  registration_open: boolean;
  ticket_url: string | null;
  website_url: string | null;
  source_url: string | null;
};

/** The main button of an event page, or the line shown in its place. `counts`: a signed-in click is recorded (old page). */
export type MainAction = { kind: "go"; href: string; label: string; counts: boolean } | { kind: "ended" | "closed"; label: string };

const isHttp = (u: string | null | undefined): u is string => !!u && /^https?:\/\//i.test(u);

/**
 * Same order as the old page (eventPrimaryAction): tickets for a paid event, then the sign-up link while
 * registration_open, then tickets, then the event's own site. Nothing to press once the event is over or the open
 * call has closed (`today` YYYY-MM-DD).
 */
export function mainAction(e: ActionEvent, insights: EventInsights | null, today: string): MainAction | null {
  const openCall = e.category === "open_call";
  if (openCall) {
    const closes = closingDay(insights, e.ends_on, e.starts_on);
    if (closes && closes < today) return { kind: "closed", label: "ปิดรับแล้ว" };
  } else {
    const last = e.ends_on ?? e.starts_on;
    if (last && last < today) return { kind: "ended", label: "งานนี้จบแล้ว" };
  }
  const go = (href: string, label: string, counts = true): MainAction => ({ kind: "go", href, label, counts });
  const tickets = isHttp(e.ticket_url) ? e.ticket_url : null;
  if (tickets && e.fee_type !== "free") return go(tickets, "ไปซื้อบัตรที่เว็บผู้จัด");
  if (isHttp(e.registration_url)) {
    if (e.registration_open) return go(e.registration_url, openCall ? "ไปสมัครที่เว็บผู้จัด" : "ไปลงทะเบียนที่เว็บผู้จัด");
    if (!tickets) return { kind: "closed", label: "ปิดรับแล้ว" };
  }
  if (tickets) return go(tickets, "ไปซื้อบัตรที่เว็บผู้จัด");
  const site = [e.website_url, e.source_url].find(isHttp);
  return site ? go(site, openCall ? "ไปสมัครที่เว็บผู้จัด" : "ไปเว็บไซต์งาน", openCall) : null;
}

/** Hostname for the "site" row: "ripo.kmutt.ac.th". */
export function siteLabel(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** "ค่าเข้าร่วม: ฟรี" / "ค่าเข้าร่วม: ไม่ระบุ" (mock); a paid event shows the organiser's note. */
export function feeLabel(type: string | null | undefined, note: string | null | undefined): string {
  const n = note?.trim();
  if (type === "free") return "ค่าเข้าร่วม: ฟรี";
  if (type === "paid") return `ค่าเข้าร่วม: ${n || "มีค่าใช้จ่าย"}`;
  return `ค่าเข้าร่วม: ${n || "ไม่ระบุ"}`;
}

/** Paragraphs of the description (blank lines, or single line breaks when there are none). */
export function paragraphs(text: string | null | undefined): string[] {
  const t = (text ?? "").replace(/\r\n?/g, "\n").trim();
  if (!t) return [];
  const blocks = t.split(/\n\s*\n/);
  return (blocks.length > 1 ? blocks : t.split("\n")).map((p) => p.trim()).filter(Boolean);
}

/** Google Maps search for a place, opened outside the site (owner 2026-11-28: no map inside SAMECOR, no API cost). */
export const mapsSearchUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;

/** Places of one event that can be looked up: the venues of `location_name` (" · " between them); none when online. */
export function placeNames(locationName: string | null | undefined): string[] {
  const loc = locationName?.trim() ?? "";
  if (!loc || /^(ออนไลน์|online)$/i.test(loc)) return [];
  return loc.split(" · ").map((s) => s.trim()).filter(Boolean);
}
