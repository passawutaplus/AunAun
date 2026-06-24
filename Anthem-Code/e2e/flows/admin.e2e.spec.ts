import { test, expect } from "@playwright/test";
import { signIn } from "../helpers/auth";

test.describe("admin access @e2e", () => {
  test("admin can view overview", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/);
    // Some admin nav item should render
    await expect(page.locator("nav, [role=navigation]").first()).toBeVisible();
  });

  test("regular user hitting /admin is bounced home", async ({ page }) => {
    await signIn(page, "user");
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
  });
});
