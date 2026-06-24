/**
 * Test account fixtures — reads credentials from environment.
 * See docs/test-accounts.md for the role matrix.
 *
 * NEVER hardcode credentials. Owner sets these in .env.local or CI secrets.
 */
export type Role = "user" | "userB" | "admin" | "unverified";

type Account = { email: string; password: string };

function envOrSkip(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(`[e2e] Missing env ${key} — set it in .env.local (see docs/test-accounts.md)`);
  }
  return v;
}

export function getAccount(role: Role): Account {
  switch (role) {
    case "user":
      return { email: envOrSkip("E2E_USER_EMAIL"), password: envOrSkip("E2E_USER_PASSWORD") };
    case "userB":
      return { email: envOrSkip("E2E_USERB_EMAIL"), password: envOrSkip("E2E_USERB_PASSWORD") };
    case "admin":
      return { email: envOrSkip("E2E_ADMIN_EMAIL"), password: envOrSkip("E2E_ADMIN_PASSWORD") };
    case "unverified":
      return {
        email: envOrSkip("E2E_UNVERIFIED_EMAIL"),
        password: envOrSkip("E2E_UNVERIFIED_PASSWORD"),
      };
  }
}
