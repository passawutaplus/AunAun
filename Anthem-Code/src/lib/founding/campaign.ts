/**
 * SAMECOR Founding Projects: campaign facts (spec v1.0, 12 Nov 2026).
 *
 * Only what the founder has confirmed lives here. Price, goal, dates and delivery are NOT decided:
 * they stay `null` and the page says "to be announced". Never fill them with mock-up numbers
 * (฿1,990 / 2,290 / 2,590 and the ฿71,700 goal in the old mock-ups were layout samples only).
 * No accuracy figures, no paint-brand partners, no team library: none of those are true yet.
 */
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "waitlist"
  | "live"
  | "ended"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "production"
  | "fulfillment"
  | "closed";

export type MilestoneStatus = "planned" | "in_progress" | "completed" | "delayed" | "cancelled";

/** Keys into the FOUNDING dictionary (lib/i18n/founding.ts). */
export type FoundingMilestone = { no: string; title: string; status: MilestoneStatus; noteKey: string };
export type FoundingFaq = { qKey: string; aKey: string };

export type FoundingCampaign = {
  slug: string;
  /** "Project 001" */
  code: string;
  product: string;
  title: string;
  status: CampaignStatus;
  /** Devices in this batch. A hard cap: the 31st buyer joins the next-batch waitlist. */
  deviceCap: number;
  /** null until the cost sheet is approved. */
  priceThb: number | null;
  goalThb: number | null;
  startsAt: string | null;
  endsAt: string | null;
  productPath: string;
  appUrl: string;
  appVersion: string;
  milestones: FoundingMilestone[];
  faq: FoundingFaq[];
  riskKeys: string[];
};

export const PICKER_FIRST_30: FoundingCampaign = {
  slug: "picker",
  code: "Project 001",
  product: "Picker",
  title: "The First 30.",
  status: "waitlist",
  deviceCap: 30,
  priceThb: null,
  goalThb: null,
  startsAt: null,
  endsAt: null,
  productPath: "/shop/picker",
  appUrl: "https://picker.samecor.com",
  appVersion: "v0.10.4",
  milestones: [
    { no: "01", title: "Idea & Industrial Design", status: "completed", noteKey: "m1" },
    { no: "02", title: "Web App v0.10.4", status: "completed", noteKey: "m2" },
    { no: "03", title: "Hardware Validation", status: "in_progress", noteKey: "m3" },
    { no: "04", title: "Founding Campaign", status: "planned", noteKey: "m4" },
    { no: "05", title: "First 30 Production", status: "planned", noteKey: "m5" },
    { no: "06", title: "Delivery & Feedback", status: "planned", noteKey: "m6" },
  ],
  faq: [
    { qKey: "q1", aKey: "a1" },
    { qKey: "q2", aKey: "a2" },
    { qKey: "q3", aKey: "a3" },
    { qKey: "q4", aKey: "a4" },
    { qKey: "q5", aKey: "a5" },
    { qKey: "q6", aKey: "a6" },
  ],
  riskKeys: ["r1", "r2", "r3", "r4", "r5"],
};

const CAMPAIGNS: FoundingCampaign[] = [PICKER_FIRST_30];

export function findCampaign(slug: string | undefined): FoundingCampaign | null {
  return CAMPAIGNS.find((c) => c.slug === slug) ?? null;
}

/** What the main button does in each campaign state. Money is taken only while `live`. */
export type CampaignCta = "none" | "waitlist" | "back" | "updates";

export function campaignCta(status: CampaignStatus): CampaignCta {
  if (status === "waitlist" || status === "scheduled") return "waitlist";
  if (status === "live") return "back";
  if (status === "draft" || status === "cancelled") return "none";
  return "updates";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Lower-cased, trimmed email, or null when it is not one. Same rule as anthem.join_founding_waitlist. */
export function cleanWaitlistEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}
