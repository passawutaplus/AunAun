import { test, expect } from "@playwright/test";
import { signIn, signOut } from "./helpers/auth";

test("user can sign in and reach dashboard", async ({ page }) => {
  await signIn(page, "user");
  expect(page.url()).toMatch(/\/(dashboard|apply)/);
});

test("user can sign out", async ({ page }) => {
  await signIn(page, "user");
  await signOut(page);
  expect(page.url()).toContain("/auth");
});
