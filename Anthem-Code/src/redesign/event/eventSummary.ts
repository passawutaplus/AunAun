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
