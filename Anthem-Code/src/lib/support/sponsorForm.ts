/** Sponsor / collaborate inquiry: field rules shared by the form and its tests. */
export const SPONSOR_INTERESTS = ["platform", "first_connect", "in_kind", "invite_us", "event", "unsure"] as const;
export const SPONSOR_BUDGETS = ["undecided", "under_5k", "5k_10k", "10k_30k", "over_30k", "in_kind"] as const;

export type SponsorInterest = (typeof SPONSOR_INTERESTS)[number];
export type SponsorBudget = (typeof SPONSOR_BUDGETS)[number];

export type SponsorInquiry = {
  company: string;
  contact: string;
  email: string;
  lineId: string;
  interest: SponsorInterest;
  budget: SponsorBudget;
  message: string;
  consent: boolean;
};

export const SPONSOR_LIMITS = { company: 120, contact: 100, lineId: 60, message: 1000 } as const;

export const EMPTY_SPONSOR_INQUIRY: SponsorInquiry = {
  company: "",
  contact: "",
  email: "",
  lineId: "",
  interest: "platform",
  budget: "undecided",
  message: "",
  consent: false,
};

export type SponsorField = "company" | "contact" | "email" | "consent";
export type SponsorErrors = Partial<Record<SponsorField, true>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trimmed, length-capped copy with the email lower-cased: what is safe to send. */
export function normaliseSponsorInquiry(v: SponsorInquiry): SponsorInquiry {
  return {
    ...v,
    company: v.company.trim().slice(0, SPONSOR_LIMITS.company),
    contact: v.contact.trim().slice(0, SPONSOR_LIMITS.contact),
    email: v.email.trim().toLowerCase(),
    lineId: v.lineId.trim().slice(0, SPONSOR_LIMITS.lineId),
    message: v.message.trim().slice(0, SPONSOR_LIMITS.message),
    interest: SPONSOR_INTERESTS.includes(v.interest) ? v.interest : "unsure",
    budget: SPONSOR_BUDGETS.includes(v.budget) ? v.budget : "undecided",
  };
}

export function validateSponsorInquiry(v: SponsorInquiry): SponsorErrors {
  const n = normaliseSponsorInquiry(v);
  const errors: SponsorErrors = {};
  if (!n.company) errors.company = true;
  if (!n.contact) errors.contact = true;
  if (!EMAIL.test(n.email)) errors.email = true;
  if (!n.consent) errors.consent = true;
  return errors;
}
