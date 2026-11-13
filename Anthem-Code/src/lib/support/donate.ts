import { DONATE_MAX_THB, DONATE_MIN_THB } from "@/lib/support/flags";

/** The amount to give, or null when "other" holds nothing usable (empty, below the minimum, above the cap). */
export function resolveDonation(choice: number | "other", custom: string): { amount: number | null } {
  const value = choice === "other" ? Number(custom) : choice;
  const ok = Number.isInteger(value) && value >= DONATE_MIN_THB && value <= DONATE_MAX_THB;
  return { amount: ok ? value : null };
}
