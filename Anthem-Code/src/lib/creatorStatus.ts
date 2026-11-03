/** Availability shown on creator cards and profiles, from the profile's opportunity_status. */
export const CREATOR_STATUS: Record<string, { label: string; dot: string }> = {
  open_to_opportunities: { label: "Available for Work", dot: "bg-emerald-500" },
  soft_open: { label: "Open to collaboration", dot: "bg-amber-500" },
  not_available: { label: "Not Available", dot: "bg-muted-foreground/60" },
};

export function creatorStatus(status: string | null | undefined) {
  return status ? CREATOR_STATUS[status] : undefined;
}
