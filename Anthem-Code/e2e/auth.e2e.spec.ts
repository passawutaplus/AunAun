import { test, expect } from "@playwright/test";
import { signIn } from "../helpers/auth";

test.describe("auth flow @e2e", () => {
  test("user can sign in and reach /portfolio/manage", async ({ page }) => {
    await signIn(page, "user");
    await page.goto("/portfolio/manage");
    await expect(page).toHaveURL(/portfolio\/manage/);
  });

  test("user signing out lands back on home as guest", async ({ page, context }) => {
    await signIn(page, "user");
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto("/chat");
    await expect(page).toHaveURL(/\/auth/);
  });
});
