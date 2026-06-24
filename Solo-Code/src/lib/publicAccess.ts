/** When false (default), dashboard is open to all registered users. */
export function isEarlyAccessMode(): boolean {
  return import.meta.env.VITE_EARLY_ACCESS === "true";
}
