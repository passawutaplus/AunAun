/**
 * Test account credentials.
 * Source these from env vars so we never commit real passwords.
 * See docs/test-accounts.md for the matrix of who can do what.
 */
export const accounts = {
  user: {
    email: process.env.E2E_USER_EMAIL ?? "qa-user-a@example.com",
    password: process.env.E2E_USER_PASSWORD ?? "change-me",
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? "qa-admin@example.com",
    password: process.env.E2E_ADMIN_PASSWORD ?? "change-me",
  },
} as const;
