/** UX research / preview demo — show banner and use sandbox-friendly defaults. */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === "true";
}
