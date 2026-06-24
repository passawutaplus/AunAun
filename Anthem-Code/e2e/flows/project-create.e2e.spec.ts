import { test, expect } from "@playwright/test";
import { signIn } from "../helpers/auth";

test.describe("project create @e2e", () => {
  test("verified user reaches the project editor", async ({ page }) => {
    await signIn(page, "user");
    await page.goto("/portfolio/new");
    // The editor should mount — look for title input or save button.
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 10_000 });
  });
});
