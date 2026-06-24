import { test, expect } from "@playwright/test";
import { signIn } from "../helpers/auth";

test("admin can reach admin panel", async ({ page }) => {
  await signIn(page, "admin");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
});

test("non-admin cannot reach admin panel", async ({ page }) => {
  await signIn(page, "user");
  await page.goto("/admin");
  // RequireAuth bounces non-admin to /dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
});
