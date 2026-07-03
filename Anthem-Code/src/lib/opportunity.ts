/** Opportunity availability + type labels for Aplus1 product loop. */

export const OPPORTUNITY_AVAILABILITY = {
  open_to_opportunities: {
    title: "เปิดรับโอกาสใหม่",
    description: "พร้อมให้คนทักเรื่องงาน โปรเจกต์ หรือโอกาสที่น่าสนใจ",
    chipLabel: "เปิดรับโอกาสใหม่",
    recommended: true,
  },
  soft_open: {
    title: "ยังไม่รับงานจ้าง แต่คุยโอกาสได้",
    description: "ยังไม่พร้อมรับงานจริงจัง แต่เปิดรับไอเดีย ความร่วมมือ หรือ connection ดี ๆ",
    chipLabel: "คุยโอกาสได้",
    recommended: false,
  },
  not_available: {
    title: "พักการติดต่อชั่วคราว",
    description: "ซ่อนปุ่มติดต่อจากโปรไฟล์ชั่วคราว",
    chipLabel: "พักการติดต่อ",
    recommended: false,
  },
} as const;

export type OpportunityStatusKey = keyof typeof OPPORTUNITY_AVAILABILITY;

export const OPPORTUNITY_STATUS_KEYS = Object.keys(
  OPPORTUNITY_AVAILABILITY,
) as OpportunityStatusKey[];

/** @deprecated Use OPPORTUNITY_AVAILABILITY[key].chipLabel */
export const OPPORTUNITY_STATUS = Object.fromEntries(
  OPPORTUNITY_STATUS_KEYS.map((k) => [k, OPPORTUNITY_AVAILABILITY[k].chipLabel]),
) as Record<OpportunityStatusKey, string>;

export const OPPORTUNITY_TYPES = {
  paid_work: "รับงานจ้าง",
  collaboration: "ร่วมโปรเจกต์",
  internship: "ฝึกงาน / Internship",
  join_team: "เข้าทีม / Full-time",
  feedback_mentor: "Feedback / Mentor",
  network_collab: "Collaboration",
  brand_exposure: "Brand / Exposure",
  connection: "Connection",
} as const;

export type OpportunityTypeKey = keyof typeof OPPORTUNITY_TYPES;

export const OPPORTUNITY_TYPE_KEYS = Object.keys(OPPORTUNITY_TYPES) as OpportunityTypeKey[];

const LEGACY_TYPE_ALIASES: Record<string, OpportunityTypeKey | null> = {
  soft_open: null,
};

export function normalizeOpportunityProfile(
  status: string | null | undefined,
  types: string[] | null | undefined,
): { status: OpportunityStatusKey; types: OpportunityTypeKey[] } {
  let normalizedStatus = (status ?? "open_to_opportunities") as OpportunityStatusKey;
  const rawTypes = [...(types ?? [])];

  if (rawTypes.includes("soft_open") && normalizedStatus === "open_to_opportunities") {
    normalizedStatus = "soft_open";
  }

  const normalizedTypes = rawTypes
    .map((t) => LEGACY_TYPE_ALIASES[t] ?? t)
    .filter((t): t is OpportunityTypeKey => !!t && t in OPPORTUNITY_TYPES);

  if (!OPPORTUNITY_STATUS_KEYS.includes(normalizedStatus)) {
    normalizedStatus = "open_to_opportunities";
  }

  return { status: normalizedStatus, types: normalizedTypes };
}

export function labelOpportunityStatus(status: string | null | undefined): string {
  const { status: s } = normalizeOpportunityProfile(status, []);
  return OPPORTUNITY_AVAILABILITY[s].chipLabel;
}

export function labelOpportunityType(type: string): string {
  return OPPORTUNITY_TYPES[type as OpportunityTypeKey] ?? type;
}

/** True when primary contact CTA should show on project/profile. */
export function isHireCtaAvailable(status: string | null | undefined): boolean {
  const { status: s } = normalizeOpportunityProfile(status, []);
  return s !== "not_available";
}

export function needsOpportunityTypeHint(
  status: OpportunityStatusKey,
  types: OpportunityTypeKey[],
): boolean {
  return status === "open_to_opportunities" && types.length === 0;
}

export function countProjectContextFields(input: {
  brief?: string | null;
  creator_role?: string | null;
  process_note?: string | null;
  deliverables?: string | null;
  duration_label?: string | null;
  outcome_note?: string | null;
}): number {
  return [
    input.brief,
    input.creator_role,
    input.process_note,
    input.deliverables,
    input.duration_label,
    input.outcome_note,
  ].filter((v) => !!v?.trim()).length;
}

export function hasProjectContextContent(
  input: Parameters<typeof countProjectContextFields>[0],
): boolean {
  return countProjectContextFields(input) > 0;
}
