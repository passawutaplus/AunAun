/** Server-side early-access gate (mirrors client VITE_EARLY_ACCESS). */
export function isEarlyAccessModeServer(): boolean {
  return process.env.VITE_EARLY_ACCESS === "true" || process.env.EARLY_ACCESS === "true";
}
