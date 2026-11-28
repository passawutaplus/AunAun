/**
 * New Samecor design (samecor-handoff). Off in production until the cutover;
 * on for `redesign-2026` previews and locally with VITE_REDESIGN=true in `.env.local`.
 */
export function isRedesignEnabled(): boolean {
  return import.meta.env.VITE_REDESIGN === "true";
}
